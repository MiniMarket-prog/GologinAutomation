import { type NextRequest, NextResponse } from "next/server"
import { kameleoAPI } from "@/lib/kameleo/api"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import type { KameleoProfile } from "@/lib/types"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()

    if (!profileId) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: profile, error: dbError } = await supabase
      .from("kameleo_profiles")
      .select("*")
      .eq("id", profileId)
      .single<KameleoProfile>()

    if (dbError || !profile) {
      return NextResponse.json({ error: "Profile not found in database" }, { status: 404 })
    }

    // Launch the profile using Kameleo API
    const result = await kameleoAPI.startProfile(profile.profile_id)

    await supabase
      .from("kameleo_profiles")
      .update({
        last_run: new Date().toISOString(),
        status: "running",
      })
      .eq("id", profileId)

    return NextResponse.json({
      success: true,
      webdriverUrl: result.webdriverUrl,
      profileId: profile.profile_id,
    })
  } catch (error: any) {
    console.error("[v0] Error launching Kameleo profile:", error)
    return NextResponse.json({ error: error.message || "Failed to launch profile" }, { status: 500 })
  }
}
