import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import type { KameleoProfile } from "@/lib/supabase/types"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const supabase = getSupabaseAdminClient()

    const { error } = await supabase.from("kameleo_profiles").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error deleting Kameleo profile:", error)
    return NextResponse.json({ error: error.message || "Failed to delete profile" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
    const supabase = getSupabaseAdminClient()

    const { data, error } = await supabase
      .from("kameleo_profiles")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single<KameleoProfile>()

    if (error) throw error

    return NextResponse.json({ success: true, profile: data })
  } catch (error: any) {
    console.error("[v0] Error updating Kameleo profile:", error)
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 })
  }
}
