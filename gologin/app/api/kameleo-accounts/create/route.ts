import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { count = 1, country, profileId, profileType, proxyId, recoveryEmails } = body

    const supabase = await getSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Validate required fields
    if (!country || !profileId || !profileType) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Create tasks in database
    const tasks: Array<{
      user_id: string
      status: string
      country: string
      profile_id: string
      profile_type: string
      proxy_id: string | null
      recovery_email: string | null
    }> = []

    for (let i = 0; i < count; i++) {
      tasks.push({
        user_id: user.id,
        status: "pending",
        country,
        profile_id: profileId,
        profile_type: profileType,
        proxy_id: proxyId || null,
        recovery_email: recoveryEmails && recoveryEmails.length > 0 ? recoveryEmails.join(",") : null,
      })
    }

    const { data, error } = await supabase
      .from("kameleo_account_tasks")
      .insert(tasks as any)
      .select()

    if (error) {
      console.error("[v0] Error creating tasks:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Created ${count} task(s)`,
      tasks: data,
    })
  } catch (error: any) {
    console.error("[v0] Error in create route:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
