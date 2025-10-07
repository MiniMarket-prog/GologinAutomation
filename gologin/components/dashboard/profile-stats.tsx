import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle2, Clock, Users } from "lucide-react"

async function getStats() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window === "undefined" ? `http://localhost:${process.env.PORT || 3000}` : "")

  const response = await fetch(`${baseUrl}/api/profiles/stats`, {
    cache: "no-store",
  })

  if (!response.ok) {
    console.error("[v0] Failed to fetch stats:", response.status)
    return { total: 0, byStatus: {}, activeTasks: 0, recentActivity: 0 }
  }

  return response.json()
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
