import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdminClient()
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

    console.log("[v0] Activity query result:", {
      count,
      dataLength: data?.length || 0,
      error: error?.message || null,
    })

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
