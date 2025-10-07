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

    const [apiKeyResult, modeResult] = await Promise.all([
      supabase.from("settings").select("value").eq("key", "gologin_api_key").single(),
      supabase.from("settings").select("value").eq("key", "gologin_mode").single(),
    ])

    if (apiKeyResult.error || !apiKeyResult.data?.value) {
      return NextResponse.json(
        { error: "GoLogin API key not found. Please save it in Settings first." },
        { status: 400 },
      )
    }

    const gologin_api_key = apiKeyResult.data.value
    const gologin_mode = (modeResult.data?.value as "cloud" | "local") || "cloud"

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

    const executor = new TaskExecutor(gologin_api_key, gologin_mode, behaviorPattern.config)
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

    const profileUpdates: any = {
      status: "idle",
      last_run: new Date().toISOString(),
    }

    console.log("[v0] Task type:", task.task_type)
    console.log("[v0] Task result:", JSON.stringify(result, null, 2))

    if (task.task_type === "check_gmail_status" && result.result) {
      console.log("[v0] ✓ Gmail status check detected")
      console.log("[v0] Result data:", JSON.stringify(result.result, null, 2))

      profileUpdates.gmail_status = result.result.status
      profileUpdates.gmail_status_checked_at = new Date().toISOString()
      profileUpdates.gmail_status_message = result.result.message

      console.log("[v0] Profile updates to apply:", JSON.stringify(profileUpdates, null, 2))
    } else {
      console.log("[v0] Gmail status check NOT detected")
      console.log("[v0] Condition check - task_type match:", task.task_type === "check_gmail_status")
      console.log("[v0] Condition check - result.result exists:", !!result.result)
    }

    console.log("[v0] Updating profile with:", JSON.stringify(profileUpdates, null, 2))
    const updateResult = await supabase.from("gologin_profiles").update(profileUpdates).eq("id", profile.id)
    console.log("[v0] Profile update result:", JSON.stringify(updateResult, null, 2))

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
