import { getSupabaseServerClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/utils/auth"
import { NextResponse } from "next/server"

export async function DELETE() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get current user
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userIsAdmin = await isAdmin()

    let count = 0

    if (userIsAdmin) {
      console.log(`[v0] Admin ${userData.user.email} clearing all pending tasks`)

      const { error, count: deletedCount } = await supabase
        .from("automation_tasks")
        .delete({ count: "exact" })
        .eq("status", "pending")

      if (error) {
        console.error("[v0] Error clearing pending tasks:", error)
        throw error
      }

      count = deletedCount || 0
    } else {
      console.log(`[v0] User ${userData.user.email} clearing pending tasks in their folders`)

      // Get user's database ID
      const { data: dbUser } = await supabase.from("users").select("id").eq("email", userData.user.email).single()

      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Get user's assigned folders
      const { data: folderAssignments } = await supabase
        .from("user_folder_assignments")
        .select("folder_name")
        .eq("user_id", dbUser.id)

      const userFolders = folderAssignments?.map((f) => f.folder_name) || []

      if (userFolders.length === 0) {
        console.log(`[v0] User has no assigned folders, clearing 0 tasks`)
        return NextResponse.json({
          success: true,
          count: 0,
          message: "No pending tasks to clear",
        })
      }

      const { data: profiles } = await supabase.from("gologin_profiles").select("id").in("folder_name", userFolders)

      if (!profiles || profiles.length === 0) {
        return NextResponse.json({
          count: 0,
          message: "No pending tasks to clear",
        })
      }

      const profileIds = profiles.map((p) => p.id)

      // Delete pending tasks for profiles in user's folders
      const { error, count: deletedCount } = await supabase
        .from("automation_tasks")
        .delete({ count: "exact" })
        .eq("status", "pending")
        .in("profile_id", profileIds)

      if (error) {
        console.error("[v0] Error clearing pending tasks:", error)
        throw error
      }

      count = deletedCount || 0
    }

    console.log(`[v0] Cleared ${count} pending tasks for user ${userData.user.email}`)

    return NextResponse.json({
      success: true,
      count,
      message: `Cleared ${count} pending task${count === 1 ? "" : "s"}`,
    })
  } catch (error: any) {
    console.error("[v0] Error clearing pending tasks:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
