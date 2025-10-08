import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/utils/auth"

export async function GET() {
  try {
    await requireAdmin()

    const adminClient = getSupabaseAdminClient()

    // Get all users
    const { data, error } = await adminClient.auth.admin.listUsers()

    if (error) throw error

    // Format users with role information
    const users = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "user",
      created_at: user.created_at,
    }))

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("[v0] Error fetching users:", error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes("Unauthorized") ? 403 : 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { email, password, role = "user" } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const adminClient = getSupabaseAdminClient()

    // Create user with admin client
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
      },
    })

    if (error) throw error

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || "user",
        created_at: data.user.created_at,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error creating user:", error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes("Unauthorized") ? 403 : 500 })
  }
}
