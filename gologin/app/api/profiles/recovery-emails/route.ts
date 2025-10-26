import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all profiles with gmail_email for the current user
    const { data: profiles, error } = await supabase
      .from("gologin_profiles")
      .select("id, gmail_email")
      .eq("assigned_user_id", user.id)
      .not("gmail_email", "is", null)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching recovery emails:", error)
      return NextResponse.json({ error: "Failed to fetch recovery emails" }, { status: 500 })
    }

    const uniqueEmailsMap = new Map()
    for (const profile of profiles) {
      if (!uniqueEmailsMap.has(profile.gmail_email)) {
        uniqueEmailsMap.set(profile.gmail_email, {
          id: profile.id,
          email: profile.gmail_email,
        })
      }
    }

    const emails = Array.from(uniqueEmailsMap.values())

    return NextResponse.json({ emails })
  } catch (error) {
    console.error("[v0] Error in recovery emails API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
