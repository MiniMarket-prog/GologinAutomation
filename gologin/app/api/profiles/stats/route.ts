import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // Get total profiles
    const { count: total } = await supabase.from("gologin_profiles").select("*", { count: "exact", head: true })

    // Get profiles by status
    const { data: statusData } = await supabase
      .from("gologin_profiles")
      .select("status")
      .then((res) => {
        const counts = {
          idle: 0,
          running: 0,
          paused: 0,
          error: 0,
        }
        res.data?.forEach((p) => {
          counts[p.status as keyof typeof counts]++
        })
        return { data: counts }
      })

    // Get recent activity count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentActivity } = await supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday)

    // Get active tasks count
    const { count: activeTasks } = await supabase
      .from("automation_tasks")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "running"])

    return NextResponse.json({
      total: total || 0,
      byStatus: statusData || { idle: 0, running: 0, paused: 0, error: 0 },
      recentActivity: recentActivity || 0,
      activeTasks: activeTasks || 0,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
