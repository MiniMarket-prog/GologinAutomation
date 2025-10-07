import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ProfileLauncher } from "@/lib/automation/profile-launcher"

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Get profile from database
    const { data: profile, error: profileError } = await supabase
      .from("gologin_profiles")
      .select("*")
      .eq("id", profileId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    console.log(`[v0] Launching profile ${profile.profile_name} in local mode...`)

    const apiKey = process.env.GOLOGIN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GoLogin API key not configured" }, { status: 500 })
    }

    // Launch profile in local mode (apiKey, mode)
    const launcher = new ProfileLauncher(apiKey, "local")
    const { browser, page } = await launcher.launchProfile(profile.gologin_id)

    if (!browser) {
      return NextResponse.json({ error: "Failed to launch browser" }, { status: 500 })
    }

    console.log(`[v0] Opening Gmail in new tab...`)
    const gmailPage = await browser.newPage()
    await gmailPage.goto("https://mail.google.com/mail/u/0/#inbox", {
      waitUntil: "networkidle2",
      timeout: 30000,
    })
    console.log(`[v0] ✓ Gmail opened successfully`)

    console.log(`[v0] ✓ Profile launched successfully`)
    console.log(`[v0] Browser will stay open until manually closed`)

    // Note: We don't close the browser here - it stays open for manual checking
    // The user will close it manually when done

    return NextResponse.json({
      success: true,
      message: "Profile launched successfully. Browser will stay open until you close it manually.",
      profileName: profile.profile_name,
    })
  } catch (error) {
    console.error("[v0] Error launching profile:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to launch profile",
      },
      { status: 500 },
    )
  }
}
