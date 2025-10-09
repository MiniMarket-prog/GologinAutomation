import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/utils/auth"
import { gologinAPI } from "@/lib/gologin/api"

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin()
    console.log(`[v0] User ${user.email} is admin: ${userIsAdmin}`)

    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Only administrators can sync profiles from GoLogin" },
        { status: 403 },
      )
    }

    const dbClient = getSupabaseAdminClient()

    console.log(`[v0] Ensuring user record exists for ${user.email}`)
    let userId = user.id

    // First, check if user exists by ID
    const { data: existingUser } = await dbClient.from("users").select("id").eq("id", user.id).single()

    if (!existingUser) {
      console.log("[v0] User not found by ID, attempting to create...")

      // Try to insert the user
      const { error: insertError } = await dbClient.from("users").insert({
        id: user.id,
        email: user.email,
        role: userIsAdmin ? "admin" : "user",
      } as any)

      if (insertError) {
        // If insert fails due to duplicate email, find the existing user
        if (insertError.code === "23505" && insertError.message.includes("email")) {
          console.log("[v0] User exists with same email, fetching existing user...")
          const { data: userByEmail } = await dbClient
            .from("users")
            .select("id")
            .eq("email", user.email || "")
            .single()

          if (userByEmail) {
            userId = (userByEmail as any).id
            console.log(`[v0] Using existing user ID: ${userId}`)
          } else {
            throw new Error("Failed to find or create user record")
          }
        } else {
          console.error("[v0] Error creating user record:", insertError)
          throw new Error(`Failed to create user record: ${insertError.message}`)
        }
      } else {
        console.log("[v0] User record created successfully")
      }
    } else {
      console.log("[v0] User record already exists")
    }

    console.log("[v0] Fetching profiles from GoLogin API...")
    const gologinProfiles = await gologinAPI.getProfiles()
    console.log(`[v0] Found ${gologinProfiles.length} profiles from GoLogin`)

    console.log("[v0] Fetching folders from GoLogin API...")
    const folders = await gologinAPI.getFolders()
    console.log(`[v0] Found ${folders.length} folders from GoLogin`)

    const folderMap = new Map(folders.map((folder: any) => [folder.id || folder._id, folder.name || "Uncategorized"]))
    console.log("[v0] Folder map:", Object.fromEntries(folderMap))

    const profilesWithFolders = gologinProfiles.map((profile: any) => {
      // GoLogin API returns profiles with a "folders" array containing folder names
      const folderName = profile.folders && profile.folders.length > 0 ? profile.folders[0] : "Uncategorized"

      return {
        profile_id: profile.id,
        profile_name: profile.name || `Profile ${profile.id}`,
        folder_name: folderName,
        assigned_user_id: userId,
        status: "idle",
        is_deleted: false,
        deleted_at: null,
      }
    })

    console.log(`[v0] Mapped ${profilesWithFolders.length} profiles with folder names`)

    const folderDistribution = profilesWithFolders.reduce(
      (acc: Record<string, number>, p) => {
        const folderName = p.folder_name as string
        acc[folderName] = (acc[folderName] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    console.log("[v0] Folder distribution:", folderDistribution)

    const uniqueProfiles = Array.from(new Map(profilesWithFolders.map((p) => [p.profile_id, p])).values())
    console.log(`[v0] Deduplicating: ${profilesWithFolders.length} → ${uniqueProfiles.length} unique profiles`)

    if (uniqueProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No profiles to sync",
        count: 0,
      })
    }

    console.log(`[v0] Using ${userIsAdmin ? "admin" : "regular"} client for sync`)
    const { data, error } = await dbClient
      .from("gologin_profiles")
      .upsert(uniqueProfiles as any, {
        onConflict: "profile_id",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("[v0] Error upserting profiles:", error)
      throw new Error(`Failed to sync profiles: ${error.message}`)
    }

    console.log(`[v0] Successfully synced ${data?.length || uniqueProfiles.length} profiles`)

    const gologinProfileIds = gologinProfiles.map((p: any) => p.id)
    console.log(`[v0] Checking for deleted profiles not in GoLogin list of ${gologinProfileIds.length} IDs`)

    // First, get all profiles that are not deleted
    const { data: allProfiles } = await dbClient
      .from("gologin_profiles")
      .select("profile_id, profile_name")
      .eq("is_deleted", false)

    // Find profiles that exist in DB but not in GoLogin
    const profilesToDelete = (allProfiles || []).filter(
      (dbProfile: any) => !gologinProfileIds.includes(dbProfile.profile_id),
    )

    let deletedCount = 0
    if (profilesToDelete.length > 0) {
      const profileIdsToDelete = profilesToDelete.map((p: any) => p.profile_id)

      const { data: deletedProfiles, error: deleteCheckError } = await (dbClient.from("gologin_profiles") as any)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          status: "deleted",
        })
        .in("profile_id", profileIdsToDelete)
        .select("profile_id, profile_name")

      if (deleteCheckError) {
        console.error("[v0] Error marking deleted profiles:", deleteCheckError)
      } else {
        deletedCount = deletedProfiles?.length || 0
        console.log(`[v0] Marked ${deletedCount} profiles as deleted`)
        if (deletedProfiles && deletedProfiles.length > 0) {
          console.log(
            "[v0] Deleted profiles:",
            deletedProfiles.map((p: any) => `${p.profile_name} (${p.profile_id})`).join(", "),
          )
        }
      }
    } else {
      console.log("[v0] No deleted profiles found")
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${data?.length || uniqueProfiles.length} profiles, marked ${deletedCount} as deleted`,
      synced: data?.length || uniqueProfiles.length,
      deleted: deletedCount,
    })
  } catch (error) {
    console.error("[v0] Error syncing profiles:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to sync profiles"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
