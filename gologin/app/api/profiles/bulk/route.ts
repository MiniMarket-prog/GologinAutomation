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

    const { profiles } = body

    if (!Array.isArray(profiles) || profiles.length === 0) {
      return NextResponse.json({ error: "Invalid profiles array" }, { status: 400 })
    }

    // Add assigned_user_id to each profile
    const profilesWithUser = profiles.map((p) => ({
      ...p,
      assigned_user_id: p.assigned_user_id || user.user.id,
    }))

    const { data, error } = await supabase.from("gologin_profiles").insert(profilesWithUser).select()

    if (error) throw error

    return NextResponse.json({ success: true, count: data.length, profiles: data })
  } catch (error: any) {
    console.error("[v0] Error bulk creating profiles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
