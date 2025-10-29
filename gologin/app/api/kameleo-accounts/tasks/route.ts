import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import type { KameleoAccountTask } from "@/lib/kameleo/types"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Get all tasks for this user
    const { data: tasks, error } = await supabase
      .from("kameleo_account_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .returns<KameleoAccountTask[]>()

    if (error) {
      console.error("[v0] Error fetching tasks:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Get stats
    const stats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      processing: tasks.filter((t) => t.status === "processing").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      failed: tasks.filter((t) => t.status === "failed").length,
    }

    return NextResponse.json({
      success: true,
      tasks,
      stats,
    })
  } catch (error: any) {
    console.error("[v0] Error in tasks route:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Delete tasks
    let query = supabase.from("kameleo_account_tasks").delete().eq("user_id", user.id)

    if (status) {
      query = query.eq("status", status)
    }

    const { error } = await query

    if (error) {
      console.error("[v0] Error deleting tasks:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Tasks deleted successfully",
    })
  } catch (error: any) {
    console.error("[v0] Error in delete route:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
