import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { isAdmin } from "@/lib/utils/auth"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const userIsAdmin = await isAdmin()
    console.log("[v0] Admin status:", userIsAdmin)

    const supabase = userIsAdmin ? getSupabaseAdminClient() : await getSupabaseServerClient()

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const gmailStatus = searchParams.get("gmailStatus")
    const folder = searchParams.get("folder")

    console.log("[v0] Query params:", { page, limit, status, search, gmailStatus, folder })

    if (folder) {
      const { data: sampleProfiles } = await supabase.from("gologin_profiles").select("folder_name").limit(10)

      const uniqueFolders = Array.from(new Set(sampleProfiles?.map((p) => p.folder_name).filter(Boolean)))
      console.log("[v0] Sample folder names in DB:", uniqueFolders)
      console.log("[v0] Looking for folder:", folder)
    }

    const offset = (page - 1) * limit

    let query = supabase
      .from("gologin_profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    if (gmailStatus) {
      if (gmailStatus === "unchecked") {
        query = query.is("gmail_status", null)
      } else {
        query = query.eq("gmail_status", gmailStatus)
      }
    }

    if (folder) {
      query = query.eq("folder_name", folder)
    }

    if (search) {
      query = query.or(`profile_name.ilike.%${search}%,gmail_email.ilike.%${search}%,folder_name.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    console.log("[v0] Query result:", { count, dataLength: data?.length, error })

    if (error) throw error

    return NextResponse.json({
      profiles: data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
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
