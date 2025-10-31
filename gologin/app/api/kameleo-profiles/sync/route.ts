import { NextResponse } from "next/server"
import { kameleoAPI } from "@/lib/kameleo/api"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

export async function POST() {
  try {
    console.log("[v0] Starting Kameleo profiles sync...")

    // Fetch profiles from Kameleo API
    const kameleoProfiles = await kameleoAPI.getProfiles()
    console.log(`[v0] Fetched ${kameleoProfiles.length} profiles from Kameleo API`)

    if (kameleoProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No profiles found in Kameleo",
        synced: 0,
      })
    }

    const supabase = getSupabaseAdminClient()
    let syncedCount = 0
    let updatedCount = 0
    const errors: string[] = []

    // Process each profile
    for (const profile of kameleoProfiles) {
      try {
        console.log(`[v0] Processing profile ${profile.name}:`, {
          hasProxy: !!profile.proxy,
          proxyData: profile.proxy,
        })

        // Check if profile already exists
        const { data: existing } = await supabase
          .from("kameleo_profiles")
          .select("id")
          .eq("profile_id", profile.id)
          .single()

        let proxyConfig = null
        if (profile.proxy) {
          // Kameleo API returns proxy data in a nested structure
          // proxy.value = type (http, socks5, etc)
          // proxy.extra = { host, port, id (username), secret (password) }
          const proxyData = profile.proxy as any

          if (proxyData.value && proxyData.value !== "none" && proxyData.extra) {
            proxyConfig = {
              type: proxyData.value,
              host: proxyData.extra.host,
              port: proxyData.extra.port,
              username: proxyData.extra.id || null,
              password: proxyData.extra.secret || null,
            }
            console.log(`[v0] Proxy config for ${profile.name}:`, proxyConfig)
          }
        }

        const profileData = {
          profile_id: profile.id,
          profile_name: profile.name,
          folder_path: "Synced", // Default folder for synced profiles
          fingerprint_config: {
            baseProfileId: profile.baseProfileId,
            deviceType: (profile as any).deviceType,
            browserProduct: (profile as any).browserProduct,
            osFamily: (profile as any).osFamily,
            language: (profile as any).language,
          },
          proxy_config: proxyConfig,
          status: "idle",
          updated_at: new Date().toISOString(),
        }

        if (existing) {
          // Update existing profile
          const { error } = await supabase
            .from("kameleo_profiles")
            .update(profileData as any)
            .eq("profile_id", profile.id)

          if (error) {
            console.error(`[v0] Error updating profile ${profile.id}:`, error)
            errors.push(`Failed to update ${profile.name}: ${error.message}`)
          } else {
            updatedCount++
          }
        } else {
          // Insert new profile
          const { error } = await supabase.from("kameleo_profiles").insert({
            ...profileData,
            created_at: new Date().toISOString(),
          } as any)

          if (error) {
            console.error(`[v0] Error inserting profile ${profile.id}:`, error)
            errors.push(`Failed to insert ${profile.name}: ${error.message}`)
          } else {
            syncedCount++
          }
        }
      } catch (error: any) {
        console.error(`[v0] Error processing profile ${profile.id}:`, error)
        errors.push(`Failed to process ${profile.name}: ${error.message}`)
      }
    }

    console.log(`[v0] Sync complete: ${syncedCount} new, ${updatedCount} updated`)

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedCount} new profiles and updated ${updatedCount} existing profiles`,
      synced: syncedCount,
      updated: updatedCount,
      total: kameleoProfiles.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("[v0] Error syncing Kameleo profiles:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to sync Kameleo profiles",
        hint: "Make sure Kameleo Local API is running on http://localhost:5050",
      },
      { status: 500 },
    )
  }
}
