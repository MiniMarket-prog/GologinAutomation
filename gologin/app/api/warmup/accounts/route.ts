import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Fetch all Gmail accounts from profiles
    const { data: profiles, error } = await supabase
      .from("gologin_profiles")
      .select("id, name, gmail_email, gmail_password, status")
      .not("gmail_email", "is", null)
      .order("name")

    if (error) {
      console.error("[v0] Error fetching Gmail accounts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ accounts: profiles || [] })
  } catch (error) {
    console.error("[v0] Error in accounts GET:", error)
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 })
  }
}
