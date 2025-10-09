import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { task_ids } = body

    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return NextResponse.json({ error: "Invalid task_ids" }, { status: 400 })
    }

    // Reset tasks to pending status
    const { data, error } = await supabase
      .from("automation_tasks")
      .update({
        status: "pending",
        started_at: null,
        completed_at: null,
        error_message: null,
        scheduled_at: new Date().toISOString(),
      })
      .in("id", task_ids)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      message: `${data?.length || 0} task(s) reset to pending status`,
    })
  } catch (error: any) {
    console.error("[v0] Error retrying tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

