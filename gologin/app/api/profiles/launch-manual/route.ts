import { type NextRequest, NextResponse } from "next/server"
import { LocalBrowserLauncher } from "@/lib/automation/local-browser-launcher"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()

    console.log(`[v0] Manual launch request received for profileId: ${profileId}`)

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
    }

    const supabase = await createServerClient()

    const { data: profile, error: profileError } = await supabase
      .from("gologin_profiles")
      .select("*")
      .eq("id", profileId)
      .single()

    console.log(`[v0] Database query result:`, { profile: profile?.profile_name, error: profileError?.message })

    if (profileError || !profile) {
      console.log(`[v0] Profile not found in database for ID: ${profileId}`)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Only local profiles can be launched manually
    if (profile.profile_type !== "local") {
      console.log(`[v0] Profile ${profile.profile_name} is not a local profile (type: ${profile.profile_type})`)
      return NextResponse.json({ error: "Only local profiles can be launched manually" }, { status: 400 })
    }

    console.log(`[v0] Manual launch requested for profile: ${profile.profile_name}`)

    const launcher = new LocalBrowserLauncher()

    const localConfigWithBrowser = {
      ...profile.local_config,
      browser_type: profile.browser_type || "chrome",
      fingerprint: profile.fingerprint_config,
    }

    const result = await launcher.launchManually(profile.id, profile.profile_name, localConfigWithBrowser)

    if (!result.success) {
      console.log(`[v0] Manual launch failed: ${result.error}`)
      return NextResponse.json({ error: result.error || "Failed to launch profile manually" }, { status: 500 })
    }

    console.log(`[v0] Manual launch successful for profile: ${profile.profile_name}`)
    return NextResponse.json({
      success: true,
      message: "Profile launched manually. Browser is running independently without automation control.",
    })
  } catch (error: any) {
    console.error("[v0] Error in manual launch endpoint:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
