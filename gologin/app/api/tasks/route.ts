import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get("status")
    const profileId = searchParams.get("profile_id")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    let query = supabase
      .from("automation_tasks")
      .select(
        `
        *,
        gologin_profiles (
          profile_name
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (status) {
      query = query.eq("status", status)
    }

    if (profileId) {
      query = query.eq("profile_id", profileId)
    }

    const { data, error } = await query

    if (error) throw error

    const tasksWithProfileName = data?.map((task: any) => ({
      ...task,
      profile_name: task.gologin_profiles?.profile_name || "Unknown Profile",
    }))

    return NextResponse.json({ tasks: tasksWithProfileName })
  } catch (error: any) {
    console.error("[v0] Error fetching tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("automation_tasks")
      .insert({
        profile_id: body.profile_id,
        task_type: body.task_type,
        config: body.config || {},
        priority: body.priority || 0,
        scheduled_at: body.scheduled_at || new Date().toISOString(),
        created_by: null, // Set to null instead of user.user.id
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error creating task:", error)
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error creating task:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
