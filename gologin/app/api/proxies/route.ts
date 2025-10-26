import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const workingOnly = searchParams.get("working") === "true"

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let query = supabase
      .from("user_proxies")
      .select("id, name, proxy_server, proxy_port, proxy_username, proxy_password, is_working")
      .eq("user_id", user.id)

    if (workingOnly) {
      query = query.eq("is_working", true)
    }

    const { data: proxies, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching proxies:", error)
      return NextResponse.json({ error: "Failed to fetch proxies" }, { status: 500 })
    }

    return NextResponse.json({ proxies })
  } catch (error) {
    console.error("[v0] Error in proxies API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
