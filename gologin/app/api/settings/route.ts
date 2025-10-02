import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    if (key) {
      // Get specific setting
      const { data, error } = await supabase.from("settings").select("*").eq("key", key).single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      // Get all settings
      const { data, error } = await supabase.from("settings").select("*")

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient()
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: "Setting key is required" }, { status: 400 })
    }

    // Upsert the setting
    const { data, error } = await supabase
      .from("settings")
      .upsert(
        {
          key,
          value: value || "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error saving setting:", error)
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 })
  }
}
