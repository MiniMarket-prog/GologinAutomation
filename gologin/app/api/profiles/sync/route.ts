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

    // Fetch profiles and folders from GoLogin
    const gologinAPI = new GoLoginAPI(gologin_api_key)
    const [gologinProfiles, gologinFolders] = await Promise.all([gologinAPI.getProfiles(), gologinAPI.getFolders()])

    console.log(`[v0] Found ${gologinProfiles.length} profiles from GoLogin`)

    if (gologinProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No profiles found in your GoLogin account",
        added: 0,
        updated: 0,
        total: 0,
      })
    }

    const folderMap = new Map(gologinFolders.map((f: any) => [f.id, f.name || "Unnamed Folder"]))

    console.log(`[v0] 📁 Folder Map:`, Array.from(folderMap.entries()))
    console.log(
      `[v0] 📋 Sample profile folders:`,
      gologinProfiles.slice(0, 3).map((p) => ({ id: p.id, name: p.name, folders: p.folders })),
    )

    const profilesToSync = gologinProfiles.map((p) => {
      // The GoLogin API returns folder names in the folders array, not IDs
      const folderName = p.folders && p.folders.length > 0 ? p.folders[0] : "No Folder"

      if (p.folders && p.folders.length > 0) {
        console.log(`[v0] Profile "${p.name}" has folders:`, p.folders, `→ using: "${folderName}"`)
      }

      return {
        profile_id: p.id,
        profile_name: p.name || `Profile ${p.id}`,
        folder_name: folderName,
      }
    })

    const uniqueProfiles = Array.from(new Map(profilesToSync.map((p) => [p.profile_id, p])).values())

    console.log(`[v0] Deduplicating: ${profilesToSync.length} profiles → ${uniqueProfiles.length} unique profiles`)

    // Use upsert to insert new profiles or update existing ones
    const { data: syncedProfiles, error: syncError } = await supabase
      .from("gologin_profiles")
      .upsert(uniqueProfiles, {
        onConflict: "profile_id",
        ignoreDuplicates: false,
      })
      .select()

    if (syncError) {
      console.error("[v0] Error syncing profiles:", syncError)
      return NextResponse.json({ error: `Failed to sync profiles: ${syncError.message}` }, { status: 500 })
    }

    const syncedCount = syncedProfiles?.length || 0
    console.log(`[v0] Successfully synced ${syncedCount} profiles`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedCount} profiles from GoLogin`,
      synced: syncedCount,
      total: gologinProfiles.length,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing profiles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
