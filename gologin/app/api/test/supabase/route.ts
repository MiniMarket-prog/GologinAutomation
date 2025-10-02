import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    console.log("[v0] Testing Supabase connection...")

    const supabase = await getSupabaseServerClient()

    // Test database connection by counting profiles
    const { count: profileCount, error: profileError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    if (profileError) throw profileError

    // Test counting tasks
    const { count: taskCount, error: taskError } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })

    if (taskError) throw taskError

    console.log("[v0] Supabase test successful:", {
      profileCount,
      taskCount,
    })

    return NextResponse.json({
      success: true,
      profileCount: profileCount || 0,
      taskCount: taskCount || 0,
    })
  } catch (error) {
    console.error("[v0] Supabase test failed:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
