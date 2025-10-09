import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)

    const dateFrom = searchParams.get("dateFrom") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const dateTo = searchParams.get("dateTo") || new Date().toISOString()

    // Get all activity logs in date range
    const { data } = await supabase
      .from("activity_logs")
      .select(
        `
        *,
        gologin_profiles(profile_name, folder_name, assigned_user_id),
        automation_tasks(created_by)
      `,
      )
      .gte("created_at", dateFrom)
      .lte("created_at", dateTo)

    const logs = (data || []) as any[]

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        taskTypeDistribution: [],
        successRateByTaskType: [],
        averageDurationByTaskType: [],
        activityByHour: [],
        topProfiles: [],
        folderActivity: [],
        errorPatterns: [],
        dailyActivity: [],
        summary: {
          totalActivities: 0,
          successfulActivities: 0,
          failedActivities: 0,
          averageDuration: 0,
        },
      })
    }

    // Task type distribution
    const taskTypeCounts: Record<string, number> = {}
    logs.forEach((log) => {
      taskTypeCounts[log.action] = (taskTypeCounts[log.action] || 0) + 1
    })
    const taskTypeDistribution = Object.entries(taskTypeCounts).map(([name, value]) => ({ name, value }))

    // Success rate by task type
    const taskTypeStats: Record<string, { total: number; success: number }> = {}
    logs.forEach((log) => {
      if (!taskTypeStats[log.action]) {
        taskTypeStats[log.action] = { total: 0, success: 0 }
      }
      taskTypeStats[log.action].total++
      if (log.success) taskTypeStats[log.action].success++
    })
    const successRateByTaskType = Object.entries(taskTypeStats).map(([name, stats]) => ({
      name,
      rate: Math.round((stats.success / stats.total) * 100),
      total: stats.total,
    }))

    // Average duration by task type
    const durationStats: Record<string, { total: number; count: number }> = {}
    logs.forEach((log) => {
      if (log.duration_ms) {
        if (!durationStats[log.action]) {
          durationStats[log.action] = { total: 0, count: 0 }
        }
        durationStats[log.action].total += log.duration_ms
        durationStats[log.action].count++
      }
    })
    const averageDurationByTaskType = Object.entries(durationStats).map(([name, stats]) => ({
      name,
      duration: Math.round(stats.total / stats.count),
    }))

    // Activity by hour
    const hourCounts: Record<number, number> = {}
    logs.forEach((log) => {
      const hour = new Date(log.created_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })
    const activityByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
    }))

    // Top profiles by activity
    const profileCounts: Record<string, { name: string; count: number; success: number }> = {}
    logs.forEach((log) => {
      const profileName = (log.gologin_profiles as any)?.profile_name || "Unknown"
      if (!profileCounts[profileName]) {
        profileCounts[profileName] = { name: profileName, count: 0, success: 0 }
      }
      profileCounts[profileName].count++
      if (log.success) profileCounts[profileName].success++
    })
    const topProfiles = Object.values(profileCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p) => ({
        ...p,
        successRate: Math.round((p.success / p.count) * 100),
      }))

    // Folder activity
    const folderCounts: Record<string, { name: string; count: number; success: number }> = {}
    logs.forEach((log) => {
      const folderName = (log.gologin_profiles as any)?.folder_name || "Uncategorized"
      if (!folderCounts[folderName]) {
        folderCounts[folderName] = { name: folderName, count: 0, success: 0 }
      }
      folderCounts[folderName].count++
      if (log.success) folderCounts[folderName].success++
    })
    const folderActivity = Object.values(folderCounts).map((f) => ({
      ...f,
      successRate: Math.round((f.success / f.count) * 100),
    }))

    // Error patterns
    const errorCounts: Record<string, number> = {}
    logs
      .filter((log) => !log.success && log.details?.error)
      .forEach((log) => {
        const error = log.details.error || "Unknown error"
        errorCounts[error] = (errorCounts[error] || 0) + 1
      })
    const errorPatterns = Object.entries(errorCounts)
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Daily activity
    const dailyCounts: Record<string, { date: string; total: number; success: number; failed: number }> = {}
    logs.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split("T")[0]
      if (!dailyCounts[date]) {
        dailyCounts[date] = { date, total: 0, success: 0, failed: 0 }
      }
      dailyCounts[date].total++
      if (log.success) {
        dailyCounts[date].success++
      } else {
        dailyCounts[date].failed++
      }
    })
    const dailyActivity = Object.values(dailyCounts).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      taskTypeDistribution,
      successRateByTaskType,
      averageDurationByTaskType,
      activityByHour,
      topProfiles,
      folderActivity,
      errorPatterns,
      dailyActivity,
      summary: {
        totalActivities: logs.length,
        successfulActivities: logs.filter((l) => l.success).length,
        failedActivities: logs.filter((l) => !l.success).length,
        averageDuration: Math.round(
          logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) / logs.filter((l) => l.duration_ms).length,
        ),
      },
    })
  } catch (error: any) {
    console.error("[v0] Error fetching analytics:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
