import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("behavior_patterns")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ patterns: data })
  } catch (error: any) {
    console.error("[v0] Error fetching behavior patterns:", error)
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
      .from("behavior_patterns")
      .insert({
        name: body.name,
        description: body.description,
        config: body.config,
        is_default: body.is_default || false,
        created_by: user.user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error creating behavior pattern:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
