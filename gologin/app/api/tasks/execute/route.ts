import { getSupabaseServerClient } from "@/lib/supabase/server"
import { TaskExecutor } from "@/lib/automation/task-executor"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { task_id } = body

    if (!task_id) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 })
    }

    const { data: apiKeySetting, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "gologin_api_key")
      .single()

    if (settingsError || !apiKeySetting?.value) {
      return NextResponse.json(
        { error: "GoLogin API key not found. Please save it in Settings first." },
        { status: 400 },
      )
    }

    const gologin_api_key = apiKeySetting.value

    // Get task
    const { data: task, error: taskError } = await supabase
      .from("automation_tasks")
      .select("*")
      .eq("id", task_id)
      .single()

    if (taskError) throw taskError

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from("gologin_profiles")
      .select("*")
      .eq("id", task.profile_id)
      .single()

    if (profileError) throw profileError

    // Get default behavior pattern
    const { data: behaviorPattern, error: behaviorError } = await supabase
      .from("behavior_patterns")
      .select("*")
      .eq("is_default", true)
      .single()

    if (behaviorError) throw behaviorError

    // Update task status to running
    await supabase
      .from("automation_tasks")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", task_id)

    // Update profile status
    await supabase.from("gologin_profiles").update({ status: "running" }).eq("id", profile.id)

    // Execute task
    const executor = new TaskExecutor(gologin_api_key, behaviorPattern.config)
    const result = await executor.executeTask(task, profile)

    // Update task status
    await supabase
      .from("automation_tasks")
      .update({
        status: result.success ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        error_message: result.error || null,
      })
      .eq("id", task_id)

    // Update profile status and last run
    await supabase
      .from("gologin_profiles")
      .update({
        status: "idle",
        last_run: new Date().toISOString(),
      })
      .eq("id", profile.id)

    // Log activity
    await supabase.from("activity_logs").insert({
      profile_id: profile.id,
      task_id: task_id,
      action: task.task_type,
      details: result.result || {},
      duration_ms: result.duration,
      success: result.success,
    })

    return NextResponse.json({
      success: result.success,
      result: result,
    })
  } catch (error: any) {
    console.error("[v0] Error executing task:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
