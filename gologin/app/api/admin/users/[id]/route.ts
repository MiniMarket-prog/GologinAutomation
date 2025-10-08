import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/utils/auth"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { role, password } = body

    const adminClient = getSupabaseAdminClient()

    const updateData: any = {}

    if (role) {
      updateData.user_metadata = { role }
    }

    if (password) {
      updateData.password = password
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(params.id, updateData)

    if (error) throw error

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || "user",
      },
    })
  } catch (error: any) {
    console.error("[v0] Error updating user:", error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes("Unauthorized") ? 403 : 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()

    const adminClient = getSupabaseAdminClient()

    const { error } = await adminClient.auth.admin.deleteUser(params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting user:", error)
    return NextResponse.json({ error: error.message }, { status: error.message.includes("Unauthorized") ? 403 : 500 })
  }
}
