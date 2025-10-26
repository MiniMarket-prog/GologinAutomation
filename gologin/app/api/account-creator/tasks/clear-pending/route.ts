import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete all pending tasks for the current user
    const { data, error } = await supabase
      .from("account_creation_tasks")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select()

    if (error) {
      console.error("[v0] Error clearing pending tasks:", error)
      return NextResponse.json({ error: "Failed to clear pending tasks" }, { status: 500 })
    }

    console.log(`[v0] Cleared ${data?.length || 0} pending tasks for user ${user.id}`)

    return NextResponse.json({
      success: true,
      cleared: data?.length || 0,
      message: `Successfully cleared ${data?.length || 0} pending task${data?.length !== 1 ? "s" : ""}`,
    })
  } catch (error) {
    console.error("[v0] Error in clear-pending route:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
