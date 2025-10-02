import { getSupabaseServerClient } from "@/lib/supabase/server"
import { GoLoginAPI } from "@/lib/gologin/api"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()

    const { data: apiKeySetting, error: settingsError } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "gologin_api_key")
      .single()

    if (settingsError || !apiKeySetting?.value) {
      return NextResponse.json(
        { error: "GoLogin API key not found. Please save it in Settings first." },
        { status: 400 },
      )
    }

    const gologin_api_key = apiKeySetting.value

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch profiles from GoLogin
    const gologinAPI = new GoLoginAPI(gologin_api_key)
    const response = await gologinAPI.getProfiles()

    console.log("[v0] GoLogin API response:", JSON.stringify(response).substring(0, 200))

    // GoLogin API might return { profiles: [...] } or just [...]
    let gologinProfiles: any[] = []

    if (Array.isArray(response)) {
      gologinProfiles = response
    } else if (response && Array.isArray(response.profiles)) {
      gologinProfiles = response.profiles
    } else if (response && Array.isArray(response.data)) {
      gologinProfiles = response.data
    } else {
      console.error("[v0] Unexpected GoLogin API response format:", response)
      return NextResponse.json(
        { error: "Unexpected response format from GoLogin API. Please check your API key." },
        { status: 500 },
      )
    }

    console.log(`[v0] Found ${gologinProfiles.length} profiles from GoLogin`)

    if (gologinProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No profiles found in your GoLogin account",
        count: 0,
      })
    }

    // Get existing profiles
    const { data: existingProfiles } = await supabase.from("gologin_profiles").select("profile_id")

    const existingIds = new Set(existingProfiles?.map((p) => p.profile_id) || [])

    // Filter new profiles
    const newProfiles = gologinProfiles
      .filter((p: any) => !existingIds.has(p.id))
      .map((p: any) => ({
        profile_id: p.id,
        profile_name: p.name || `Profile ${p.id}`,
        // Profiles will be unassigned when first synced, users can assign them later
      }))

    if (newProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: `All ${gologinProfiles.length} profiles already synced`,
        count: 0,
      })
    }

    // Insert new profiles
    const { data, error } = await supabase.from("gologin_profiles").insert(newProfiles).select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Synced ${data.length} new profiles (${gologinProfiles.length} total in GoLogin)`,
      count: data.length,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing profiles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
