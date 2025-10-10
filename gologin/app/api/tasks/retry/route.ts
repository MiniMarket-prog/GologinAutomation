import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { task_ids } = body

    if (!Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json({ error: "Invalid task_ids array" }, { status: 400 })
    }

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reset tasks to pending status
    const { data, error, count } = await supabase
      .from("automation_tasks")
      .update({
        status: "pending",
        started_at: null,
        completed_at: null,
        error_message: null,
        scheduled_at: new Date().toISOString(),
      })
      .in("id", task_ids)
      .eq("created_by", userData.user.id) // Only allow retrying own tasks
      .select()

    if (error) {
      console.error("[v0] Error retrying tasks:", error)
      throw error
    }

    console.log(`[v0] Retried ${count || 0} tasks for user ${userData.user.email}`)

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      tasks: data,
    })
  } catch (error: any) {
    console.error("[v0] Error retrying tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
