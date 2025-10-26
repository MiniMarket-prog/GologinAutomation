import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
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

    const { count, proxy_server, proxy_username, proxy_password, use_existing_profile, existing_profile_id } =
      await request.json()

    if (!count || count < 1 || count > 50) {
      return NextResponse.json({ error: "Count must be between 1 and 50" }, { status: 400 })
    }

    if (use_existing_profile && !existing_profile_id) {
      return NextResponse.json({ error: "Existing profile ID required when using existing profile" }, { status: 400 })
    }

    // Check if 5sim API key is configured
    if (!process.env.FIVESIM_API_KEY) {
      return NextResponse.json({ error: "5sim API key not configured" }, { status: 500 })
    }

    // Create account creation tasks
    const tasks = []
    for (let i = 0; i < count; i++) {
      tasks.push({
        status: "pending",
        created_by: user.id,
        proxy_server: proxy_server || null,
        proxy_username: proxy_username || null,
        proxy_password: proxy_password || null,
        use_existing_profile: use_existing_profile || false,
        existing_profile_id: existing_profile_id || null,
      })
    }

    const { data, error } = await supabase.from("account_creation_tasks").insert(tasks).select()

    if (error) {
      console.error("Error creating tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: data })
  } catch (error) {
    console.error("Error in account creator:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
