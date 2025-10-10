import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update all running tasks to failed status with a stop message
    const { data, error, count } = await supabase
      .from("automation_tasks")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: "Task stopped by user",
      })
      .eq("status", "running")
      .eq("created_by", userData.user.id) // Only stop own tasks
      .select()

    if (error) {
      console.error("[v0] Error stopping running tasks:", error)
      throw error
    }

    // Also update any profiles that were running
    if (data && data.length > 0) {
      const profileIds = data.map((task: any) => task.profile_id).filter(Boolean)
      if (profileIds.length > 0) {
        await supabase.from("gologin_profiles").update({ status: "idle" }).in("id", profileIds)
      }
    }

    console.log(`[v0] Stopped ${count || 0} running tasks for user ${userData.user.email}`)

    return NextResponse.json({
      success: true,
      count: count || 0,
      message: `Stopped ${count || 0} running task${count === 1 ? "" : "s"}`,
    })
  } catch (error: any) {
    console.error("[v0] Error stopping running tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
