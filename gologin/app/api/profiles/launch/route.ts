import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ProfileLauncher } from "@/lib/automation/profile-launcher"
import { GmailAutomator } from "@/lib/automation/gmail-automator"
import { handleCheckGmailLaunch } from "@/lib/automation/tasks/handle-check-gmail-launch"

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

    console.log(`[v0] Profile credentials check:`)
    console.log(`[v0]   - Email: ${profile.gmail_email ? "✓ Present" : "✗ Missing"}`)
    console.log(`[v0]   - Password: ${profile.gmail_password ? "✓ Present" : "✗ Missing"}`)
    console.log(`[v0]   - Recovery Email: ${profile.recovery_email ? "✓ Present" : "✗ Missing"}`)

    const apiKey = process.env.GOLOGIN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GoLogin API key not configured" }, { status: 500 })
    }

    const launcher = new ProfileLauncher(apiKey, "local")

    const profileType = profile.profile_type || "gologin"
    const profileIdToUse = profile.profile_id || profile.id

    const localConfigWithBrowser = {
      ...profile.local_config,
      browser_type: profile.browser_type || "chrome",
      fingerprint: profile.fingerprint_config,
    }

    console.log("[v0] Profile fingerprint_config from DB:", JSON.stringify(profile.fingerprint_config, null, 2))
    console.log("[v0] Config being passed to launcher:", JSON.stringify(localConfigWithBrowser, null, 2))

    const launchResult = await launcher.launchProfileByType(
      profileIdToUse,
      profileType,
      profile.profile_name,
      localConfigWithBrowser,
    )

    const browser = launchResult.browser
    const page = launchResult.page

    if (!launchResult.success || !browser || !page) {
      const errorMsg = launchResult.error || "Failed to launch profile"
      console.error(`[v0] ❌ Profile launch failed: ${errorMsg}`)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    console.log(`[v0] ✓ Profile launched successfully`)

    try {
      const defaultBehavior = {
        typing_speed: { min: 100, max: 300 },
        action_delay: { min: 500, max: 2000 },
        mouse_movement: { enabled: true, speed: "medium" },
        scroll_behavior: { enabled: true, pause_probability: 0.3 },
        random_pauses: {
          enabled: true,
          probability: 0.2,
          duration: { min: 1000, max: 3000 },
        },
      }

      const gmailAutomator = new GmailAutomator(page, defaultBehavior)

      // Prepare config with credentials if available
      const config: Record<string, any> = {}
      if (profile.gmail_email) {
        config.email = profile.gmail_email
      }
      if (profile.gmail_password) {
        config.password = profile.gmail_password
      }
      if (profile.recovery_email) {
        config.recoveryEmail = profile.recovery_email
      }

      const result = await handleCheckGmailLaunch(gmailAutomator, config)

      console.log(`[v0] Gmail launch result: ${result.status}`)
      console.log(`[v0] ${result.message}`)
      console.log(`[v0] Browser will stay open until manually closed`)

      return NextResponse.json({
        success: true,
        message: result.message,
        status: result.status,
        profileName: profile.profile_name,
        details: result.details,
      })
    } catch (error: any) {
      console.error("[v0] Error during Gmail launch:", error)
      // Even if Gmail launch fails, keep browser open
      return NextResponse.json({
        success: true,
        message: "Profile launched successfully. Browser will stay open until you close it manually.",
        profileName: profile.profile_name,
        warning: `Gmail launch failed: ${error.message}`,
      })
    }
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
