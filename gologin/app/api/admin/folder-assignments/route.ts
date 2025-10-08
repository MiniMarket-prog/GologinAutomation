import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/utils/auth"

export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    const adminClient = getSupabaseAdminClient()

    let query = adminClient.from("user_folder_assignments").select("*")

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ assignments: data })
  } catch (error: any) {
    console.error("[v0] Error fetching folder assignments:", error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes("Unauthorized") ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { userId, folderNames } = body

    if (!userId || !Array.isArray(folderNames)) {
      return NextResponse.json({ error: "userId and folderNames array are required" }, { status: 400 })
    }

    const adminClient = getSupabaseAdminClient()

    // Delete existing assignments for this user
    await adminClient.from("user_folder_assignments").delete().eq("user_id", userId)

    // Insert new assignments
    if (folderNames.length > 0) {
      const assignments = folderNames.map((folderName) => ({
        user_id: userId,
        folder_name: folderName,
      }))

      const { error } = await adminClient.from("user_folder_assignments").insert(assignments as any)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error updating folder assignments:", error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes("Unauthorized") ? 403 : 500 })
  }
}
