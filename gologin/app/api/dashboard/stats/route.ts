import { getSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get total profiles for user
    const { count: totalProfiles } = await supabase.from("gologin_profiles").select("*", { count: "exact", head: true })

    // Get profiles by status
    const { data: profiles } = await supabase.from("gologin_profiles").select("status, gmail_status")

    const statusCounts = {
      idle: 0,
      running: 0,
      paused: 0,
      error: 0,
    }

    const gmailStatusCounts = {
      ok: 0,
      blocked: 0,
      not_checked: 0,
      other: 0,
    }

    profiles?.forEach((p) => {
      statusCounts[p.status as keyof typeof statusCounts]++

      if (!p.gmail_status || p.gmail_status === "unknown") {
        gmailStatusCounts.not_checked++
      } else if (p.gmail_status === "ok") {
        gmailStatusCounts.ok++
      } else if (p.gmail_status === "blocked") {
        gmailStatusCounts.blocked++
      } else {
        gmailStatusCounts.other++
      }
    })

    // Get task statistics
    const { data: tasks } = await supabase
      .from("automation_tasks")
      .select("status, created_at")
      .order("created_at", { ascending: false })
      .limit(100)

    const taskStats = {
      total: tasks?.length || 0,
      pending: tasks?.filter((t) => t.status === "pending").length || 0,
      running: tasks?.filter((t) => t.status === "running").length || 0,
      completed: tasks?.filter((t) => t.status === "completed").length || 0,
      failed: tasks?.filter((t) => t.status === "failed").length || 0,
    }

    const successRate =
      taskStats.completed + taskStats.failed > 0
        ? Math.round((taskStats.completed / (taskStats.completed + taskStats.failed)) * 100)
        : 0

    // Get recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentActivity } = await supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", yesterday)

    // Get recent successful and failed activities
    const { data: recentLogs } = await supabase.from("activity_logs").select("success").gte("created_at", yesterday)

    const activityStats = {
      total: recentActivity || 0,
      successful: recentLogs?.filter((l) => l.success).length || 0,
      failed: recentLogs?.filter((l) => !l.success).length || 0,
    }

    return NextResponse.json({
      profiles: {
        total: totalProfiles || 0,
        byStatus: statusCounts,
      },
      gmail: gmailStatusCounts,
      tasks: taskStats,
      successRate,
      activity: activityStats,
    })
  } catch (error: any) {
    console.error("[v0] Error fetching dashboard stats:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
