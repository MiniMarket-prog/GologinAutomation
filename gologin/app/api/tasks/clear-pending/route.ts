import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all pending tasks for the current user
    const { data, error, count } = await supabase
      .from("automation_tasks")
      .delete({ count: "exact" })
      .eq("status", "pending")
      .eq("created_by", userData.user.id)

    if (error) {
      console.error("[v0] Error clearing pending tasks:", error)
      throw error
    }

    console.log(`[v0] Cleared ${count || 0} pending tasks for user ${userData.user.email}`)

    return NextResponse.json({
      success: true,
      count: count || 0,
      message: `Cleared ${count || 0} pending task${count === 1 ? "" : "s"}`,
    })
  } catch (error: any) {
    console.error("[v0] Error clearing pending tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
