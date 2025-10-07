import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle2, Clock, Users } from "lucide-react"
import { getSupabaseServerClient } from "@/lib/supabase/server"

async function getStats() {
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

    return {
      total: total || 0,
      byStatus: statusData || { idle: 0, running: 0, paused: 0, error: 0 },
      recentActivity: recentActivity || 0,
      activeTasks: activeTasks || 0,
    }
  } catch (error) {
    console.error("[v0] Error fetching stats:", error)
    return { total: 0, byStatus: { idle: 0, running: 0, paused: 0, error: 0 }, activeTasks: 0, recentActivity: 0 }
  }
}

export async function ProfileStats() {
  const stats = await getStats()

  const statCards = [
    {
      title: "Total Profiles",
      value: stats.total || 0,
      icon: Users,
      description: "Active profiles",
    },
    {
      title: "Running",
      value: stats.byStatus?.running || 0,
      icon: Activity,
      description: "Currently active",
    },
    {
      title: "Active Tasks",
      value: stats.activeTasks || 0,
      icon: Clock,
      description: "Pending or running",
    },
    {
      title: "24h Activity",
      value: stats.recentActivity || 0,
      icon: CheckCircle2,
      description: "Last 24 hours",
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
