import { getSupabaseServerClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"

export async function RecentActivity() {
  const supabase = await getSupabaseServerClient()

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*, gologin_profiles(profile_name)")
    .order("created_at", { ascending: false })
    .limit(10)

  if (!logs || logs.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent activity</p>
  }

  return (
    <div className="space-y-3">
      {logs.map((log: any) => (
        <div key={log.id} className="flex items-start justify-between border-b border-border pb-3 last:border-0">
          <div className="space-y-1">
            <p className="text-sm font-medium">{log.action}</p>
            <p className="text-xs text-muted-foreground">{log.gologin_profiles?.profile_name || "Unknown Profile"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={log.success ? "default" : "destructive"}>{log.success ? "Success" : "Failed"}</Badge>
            <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleTimeString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
