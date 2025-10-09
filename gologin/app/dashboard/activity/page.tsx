import { ActivityDashboard } from "@/components/activity/activity-dashboard"

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Dashboard</h1>
        <p className="text-muted-foreground">Monitor team performance and automation insights</p>
      </div>

      <ActivityDashboard />
    </div>
  )
}
