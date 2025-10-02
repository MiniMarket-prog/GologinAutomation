import { getSupabaseServerClient } from "@/lib/server"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export async function ActivityTable() {
  const supabase = await getSupabaseServerClient()

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*, gologin_profiles(profile_name)")
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Profile</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs && logs.length > 0 ? (
            logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.gologin_profiles?.profile_name || "Unknown"}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  <Badge variant={log.success ? "default" : "destructive"}>{log.success ? "Success" : "Failed"}</Badge>
                </TableCell>
                <TableCell>{log.duration_ms ? `${log.duration_ms}ms` : "-"}</TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No activity logs found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
