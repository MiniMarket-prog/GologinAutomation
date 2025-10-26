import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/warmup/seed-accounts - Starting...")
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Authentication error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Authenticated user:", user.id)

    const { data: accounts, error } = await supabase
      .from("warmup_seed_accounts")
      .select("*")
      .order("created_at", { ascending: false })

    console.log("[v0] Query result:", { accounts, error })

    if (error) {
      console.error("[v0] Error fetching seed accounts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Returning accounts:", accounts?.length || 0)
    return NextResponse.json({ accounts })
  } catch (error: any) {
    console.error("[v0] Error in GET /api/warmup/seed-accounts:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] POST /api/warmup/seed-accounts - Starting...")
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Authentication error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Authenticated user:", user.id)

    const body = await request.json()
    console.log("[v0] Request body:", body)
    const { email, name, notes } = body

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log("[v0] Inserting seed account with user_id:", { email, name, notes, user_id: user.id })
    const { data: account, error } = await supabase
      .from("warmup_seed_accounts")
      .insert({
        user_id: user.id,
        email,
        name: name || null,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single()

    console.log("[v0] Insert result:", { account, error })

    if (error) {
      console.error("[v0] Error creating seed account:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Seed account created successfully")
    return NextResponse.json({ account })
  } catch (error: any) {
    console.error("[v0] Error in POST /api/warmup/seed-accounts:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
