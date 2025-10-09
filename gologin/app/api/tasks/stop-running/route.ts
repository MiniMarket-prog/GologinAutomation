import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    // Get all running tasks
    const { data: runningTasks, error: fetchError } = await supabase
      .from("automation_tasks")
      .select("id, profile_id")
      .eq("status", "running")

    if (fetchError) throw fetchError

    if (!runningTasks || runningTasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No running tasks to stop",
      })
    }

    // Update tasks to failed status with cancellation message
    const { error: updateTasksError } = await supabase
      .from("automation_tasks")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "Task stopped by user",
      })
      .eq("status", "running")

    if (updateTasksError) throw updateTasksError

    // Update profile statuses back to idle
    const profileIds = runningTasks.map((t) => t.profile_id)
    const { error: updateProfilesError } = await supabase
      .from("gologin_profiles")
      .update({ status: "idle" })
      .in("id", profileIds)

    if (updateProfilesError) throw updateProfilesError

    return NextResponse.json({
      success: true,
      count: runningTasks.length,
      message: `Stopped ${runningTasks.length} running task(s)`,
    })
  } catch (error: any) {
    console.error("[v0] Error stopping running tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
