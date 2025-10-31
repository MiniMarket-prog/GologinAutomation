import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import type { KameleoProfile } from "@/lib/types"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const statusFilter = searchParams.get("status")
    const search = searchParams.get("search")

    const supabase = getSupabaseAdminClient()

    let query = supabase.from("kameleo_profiles").select("*", { count: "exact" })

    // Apply filters
    if (statusFilter) {
      query = query.eq("status", statusFilter)
    }

    if (search) {
      query = query.or(`profile_name.ilike.%${search}%,gmail_email.ilike.%${search}%`)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order("created_at", { ascending: false })

    const { data, error, count } = await query.returns<KameleoProfile[]>()

    if (error) {
      console.error("[v0] Error fetching Kameleo profiles:", error)
      throw error
    }

    return NextResponse.json({
      profiles: data || [],
      total: count || 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
      page,
      limit,
    })
  } catch (error: any) {
    console.error("[v0] Error in kameleo-profiles/list:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch profiles" }, { status: 500 })
  }
}
