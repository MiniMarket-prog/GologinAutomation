import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerClient()
    const { id } = params

    const { error } = await supabase.from("warmup_seed_accounts").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting seed account:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[v0] Error in DELETE /api/warmup/seed-accounts/[id]:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
