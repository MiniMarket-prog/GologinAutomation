import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Users } from "lucide-react"
import { ProfileStats } from "@/components/dashboard/profile-stats"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Monitor your GoLogin automation system</p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <ProfileStats />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="text-sm text-muted-foreground">Loading activity...</div>}>
              <RecentActivity />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/profiles"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Manage Profiles</p>
                <p className="text-sm text-muted-foreground">Add, edit, or sync profiles</p>
              </div>
            </a>
            <a
              href="/dashboard/tasks"
              className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent"
            >
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Create Tasks</p>
                <p className="text-sm text-muted-foreground">Schedule automation tasks</p>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatsLoading() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
