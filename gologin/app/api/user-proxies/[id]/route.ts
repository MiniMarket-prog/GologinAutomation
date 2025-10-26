import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// DELETE - Remove a proxy
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase.from("user_proxies").delete().eq("id", params.id).eq("user_id", user.id)

    if (error) {
      console.error("Error deleting proxy:", error)
      return NextResponse.json({ error: "Failed to delete proxy" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/user-proxies/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
