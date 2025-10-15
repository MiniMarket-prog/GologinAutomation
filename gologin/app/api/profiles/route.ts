import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/utils/auth"
import { NextResponse } from "next/server"
import { gologinAPI } from "@/lib/gologin/api"

export async function GET(request: Request) {
  try {
    const userIsAdmin = await isAdmin()
    console.log("[v0] Admin status:", userIsAdmin)

    const supabase = userIsAdmin ? getSupabaseAdminClient() : await getSupabaseServerClient()

    const {
      data: { user },
    } = await (await getSupabaseServerClient()).auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const gmailStatus = searchParams.get("gmailStatus")
    const folder: string | null = searchParams.get("folder")

    console.log("[v0] Query params:", { page, limit, status, search, gmailStatus, folder })

    console.log("[v0] Fetching profiles from GoLogin API...")
    const gologinProfiles = await gologinAPI.getProfiles()
    const folders = await gologinAPI.getFolders()

    // Create folder ID to name mapping
    const folderMap = new Map(folders.map((f: any) => [f.id || f._id, f.name || "Uncategorized"]))

    console.log(`[v0] ✓ Fetched ${gologinProfiles.length} profiles from GoLogin`)

    let allowedFolders: Set<string> | null = null
    if (!userIsAdmin) {
      console.log(`[v0] Getting accessible folders for: ${user.email}`)

      // Get user's database ID
      const { data: dbUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single()

      if (dbUser) {
        // Get folders the user has access to
        const { data: userFolders, error: foldersError } = await supabase
          .from("user_folder_assignments")
          .select("folder_name")
          .eq("user_id", dbUser.id)

        if (userFolders && userFolders.length > 0) {
          allowedFolders = new Set(userFolders.map((f) => f.folder_name))
          console.log(`[v0] User has access to ${allowedFolders.size} folders:`, Array.from(allowedFolders))
        } else {
          console.log(`[v0] ⚠ User ${user.email} has no folder assignments`)
          allowedFolders = new Set() // Empty set means no access
        }
      } else {
        console.log(`[v0] ⚠ User ${user.email} not found in database`)
        allowedFolders = new Set() // Empty set means no access
      }
    }

    let filteredProfiles = gologinProfiles

    // First, filter by folder param if provided
    if (folder) {
      console.log(`[v0] Filtering profiles by folder param: ${folder}`)
      filteredProfiles = filteredProfiles.filter((p: any) => {
        const profileFolders = p.folders || []
        const profileFolderName = profileFolders.length > 0 ? profileFolders[0] : "Uncategorized"
        return profileFolderName === folder
      })
      console.log(`[v0] ✓ Found ${filteredProfiles.length} profiles in folder "${folder}"`)
    }

    // Then, filter by user's accessible folders if not admin
    if (!userIsAdmin && allowedFolders) {
      const beforeCount = filteredProfiles.length
      filteredProfiles = filteredProfiles.filter((p: any) => {
        const profileFolders = p.folders || []
        const profileFolderName = profileFolders.length > 0 ? profileFolders[0] : "Uncategorized"
        return allowedFolders!.has(profileFolderName)
      })
      console.log(`[v0] ✓ Filtered from ${beforeCount} to ${filteredProfiles.length} profiles based on folder access`)
    }

    const profileIds = filteredProfiles.map((p: any) => p.id)

    console.log(`[v0] [DEBUG] Fetching profiles from database for ${profileIds.length} GoLogin profiles`)

    let dbProfiles: any[] = []
    try {
      const { data, error: dbError } = await supabase.from("gologin_profiles").select("*").in("profile_id", profileIds)

      if (dbError) {
        console.error("[v0] [ERROR] Database query error:", {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
        })
      } else {
        dbProfiles = data || []
        console.log(`[v0] [DEBUG] Database query returned ${dbProfiles.length} profiles from gologin_profiles table`)
      }
    } catch (error: any) {
      console.error("[v0] [ERROR] Exception during database query:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
      console.log("[v0] [WARN] Continuing without database data due to query failure")
    }

    if (dbProfiles.length > 0) {
      const sampleProfile = dbProfiles[0]
      console.log(`[v0] [DEBUG] Sample database profile:`, {
        profile_id: sampleProfile.profile_id,
        profile_name: sampleProfile.profile_name,
        gmail_status: sampleProfile.gmail_status,
        gmail_status_checked_at: sampleProfile.gmail_status_checked_at,
        gmail_status_message: sampleProfile.gmail_status_message,
      })
    }

    // Create a map of database profiles by profile_id
    const dbProfileMap = new Map<string, any>(dbProfiles.map((p: any) => [p.profile_id, p]))

    console.log(`[v0] [DEBUG] Created profile map with ${dbProfileMap.size} entries`)

    const mergedProfiles = filteredProfiles.map((gProfile: any) => {
      const dbProfile = dbProfileMap.get(gProfile.id)

      if (dbProfile && dbProfile.gmail_status) {
        console.log(`[v0] [DEBUG] Merging profile ${gProfile.name}: gmail_status=${dbProfile.gmail_status}`)
      }

      // GoLogin API returns folders as an array of folder names
      const profileFolders = gProfile.folders || []
      const folderName: string = profileFolders.length > 0 ? profileFolders[0] : "Uncategorized"

      return {
        id: dbProfile?.id || null,
        profile_id: gProfile.id,
        profile_type: "gologin",
        profile_name: gProfile.name || `Profile ${gProfile.id}`,
        gmail_email: dbProfile?.gmail_email || null,
        gmail_password: dbProfile?.gmail_password || null,
        recovery_email: dbProfile?.recovery_email || null,
        folder_name: folderName,
        status: dbProfile?.status || "idle",
        gmail_status: dbProfile?.gmail_status || null,
        gmail_status_checked_at: dbProfile?.gmail_status_checked_at || null,
        gmail_status_message: dbProfile?.gmail_status_message || null,
        assigned_user_id: dbProfile?.assigned_user_id || null,
        created_at: dbProfile?.created_at || gProfile.createdAt || null,
        updated_at: dbProfile?.updated_at || gProfile.updatedAt || null,
        last_run: dbProfile?.last_run || null,
        is_deleted: dbProfile?.is_deleted || false,
        deleted_at: dbProfile?.deleted_at || null,
        local_config: null,
      }
    })

    console.log("[v0] Fetching local profiles from database...")
    let localProfilesQuery = supabase.from("gologin_profiles").select("*").eq("profile_type", "local")

    if (folder) {
      localProfilesQuery = localProfilesQuery.eq("folder_name", folder)
    }

    if (!userIsAdmin && allowedFolders && allowedFolders.size > 0) {
      localProfilesQuery = localProfilesQuery.in("folder_name", Array.from(allowedFolders))
    }

    const { data: localProfiles, error: localError } = await localProfilesQuery

    if (localError) {
      console.error("[v0] Error fetching local profiles:", localError)
    }

    console.log(`[v0] ✓ Fetched ${localProfiles?.length || 0} local profiles from database`)

    const localProfilesMapped = (localProfiles || []).map((p) => ({
      id: p.id,
      profile_id: p.id, // Use database ID as profile_id for local profiles
      profile_type: "local",
      profile_name: p.profile_name,
      gmail_email: p.gmail_email,
      gmail_password: p.gmail_password,
      recovery_email: p.recovery_email,
      folder_name: p.folder_name,
      status: p.status,
      gmail_status: p.gmail_status,
      gmail_status_checked_at: p.gmail_status_checked_at,
      gmail_status_message: p.gmail_status_message,
      assigned_user_id: p.assigned_user_id,
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_run: p.last_run,
      is_deleted: p.is_deleted,
      deleted_at: p.deleted_at,
      local_config: p.local_config,
    }))

    console.log("[v0] Merging GoLogin and local profiles...")
    let finalProfiles = [...mergedProfiles, ...localProfilesMapped]
    console.log(
      `[v0] Total profiles: ${finalProfiles.length} (${mergedProfiles.length} GoLogin + ${localProfilesMapped.length} local)`,
    )

    if (status) {
      finalProfiles = finalProfiles.filter((p) => p.status === status)
    }

    if (gmailStatus) {
      if (gmailStatus === "unchecked") {
        finalProfiles = finalProfiles.filter((p) => !p.gmail_status)
      } else {
        finalProfiles = finalProfiles.filter((p) => p.gmail_status === gmailStatus)
      }
    }

    if (search) {
      const searchLower = search.toLowerCase()
      finalProfiles = finalProfiles.filter(
        (p) =>
          p.profile_name?.toLowerCase().includes(searchLower) ||
          p.gmail_email?.toLowerCase().includes(searchLower) ||
          p.folder_name?.toLowerCase().includes(searchLower),
      )
    }

    const total = finalProfiles.length
    const offset = (page - 1) * limit
    const paginatedProfiles = finalProfiles.slice(offset, offset + limit)

    console.log(`[v0] Returning ${paginatedProfiles.length} profiles (${total} total after filters)`)

    return NextResponse.json({
      profiles: paginatedProfiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    console.error("[v0] Error fetching profiles:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("gologin_profiles")
      .insert({
        profile_id: body.profile_id,
        profile_name: body.profile_name,
        gmail_email: body.gmail_email,
        gmail_password: body.gmail_password,
        assigned_user_id: body.assigned_user_id || user.user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error creating profile:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
