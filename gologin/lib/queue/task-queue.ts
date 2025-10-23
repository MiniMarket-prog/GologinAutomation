import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { TaskExecutor } from "@/lib/automation/task-executor"
import type { AutomationTask, BehaviorPattern } from "@/lib/types"
import { getEnvironmentMode } from "@/lib/utils/environment"

export interface BatchProcessResult {
  processedCount: number
  remainingCount: number
  hasMore: boolean
  totalProcessed: number
}

export class TaskQueue {
  private isProcessing = false
  private gologinApiKey: string
  private maxConcurrentTasks: number

  constructor(gologinApiKey: string, maxConcurrentTasks = 1) {
    this.gologinApiKey = gologinApiKey
    this.maxConcurrentTasks = maxConcurrentTasks
  }

  async processPendingTasks(maxTasksPerBatch = 10): Promise<BatchProcessResult> {
    if (this.isProcessing) {
      console.log("[v0] Queue already processing, skipping")
      return { processedCount: 0, remainingCount: 0, hasMore: false, totalProcessed: 0 }
    }

    this.isProcessing = true
    console.log("[v0] ========================================")
    console.log("[v0] Starting batch processing")
    console.log(`[v0] Max tasks per batch: ${maxTasksPerBatch}`)
    console.log(`[v0] Max concurrent tasks: ${this.maxConcurrentTasks}`)
    console.log("[v0] ========================================")

    try {
      const adminClient = getSupabaseAdminClient()

      console.log(`[v0] Fetching up to ${maxTasksPerBatch} pending tasks...`)

      const { data: tasks, error: tasksError } = await (adminClient.from("automation_tasks") as any)
        .select("*")
        .eq("status", "pending")
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("scheduled_at", { ascending: true, nullsFirst: true })
        .limit(maxTasksPerBatch)

      if (tasksError) {
        console.error("[v0] ❌ Error fetching tasks:", tasksError)
        throw tasksError
      }

      if (!tasks || tasks.length === 0) {
        console.log(`[v0] ✓ No pending tasks found`)
        console.log("[v0] ========================================")
        return { processedCount: 0, remainingCount: 0, hasMore: false, totalProcessed: 0 }
      }

      console.log(`[v0] ✓ Found ${tasks.length} pending tasks`)

      // Claim tasks
      const taskIds = tasks.map((t: any) => t.id)
      const { data: claimedTasks, error: claimError } = await (adminClient.from("automation_tasks") as any)
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .in("id", taskIds)
        .eq("status", "pending")
        .select()

      if (claimError) {
        console.error("[v0] ❌ Error claiming tasks:", claimError)
        throw claimError
      }

      if (!claimedTasks || claimedTasks.length === 0) {
        console.log("[v0] No tasks claimed (already being processed)")
        const { count } = await (adminClient.from("automation_tasks") as any)
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")

        return { processedCount: 0, remainingCount: count || 0, hasMore: (count || 0) > 0, totalProcessed: 0 }
      }

      console.log(`[v0] ✓ Successfully claimed ${claimedTasks.length} tasks`)

      // Get behavior pattern
      const { data: behaviorPattern, error: behaviorError } = await (adminClient.from("behavior_patterns") as any)
        .select("*")
        .eq("is_default", true)
        .single()

      if (behaviorError) {
        console.error("[v0] ❌ Error fetching behavior pattern:", behaviorError)
        throw behaviorError
      }

      // Get GoLogin mode
      const { data: modeSetting } = await (adminClient.from("settings") as any)
        .select("value")
        .eq("key", "gologin_mode")
        .single()

      const userMode = (modeSetting?.value || "cloud") as "cloud" | "local"
      const mode = getEnvironmentMode(userMode)

      // Process tasks
      if (this.maxConcurrentTasks === 1) {
        console.log(`[v0] Processing ${claimedTasks.length} tasks sequentially...`)
        for (const task of claimedTasks) {
          await this.processTask(task, behaviorPattern, mode, true)
        }
      } else {
        console.log(`[v0] Processing ${claimedTasks.length} tasks with concurrency ${this.maxConcurrentTasks}...`)
        await this.processConcurrent(claimedTasks, behaviorPattern, mode)
      }

      const { count: remainingCount } = await (adminClient.from("automation_tasks") as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")

      const hasMore = (remainingCount || 0) > 0

      console.log("[v0] ========================================")
      console.log(`[v0] ✓ Batch completed - ${claimedTasks.length} tasks processed`)
      console.log(`[v0] Remaining pending tasks: ${remainingCount || 0}`)
      console.log("[v0] ========================================")

      return {
        processedCount: claimedTasks.length,
        remainingCount: remainingCount || 0,
        hasMore,
        totalProcessed: claimedTasks.length,
      }
    } catch (error: any) {
      console.error("[v0] ========================================")
      console.error("[v0] ❌ Error processing batch")
      console.error("[v0] Error:", error.message)
      console.error("[v0] ========================================")
      throw error
    } finally {
      this.isProcessing = false
    }
  }

  private async processConcurrent(tasks: AutomationTask[], behaviorPattern: BehaviorPattern, mode: "cloud" | "local") {
    const activePromises = new Set<Promise<void>>()
    let taskIndex = 0

    while (taskIndex < tasks.length || activePromises.size > 0) {
      // Start new tasks up to the concurrency limit
      while (taskIndex < tasks.length && activePromises.size < this.maxConcurrentTasks) {
        const task = tasks[taskIndex]
        taskIndex++

        const promise = this.processTask(task, behaviorPattern, mode, true) // Pass skipStatusUpdate=true
          .catch((error) => {
            console.error(`[v0] Error processing task ${task.id}:`, error)
          })
          .finally(() => {
            activePromises.delete(promise)
          })

        activePromises.add(promise)
      }

      // Wait for at least one task to complete before continuing
      if (activePromises.size > 0) {
        await Promise.race(activePromises)
      }
    }
  }

  private async processTask(
    task: AutomationTask,
    behaviorPattern: BehaviorPattern,
    mode: "cloud" | "local",
    skipStatusUpdate = false,
  ) {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Processing task ${task.id}`)
    console.log(`[v0] Task type: ${task.task_type}`)
    console.log(`[v0] ========================================`)

    try {
      const adminClient = getSupabaseAdminClient()

      if (!task.profile_id) {
        console.log(`[v0] ⚠️ Task ${task.id} has no profile_id, marking as failed`)
        await (adminClient.from("automation_tasks") as any)
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Task cannot be processed without a profile",
          })
          .eq("id", task.id)
        console.log(`[v0] ✓ Task marked as failed`)
        return
      }

      // Try to find profile by database ID first (for local profiles and direct references)
      console.log(`[v0] Fetching profile ${task.profile_id}...`)
      let { data: profile, error: profileError } = await (adminClient.from("gologin_profiles") as any)
        .select("*")
        .eq("id", task.profile_id)
        .maybeSingle()

      // If not found by database ID, try by profile_id field (for GoLogin profiles)
      if (!profile && !profileError) {
        console.log(`[v0] Profile not found by database ID, trying profile_id field...`)
        const result = await (adminClient.from("gologin_profiles") as any)
          .select("*")
          .eq("profile_id", task.profile_id)
          .maybeSingle()

        profile = result.data
        profileError = result.error
      }

      if (profileError) {
        console.error("[v0] ❌ Error fetching profile:", profileError)
        throw profileError
      }

      if (!profile) {
        const errorMsg = `Profile ${task.profile_id} not found in database. It may have been deleted or not synced yet.`
        console.log(`[v0] ⚠️ ${errorMsg}`)
        console.log(`[v0] Marking task as failed and continuing...`)

        await (adminClient.from("automation_tasks") as any)
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: errorMsg,
          })
          .eq("id", task.id)

        console.log(`[v0] ✓ Task marked as failed, continuing to next task`)
        console.log(`[v0] ========================================`)
        return // Continue to next task instead of throwing
      }

      console.log(`[v0] ✓ Profile loaded: ${profile.profile_name} (type: ${profile.profile_type || "gologin"})`)

      if (!skipStatusUpdate) {
        // Update task status to running
        console.log("[v0] Updating task status to 'running'...")
        await (adminClient.from("automation_tasks") as any)
          .update({
            status: "running",
            started_at: new Date().toISOString(),
          })
          .eq("id", task.id)
        console.log("[v0] ✓ Task status updated")
      }

      // Update profile status
      console.log("[v0] Updating profile status to 'running'...")
      await (adminClient.from("gologin_profiles") as any).update({ status: "running" }).eq("id", profile.id)
      console.log("[v0] ✓ Profile status updated")

      console.log("[v0] [DEBUG] Task type:", task.task_type)
      console.log("[v0] [DEBUG] Profile gmail_email:", profile.gmail_email)
      console.log("[v0] [DEBUG] Profile gmail_password:", profile.gmail_password ? "***SET***" : "NOT SET")
      console.log("[v0] [DEBUG] Profile recovery_email:", profile.recovery_email ? "***SET***" : "NOT SET")
      console.log("[v0] [DEBUG] Original task config:", JSON.stringify(task.config))

      const taskWithCredentials = { ...task }
      if (task.task_type === "check_gmail_status" && profile.gmail_email && profile.gmail_password) {
        console.log("[v0] ✓ Adding Gmail credentials to task config for auto-login...")
        taskWithCredentials.config = {
          ...task.config,
          email: profile.gmail_email,
          password: profile.gmail_password,
          ...(profile.recovery_email && { recovery_email: profile.recovery_email }),
        }
        console.log(
          "[v0] [DEBUG] Updated task config:",
          JSON.stringify({
            ...taskWithCredentials.config,
            password: "***HIDDEN***",
            ...(taskWithCredentials.config.recovery_email && { recovery_email: "***HIDDEN***" }),
          }),
        )
      } else {
        console.log("[v0] ⚠️ NOT adding credentials - conditions not met")
        console.log("[v0] [DEBUG] Condition check:", {
          isCheckGmailStatus: task.task_type === "check_gmail_status",
          hasEmail: !!profile.gmail_email,
          hasPassword: !!profile.gmail_password,
        })
      }

      // Execute task
      console.log("[v0] Executing task...")
      const executor = new TaskExecutor(this.gologinApiKey, mode, behaviorPattern.config)
      const result = await executor.executeTask(taskWithCredentials, profile)

      console.log(`[v0] Task execution result:`, {
        success: result.success,
        duration: result.duration,
        error: result.error || "none",
      })

      console.log("[v0] [DEBUG] Checking if task is check_gmail_status or setup_gmail...")
      console.log("[v0] [DEBUG] Task type:", task.task_type)
      console.log("[v0] [DEBUG] Result object:", JSON.stringify(result, null, 2))

      if ((task.task_type === "check_gmail_status" || task.task_type === "setup_gmail") && result.result) {
        console.log("[v0] [DEBUG] Gmail status check detected, preparing profile update...")
        console.log("[v0] [DEBUG] Result.result:", JSON.stringify(result.result, null, 2))

        const gmailStatus = result.result.status
        const gmailMessage = result.result.message

        console.log("[v0] [DEBUG] Updating profile with Gmail status:", {
          gmail_status: gmailStatus,
          gmail_status_checked_at: new Date().toISOString(),
          gmail_status_message: gmailMessage,
        })

        const { data: updateData, error: updateError } = await (adminClient.from("gologin_profiles") as any)
          .update({
            gmail_status: gmailStatus,
            gmail_status_checked_at: new Date().toISOString(),
            gmail_status_message: gmailMessage,
          })
          .eq("id", profile.id)
          .select()

        if (updateError) {
          console.error("[v0] [DEBUG] ❌ Error updating Gmail status:", updateError)
        } else {
          console.log("[v0] [DEBUG] ✓ Gmail status updated successfully:", updateData)
        }
      } else {
        console.log("[v0] [DEBUG] Not a Gmail status check or setup task or no result data")
      }

      // Update task status
      console.log("[v0] Updating task final status...")
      await (adminClient.from("automation_tasks") as any)
        .update({
          status: result.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        })
        .eq("id", task.id)
      console.log(`[v0] ✓ Task marked as ${result.success ? "completed" : "failed"}`)

      // Update profile status and last run
      console.log("[v0] Updating profile final status...")
      await (adminClient.from("gologin_profiles") as any)
        .update({
          status: result.success ? "idle" : "error",
          last_run: new Date().toISOString(),
        })
        .eq("id", task.profile_id)
      console.log(`[v0] ✓ Profile status updated to ${result.success ? "idle" : "error"}`)

      // Log activity
      console.log("[v0] Creating activity log...")
      await (adminClient.from("activity_logs") as any).insert({
        profile_id: profile.id,
        task_id: task.id,
        action: task.task_type,
        details: result.result || {},
        duration_ms: result.duration,
        success: result.success,
      })
      console.log("[v0] ✓ Activity logged")

      console.log(`[v0] ========================================`)
      console.log(
        `[v0] ${result.success ? "✓✓✓" : "❌"} Task ${task.id} ${result.success ? "completed successfully" : "failed"}`,
      )
      if (!result.success && result.error) {
        console.log(`[v0] Error: ${result.error}`)
      }
      console.log(`[v0] ========================================`)
    } catch (error: any) {
      console.error(`[v0] ========================================`)
      console.error(`[v0] ❌ Error processing task ${task.id}`)
      console.error(`[v0] Error type: ${error.name}`)
      console.error(`[v0] Error message: ${error.message}`)
      console.error(`[v0] Error stack:`, error.stack)
      console.error(`[v0] ========================================`)

      const adminClient = getSupabaseAdminClient()
      await (adminClient.from("automation_tasks") as any)
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq("id", task.id)

      // Update profile status
      await (adminClient.from("gologin_profiles") as any).update({ status: "error" }).eq("id", task.profile_id)
    }
  }

  async scheduleRecurringTask(profileId: string, taskType: string, intervalMinutes: number, config?: any) {
    const supabase = await getSupabaseServerClient()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error("Unauthorized")
    }

    // Create initial task
    const { data, error } = await supabase
      .from("automation_tasks")
      .insert({
        profile_id: profileId,
        task_type: taskType,
        config: config || {},
        scheduled_at: new Date().toISOString(),
        created_by: user.user.id,
      })
      .select()
      .single()

    if (error) throw error

    return data
  }
}
