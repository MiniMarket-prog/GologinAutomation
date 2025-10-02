import { getSupabaseServerClient } from "@/lib/server"
import { TaskExecutor } from "@/lib/task-executor"
import type { AutomationTask, BehaviorPattern } from "@/lib/types"

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
    console.log("[v0] Starting task queue processing")

    try {
      const supabase = await getSupabaseServerClient()

      // Get pending tasks ordered by priority and scheduled time
      const { data: tasks, error: tasksError } = await supabase
        .from("automation_tasks")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("priority", { ascending: false })
        .order("scheduled_at", { ascending: true })
        .limit(10)

      if (tasksError) throw tasksError

      if (!tasks || tasks.length === 0) {
        console.log("[v0] No pending tasks to process")
        return
      }

      console.log(`[v0] Found ${tasks.length} pending tasks`)

      // Get default behavior pattern
      const { data: behaviorPattern, error: behaviorError } = await supabase
        .from("behavior_patterns")
        .select("*")
        .eq("is_default", true)
        .single()

      if (behaviorError) throw behaviorError

      // Process each task
      for (const task of tasks) {
        await this.processTask(task, behaviorPattern)
      }
    } catch (error) {
      console.error("[v0] Error processing task queue:", error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processTask(task: AutomationTask, behaviorPattern: BehaviorPattern) {
    console.log(`[v0] Processing task ${task.id}`)

    try {
      const supabase = await getSupabaseServerClient()

      // Get profile
      const { data: profile, error: profileError } = await supabase
        .from("gologin_profiles")
        .select("*")
        .eq("id", task.profile_id)
        .single()

      if (profileError) throw profileError

      // Check if profile is already running
      if (profile.status === "running") {
        console.log(`[v0] Profile ${profile.profile_name} is already running, skipping task`)
        return
      }

      // Update task status to running
      await supabase
        .from("automation_tasks")
        .update({
          status: "running",
          started_at: new Date().toISOString(),
        })
        .eq("id", task.id)

      // Update profile status
      await supabase.from("gologin_profiles").update({ status: "running" }).eq("id", profile.id)

      // Execute task
      const executor = new TaskExecutor(this.gologinApiKey, behaviorPattern.config)
      const result = await executor.executeTask(task, profile)

      // Update task status
      await supabase
        .from("automation_tasks")
        .update({
          status: result.success ? "completed" : "failed",
          completed_at: new Date().toISOString(),
          error_message: result.error || null,
        })
        .eq("id", task.id)

      // Update profile status and last run
      await supabase
        .from("gologin_profiles")
        .update({
          status: result.success ? "idle" : "error",
          last_run: new Date().toISOString(),
        })
        .eq("id", profile.id)

      // Log activity
      await supabase.from("activity_logs").insert({
        profile_id: profile.id,
        task_id: task.id,
        action: task.task_type,
        details: result.result || {},
        duration_ms: result.duration,
        success: result.success,
      })

      console.log(`[v0] Task ${task.id} completed: ${result.success ? "success" : "failed"}`)
    } catch (error: any) {
      console.error(`[v0] Error processing task ${task.id}:`, error)

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
