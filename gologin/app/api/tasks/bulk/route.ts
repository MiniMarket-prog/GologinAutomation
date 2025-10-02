import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profile_ids, task_type, config } = body

    if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
      return NextResponse.json({ error: "Invalid profile_ids array" }, { status: 400 })
    }

    // Create tasks for all profiles
    const tasks = profile_ids.map((profile_id) => ({
      profile_id,
      task_type,
      config: config || {},
      scheduled_at: new Date().toISOString(),
      created_by: user.user.id,
    }))

    const { data, error } = await supabase.from("automation_tasks").insert(tasks).select()

    if (error) throw error

    return NextResponse.json({ success: true, count: data.length, tasks: data })
  } catch (error: any) {
    console.error("[v0] Error creating bulk tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
