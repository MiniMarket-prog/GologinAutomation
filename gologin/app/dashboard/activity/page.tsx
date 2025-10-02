import { ActivityTable } from "@/components/activity/activity-table"

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
        <p className="text-muted-foreground">View all automation activity</p>
      </div>

      <ActivityTable />
    </div>
  )
}
