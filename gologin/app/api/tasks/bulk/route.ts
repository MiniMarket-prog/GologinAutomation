import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    console.log("[v0] Bulk task creation request:", body)

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profile_ids, task_type, config, sequential } = body

    if (!Array.isArray(profile_ids) || profile_ids.length === 0) {
      return NextResponse.json({ error: "Invalid profile_ids array" }, { status: 400 })
    }

    const now = new Date()
    const tasks = profile_ids.map((profile_id, index) => {
      const scheduledAt = sequential ? new Date(now.getTime() + index * 5000).toISOString() : now.toISOString()

      return {
        profile_id,
        task_type,
        config: config || {},
        scheduled_at: scheduledAt,
        created_by: null,
      }
    })

    console.log("[v0] Inserting tasks:", tasks)

    const { data, error } = await supabase.from("automation_tasks").insert(tasks).select()

    if (error) {
      console.error("[v0] Database error creating bulk tasks:", error)
      throw error
    }

    console.log("[v0] Successfully created bulk tasks:", data)

    return NextResponse.json({ success: true, count: data.length, tasks: data })
  } catch (error: any) {
    console.error("[v0] Error creating bulk tasks:", error)
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 })
  }
}
