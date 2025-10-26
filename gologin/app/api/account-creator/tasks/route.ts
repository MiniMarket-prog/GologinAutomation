import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase.from("users").select("role").eq("id", user.id).single()

    const isAdmin = userData?.role === "admin"

    // Build query
    let query = supabase.from("account_creation_tasks").select("*").order("created_at", { ascending: false })

    // Non-admin users only see their own tasks
    if (!isAdmin) {
      query = query.eq("created_by", user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: data })
  } catch (error) {
    console.error("Error in account creator tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
