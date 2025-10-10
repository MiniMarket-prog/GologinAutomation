import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const adminClient = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const profileId = searchParams.get("profileId")
    const action = searchParams.get("action")
    const success = searchParams.get("success")
    const folder = searchParams.get("folder")

    const offset = (page - 1) * limit

    console.log("[v0] ========================================")
    console.log("[v0] Activity API called with filters:", {
      page,
      limit,
      dateFrom,
      dateTo,
      profileId,
      action,
      success,
      folder,
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    console.log("[v0] Authenticated user:", {
      id: user?.id,
      email: user?.email,
    })

    const { data: folderAssignments } = await (adminClient.from("user_folder_assignments") as any)
      .select("folder_name")
      .eq("user_id", user?.id || "")

    console.log("[v0] User's assigned folders:", {
      count: folderAssignments?.length || 0,
      folders: folderAssignments?.map((f: any) => f.folder_name) || [],
    })

    const assignedFolders = folderAssignments?.map((f: any) => f.folder_name) || []
    let profilesViaFolders: any[] = []
    if (assignedFolders.length > 0) {
      const { data: profiles } = await (adminClient.from("gologin_profiles") as any)
        .select("id, profile_name, folder_name, assigned_user_id")
        .in("folder_name", assignedFolders)
      profilesViaFolders = profiles || []
    }

    console.log("[v0] Profiles accessible via folder assignments:", {
      count: profilesViaFolders.length,
      sampleProfiles: profilesViaFolders.slice(0, 5).map((p: any) => ({
        id: p.id,
        name: p.profile_name,
        folder: p.folder_name,
        assigned_user_id: p.assigned_user_id,
      })),
    })

    const { data: userProfiles } = await (adminClient.from("gologin_profiles") as any)
      .select("id, profile_name, folder_name, assigned_user_id")
      .eq("assigned_user_id", user?.id || "")

    console.log("[v0] Profiles accessible via assigned_user_id:", {
      count: userProfiles?.length || 0,
      sampleProfiles:
        userProfiles?.slice(0, 5).map((p: any) => ({
          id: p.id,
          name: p.profile_name,
          folder: p.folder_name,
        })) || [],
    })

    const { count: totalActivityLogs } = await (adminClient.from("activity_logs") as any).select("*", {
      count: "exact",
      head: true,
    })

    console.log("[v0] Total activity logs in database:", totalActivityLogs)

    if (profilesViaFolders.length > 0) {
      const profileIds = profilesViaFolders.map((p: any) => p.id)
      const { count: folderActivityCount } = await (adminClient.from("activity_logs") as any)
        .select("*", { count: "exact", head: true })
        .in("profile_id", profileIds)

      console.log("[v0] Activity logs for profiles in user's folders (should see these):", folderActivityCount)
    }

    let query = supabase
      .from("activity_logs")
      .select(
        `
        *,
        gologin_profiles(profile_name, folder_name, assigned_user_id),
        automation_tasks(created_by)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })

    // Apply filters
    if (dateFrom) {
      query = query.gte("created_at", dateFrom)
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo)
    }
    if (profileId) {
      query = query.eq("profile_id", profileId)
    }
    if (action) {
      query = query.eq("action", action)
    }
    if (success !== null && success !== undefined && success !== "") {
      query = query.eq("success", success === "true")
    }
    if (folder) {
      query = query.eq("gologin_profiles.folder_name", folder)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    console.log("[v0] Activity query result (with RLS applied):", {
      count,
      dataLength: data?.length || 0,
      error: error?.message || null,
    })

    if (data && data.length > 0) {
      console.log(
        "[v0] Sample activity logs returned:",
        data.slice(0, 3).map((log: any) => ({
          id: log.id,
          profile_id: log.profile_id,
          action: log.action,
          profile_folder: log.gologin_profiles?.folder_name,
          profile_assigned_user: log.gologin_profiles?.assigned_user_id,
          created_at: log.created_at,
        })),
      )
    }

    console.log("[v0] ========================================")

    if (error) throw error

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching activity:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
