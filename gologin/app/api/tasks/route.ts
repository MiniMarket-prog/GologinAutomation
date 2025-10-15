import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { isAdmin, getCurrentUser } from "@/lib/utils/auth"

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin()
    console.log(`[v0] User ${user.email} is admin: ${userIsAdmin}`)

    const status = searchParams.get("status")
    const profileId = searchParams.get("profile_id")
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    console.log(`[v0] Query params - status: ${status}, profileId: ${profileId}, search: ${search}, limit: ${limit}`)

    let userFolders: string[] = []
    let allowedProfileIds: string[] = []

    if (!userIsAdmin) {
      const { data: dbUser } = await supabase.from("users").select("id").eq("email", user.email).single()

      if (!dbUser) {
        console.log("[v0] User not found in database, returning empty tasks")
        return NextResponse.json({ tasks: [], isAdmin: false })
      }

      // Get folders assigned to this user
      const { data: folderAssignments } = await supabase
        .from("user_folder_assignments")
        .select("folder_name")
        .eq("user_id", dbUser.id)

      userFolders = folderAssignments?.map((f) => f.folder_name) || []
      console.log(`[v0] User has access to ${userFolders.length} folders:`, userFolders)

      if (userFolders.length === 0) {
        console.log("[v0] User has no folder assignments, returning empty tasks")
        return NextResponse.json({ tasks: [], isAdmin: false })
      }

      const { data: userProfiles } = await supabase.from("gologin_profiles").select("id").in("folder_name", userFolders)

      allowedProfileIds = userProfiles?.map((p) => p.id) || []
      console.log(`[v0] User has access to ${allowedProfileIds.length} profiles`)
    }

    if (status) {
      const { count: totalCount } = await supabase
        .from("automation_tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", status)
      console.log(`[v0] Total tasks in database with status '${status}': ${totalCount}`)
    }

    let query = supabase
      .from("automation_tasks")
      .select(
        `
        *,
        gologin_profiles (
          profile_name,
          folder_name,
          gmail_status,
          gmail_status_checked_at,
          gmail_status_message,
          assigned_user_id,
          users!gologin_profiles_assigned_user_id_fkey (
            email
          )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit)

    if (!userIsAdmin && allowedProfileIds.length > 0) {
      console.log(`[v0] Applying folder filter for non-admin user`)
      // For non-admin users, only show tasks where:
      // 1. Task has no profile (profile_id is null), OR
      // 2. Task's profile_id is in the list of allowed profile IDs
      query = query.or(`profile_id.is.null,profile_id.in.(${allowedProfileIds.join(",")})`)
    } else if (!userIsAdmin && allowedProfileIds.length === 0) {
      // User has folders but no profiles in those folders - only show tasks with no profile
      console.log(`[v0] User has no profiles in assigned folders, showing only unassigned tasks`)
      query = query.is("profile_id", null)
    } else if (userIsAdmin) {
      console.log("[v0] Admin user - no folder filter applied")
    }

    if (status) {
      console.log(`[v0] Applying status filter: ${status}`)
      query = query.eq("status", status)
    }

    if (profileId) {
      console.log(`[v0] Applying profile filter: ${profileId}`)
      query = query.eq("profile_id", profileId)
    }

    const { data, error } = await query

    if (error) {
      console.error("[v0] Database query error:", error)
      throw error
    }

    console.log(`[v0] Query returned ${data?.length || 0} tasks from database`)

    if (data && data.length > 0) {
      console.log("[v0] Sample task data:", {
        id: data[0].id,
        status: data[0].status,
        task_type: data[0].task_type,
        profile_name: data[0].gologin_profiles?.profile_name,
        folder_name: data[0].gologin_profiles?.folder_name,
      })
    }

    let tasksWithProfileData = data?.map((task: any) => ({
      ...task,
      profile_name: task.gologin_profiles?.profile_name || "Unknown Profile",
      folder_name: task.gologin_profiles?.folder_name || null,
      gmail_status: task.gologin_profiles?.gmail_status || null,
      gmail_status_checked_at: task.gologin_profiles?.gmail_status_checked_at || null,
      gmail_status_message: task.gologin_profiles?.gmail_status_message || null,
      user_email: task.gologin_profiles?.users?.email || null,
      assigned_user_id: task.gologin_profiles?.assigned_user_id || null,
    }))

    if (search && tasksWithProfileData) {
      const searchLower = search.toLowerCase()
      const beforeSearchCount = tasksWithProfileData.length
      tasksWithProfileData = tasksWithProfileData.filter((task: any) => {
        const profileNameMatch = task.profile_name?.toLowerCase().includes(searchLower)
        const folderNameMatch = task.folder_name?.toLowerCase().includes(searchLower)
        const userEmailMatch = userIsAdmin && task.user_email?.toLowerCase().includes(searchLower)
        return profileNameMatch || folderNameMatch || userEmailMatch
      })
      console.log(`[v0] Search filter reduced tasks from ${beforeSearchCount} to ${tasksWithProfileData.length}`)
    }

    console.log(`[v0] Returning ${tasksWithProfileData?.length || 0} tasks for user`)
    return NextResponse.json({ tasks: tasksWithProfileData, isAdmin: userIsAdmin })
  } catch (error: any) {
    console.error("[v0] Error fetching tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabaseServerClient()

    const { data: dbUser } = await supabase.from("users").select("id").eq("email", user.email).single()

    if (!dbUser) {
      return NextResponse.json({ error: `User not found: ${user.email}` }, { status: 404 })
    }

    // Helper function to check if a string is a valid UUID
    const isValidUUID = (str: string): boolean => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return uuidRegex.test(str)
    }

    // Build the query based on whether the profile_id is a UUID or GoLogin ID
    let profileQuery = supabase
      .from("gologin_profiles")
      .select("id, recovery_email, gmail_email, gmail_password, profile_type")

    if (isValidUUID(body.profile_id)) {
      // If it's a valid UUID, check both id and profile_id columns
      profileQuery = profileQuery.or(`id.eq.${body.profile_id},profile_id.eq.${body.profile_id}`)
    } else {
      // If it's not a UUID (GoLogin ID), only check profile_id column
      profileQuery = profileQuery.eq("profile_id", body.profile_id)
    }

    const { data: dbProfile, error: profileError } = await profileQuery.single()

    if (profileError || !dbProfile) {
      console.log("[v0] Profile lookup error:", profileError)
      return NextResponse.json({ error: `Profile not found in database: ${body.profile_id}` }, { status: 404 })
    }

    console.log(`[v0] Found profile: ${dbProfile.id} (type: ${dbProfile.profile_type})`)

    const taskConfig = {
      ...(body.config || {}),
      // Add profile credentials if not already in config
      email: body.config?.email || dbProfile.gmail_email,
      password: body.config?.password || dbProfile.gmail_password,
      recoveryEmail: body.config?.recoveryEmail || dbProfile.recovery_email,
    }

    const taskData = {
      profile_id: dbProfile.id,
      task_type: body.task_type,
      config: taskConfig, // Use merged config with profile credentials
      priority: body.priority || 0,
      scheduled_at: body.scheduled_at || new Date().toISOString(),
      created_by: dbUser.id,
      status: body.status || "pending",
    }

    console.log("[v0] Creating task with data:", taskData)

    const { data, error } = await supabase.from("automation_tasks").insert(taskData).select().single()

    if (error) {
      console.error("[v0] Database error creating task:", error)
      throw error
    }

    console.log("[v0] Task created successfully:", data)

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[v0] Error creating task:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
