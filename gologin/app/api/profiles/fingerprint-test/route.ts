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

    console.log(`[v0] Testing fingerprint for profile: ${profile.profile_name}`)
    console.log(`[v0] Stored fingerprint config:`, profile.fingerprint_config)

    const apiKey = process.env.GOLOGIN_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GoLogin API key not configured" }, { status: 500 })
    }

    const launcher = new ProfileLauncher(apiKey, "local")

    const profileType = profile.profile_type || "gologin"
    const profileIdToUse = profile.profile_id || profile.id

    const localConfigWithFingerprint = {
      ...profile.local_config,
      browser_type: profile.browser_type || "chrome",
      fingerprint: profile.fingerprint_config,
    }

    const launchResult = await launcher.launchProfileByType(
      profileIdToUse,
      profileType,
      profile.profile_name,
      localConfigWithFingerprint,
    )

    const browser = launchResult.browser
    const page = launchResult.page

    if (!launchResult.success || !browser || !page) {
      const errorMsg = launchResult.error || "Failed to launch profile"
      console.error(`[v0] ❌ Profile launch failed: ${errorMsg}`)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    console.log(`[v0] ✓ Profile launched successfully, checking user agent...`)

    // Get actual user agent and navigator properties from the browser
    const navigatorProps = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: navigator.languages,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
      }
    })

    console.log(`[v0] User Agent: ${navigatorProps.userAgent}`)
    console.log(`[v0] Platform: ${navigatorProps.platform}`)

    // Check if user agent matches selected OS
    const selectedOS = profile.fingerprint_config?.os || "unknown"
    let matches = false

    if (selectedOS === "mac") {
      matches = navigatorProps.userAgent.includes("Macintosh") && navigatorProps.platform === "MacIntel"
    } else if (selectedOS === "win") {
      matches = navigatorProps.userAgent.includes("Windows") && navigatorProps.platform === "Win32"
    } else if (selectedOS === "lin") {
      matches = navigatorProps.userAgent.includes("Linux") && navigatorProps.platform.includes("Linux")
    }

    console.log(`[v0] OS Match: ${matches ? "✓" : "✗"}`)

    // Close the browser after testing
    await browser.close()

    return NextResponse.json({
      success: true,
      userAgent: navigatorProps.userAgent,
      platform: navigatorProps.platform,
      matches,
      navigatorProps,
      storedFingerprint: profile.fingerprint_config,
    })
  } catch (error) {
    console.error("[v0] Error testing fingerprint:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to test fingerprint",
      },
      { status: 500 },
    )
  }
}
