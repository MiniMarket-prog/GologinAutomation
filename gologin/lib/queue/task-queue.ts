import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { TaskExecutor } from "@/lib/automation/task-executor"
import type { AutomationTask, BehaviorPattern } from "@/lib/types"
import { getEnvironmentMode } from "@/lib/utils/environment"

export class TaskQueue {
  private isProcessing = false
  private gologinApiKey: string

  constructor(gologinApiKey: string) {
    this.gologinApiKey = gologinApiKey
  }

  async processPendingTasks() {
    if (this.isProcessing) {
      console.log("[v0] Queue already processing, skipping")
      return
    }

    this.isProcessing = true
    console.log("[v0] ========================================")
    console.log("[v0] Starting task queue processing")
    console.log("[v0] ========================================")

    try {
      const adminClient = getSupabaseAdminClient()
      const supabase = await getSupabaseServerClient()

      // Get pending tasks ordered by priority and scheduled time
      console.log("[v0] Fetching pending tasks...")
      console.log("[v0] [DEBUG] Current time:", new Date().toISOString())

      // First, let's see ALL pending tasks without filters
      const { data: allPendingTasks, error: allTasksError } = await (adminClient.from("automation_tasks") as any)
        .select("id, task_type, status, scheduled_at, profile_id")
        .eq("status", "pending")

      console.log("[v0] [DEBUG] All pending tasks in database:", allPendingTasks?.length || 0)
      if (allPendingTasks && allPendingTasks.length > 0) {
        allPendingTasks.forEach((t: any) => {
          console.log(`[v0] [DEBUG]   - Task ${t.id}: ${t.task_type}, scheduled_at: ${t.scheduled_at || "NULL"}`)
        })
      }

      // Now fetch tasks that should be processed (scheduled_at is NULL or <= now)
      const { data: tasks, error: tasksError } = await (adminClient.from("automation_tasks") as any)
        .select("*")
        .eq("status", "pending")
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
        .order("priority", { ascending: false })
        .order("scheduled_at", { ascending: true, nullsFirst: true })
        .limit(10)

      if (tasksError) {
        console.error("[v0] ❌ Error fetching tasks:", tasksError)
        throw tasksError
      }

      console.log("[v0] [DEBUG] Tasks ready to process:", tasks?.length || 0)

      if (!tasks || tasks.length === 0) {
        console.log("[v0] No pending tasks to process")
        return
      }

      console.log(`[v0] ✓ Found ${tasks.length} pending tasks`)
      tasks.forEach((task: any, index: number) => {
        console.log(`[v0]   ${index + 1}. ${task.task_type} (ID: ${task.id})`)
      })

      // Get default behavior pattern
      console.log("[v0] Fetching behavior pattern...")
      const { data: behaviorPattern, error: behaviorError } = await supabase
        .from("behavior_patterns")
        .select("*")
        .eq("is_default", true)
        .single()

      if (behaviorError) {
        console.error("[v0] ❌ Error fetching behavior pattern:", behaviorError)
        throw behaviorError
      }
      console.log("[v0] ✓ Behavior pattern loaded")

      console.log("[v0] Fetching GoLogin mode setting...")
      const { data: modeSetting } = await supabase.from("settings").select("value").eq("key", "gologin_mode").single()

      const userMode = (modeSetting?.value || "cloud") as "cloud" | "local"
      const mode = getEnvironmentMode(userMode)
      console.log(`[v0] ✓ GoLogin mode: ${mode}`)

      // Process each task
      for (const task of tasks) {
        await this.processTask(task, behaviorPattern, mode)
      }

      console.log("[v0] ========================================")
      console.log("[v0] ✓ Task queue processing completed")
      console.log("[v0] ========================================")
    } catch (error: any) {
      console.error("[v0] ========================================")
      console.error("[v0] ❌ Error processing task queue")
      console.error("[v0] Error:", error.message)
      console.error("[v0] ========================================")
    } finally {
      this.isProcessing = false
    }
  }

  private async processTask(task: AutomationTask, behaviorPattern: BehaviorPattern, mode: "cloud" | "local") {
    console.log(`[v0] ========================================`)
    console.log(`[v0] Processing task ${task.id}`)
    console.log(`[v0] Task type: ${task.task_type}`)
    console.log(`[v0] ========================================`)

    try {
      const supabase = await getSupabaseServerClient()

      // Get profile
      console.log(`[v0] Fetching profile ${task.profile_id}...`)
      const { data: profile, error: profileError } = await supabase
        .from("gologin_profiles")
        .select("*")
        .eq("id", task.profile_id)
        .single()

      if (profileError) {
        console.error("[v0] ❌ Error fetching profile:", profileError)
        throw profileError
      }
      console.log(`[v0] ✓ Profile loaded: ${profile.profile_name}`)

      // Check if profile is already running
      if (profile.status === "running") {
        console.log(`[v0] ⚠️ Profile ${profile.profile_name} is already running, skipping task`)
        return
      }

      // Update task status to running
      console.log("[v0] Updating task status to 'running'...")
      await supabase
        .from("automation_tasks")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .eq("id", task.id)
      console.log("[v0] ✓ Task status updated")

      // Update profile status
      console.log("[v0] Updating profile status to 'running'...")
      await supabase.from("gologin_profiles").update({ status: "running" }).eq("id", profile.id)
      console.log("[v0] ✓ Profile status updated")

      console.log("[v0] [DEBUG] Task type:", task.task_type)
      console.log("[v0] [DEBUG] Profile gmail_email:", profile.gmail_email)
      console.log("[v0] [DEBUG] Profile gmail_password:", profile.gmail_password ? "***SET***" : "NOT SET")
      console.log("[v0] [DEBUG] Original task config:", JSON.stringify(task.config))

      const taskWithCredentials = { ...task }
      if (task.task_type === "check_gmail_status" && profile.gmail_email && profile.gmail_password) {
        console.log("[v0] ✓ Adding Gmail credentials to task config for auto-login...")
        taskWithCredentials.config = {
          ...task.config,
          email: profile.gmail_email,
          password: profile.gmail_password,
        }
        console.log(
          "[v0] [DEBUG] Updated task config:",
          JSON.stringify({ ...taskWithCredentials.config, password: "***HIDDEN***" }),
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

      console.log("[v0] [DEBUG] Checking if task is check_gmail_status...")
      console.log("[v0] [DEBUG] Task type:", task.task_type)
      console.log("[v0] [DEBUG] Result object:", JSON.stringify(result, null, 2))

      if (task.task_type === "check_gmail_status" && result.result) {
        console.log("[v0] [DEBUG] Gmail status check detected, preparing profile update...")
        console.log("[v0] [DEBUG] Result.result:", JSON.stringify(result.result, null, 2))

        const gmailStatus = result.result.status
        const gmailMessage = result.result.message

        console.log("[v0] [DEBUG] Updating profile with Gmail status:", {
          gmail_status: gmailStatus,
          gmail_status_checked_at: new Date().toISOString(),
          gmail_status_message: gmailMessage,
        })

        const adminClient = getSupabaseAdminClient()
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
        console.log("[v0] [DEBUG] Not a Gmail status check task or no result data")
      }

      // Update task status
      console.log("[v0] Updating task final status...")
      await supabase
        .from("automation_tasks")
        .update({
          status: result.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        })
        .eq("id", task.id)
      console.log(`[v0] ✓ Task marked as ${result.success ? "completed" : "failed"}`)

      // Update profile status and last run
      console.log("[v0] Updating profile final status...")
      await supabase
        .from("gologin_profiles")
        .update({
          status: result.success ? "idle" : "error",
          last_run: new Date().toISOString(),
        })
        .eq("id", profile.id)
      console.log(`[v0] ✓ Profile status updated to ${result.success ? "idle" : "error"}`)

      // Log activity
      console.log("[v0] Creating activity log...")
      await supabase.from("activity_logs").insert({
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

      // Update task as failed
      const supabase = await getSupabaseServerClient()
      await supabase
        .from("automation_tasks")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: error.message,
        })
        .eq("id", task.id)

      // Update profile status
      await supabase.from("gologin_profiles").update({ status: "error" }).eq("id", task.profile_id)
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
