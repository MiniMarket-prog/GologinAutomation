"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Download, RefreshCw, Filter, List } from "lucide-react"
import { format } from "date-fns"

interface ActivityLog {
  id: string
  action: string
  success: boolean
  duration_ms: number | null
  created_at: string
  gologin_profiles: {
    profile_name: string
    folder_name: string | null
  } | null
  details: any
}

export function ActivityFeed() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    action: "all", // Updated default value
    success: "all", // Updated default value
    search: "",
  })
  const [showFilters, setShowFilters] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      })

      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom.toISOString())
      if (filters.dateTo) params.append("dateTo", filters.dateTo.toISOString())
      if (filters.action !== "all") params.append("action", filters.action)
      if (filters.success !== "all") params.append("success", filters.success)

      const response = await fetch(`/api/activity?${params}`)
      const data = await response.json()

      setLogs(data.data || [])
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (error) {
      console.error("[v0] Error fetching activity:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [page, filters])

  const exportToCSV = () => {
    const csv = [
      ["Time", "Profile", "Folder", "Action", "Status", "Duration (ms)"],
      ...logs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.gologin_profiles?.profile_name || "Unknown",
        log.gologin_profiles?.folder_name || "Uncategorized",
        log.action,
        log.success ? "Success" : "Failed",
        log.duration_ms?.toString() || "-",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `activity-${new Date().toISOString()}.csv`
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activity Feed</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLogs}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters({ ...filters, dateFrom: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? format(filters.dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters({ ...filters, dateTo: date })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Task Type</label>
                <Select value={filters.action} onValueChange={(value) => setFilters({ ...filters, action: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="check_inbox">Check Inbox</SelectItem>
                    <SelectItem value="read_email">Read Email</SelectItem>
                    <SelectItem value="send_email">Send Email</SelectItem>
                    <SelectItem value="star_email">Star Email</SelectItem>
                    <SelectItem value="reply_to_email">Reply to Email</SelectItem>
                    <SelectItem value="check_gmail_status">Check Gmail Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.success} onValueChange={(value) => setFilters({ ...filters, success: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="true">Success</SelectItem>
                    <SelectItem value="false">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Activity List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="rounded-full bg-muted p-3">
                <List className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">No activity found</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Activity logs will appear here when tasks are executed. Go to the Tasks page to create and run tasks
                  for your profiles.
                </p>
              </div>
              <Button variant="outline" onClick={() => (window.location.href = "/dashboard/tasks")}>
                Go to Tasks
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                      <span className="font-medium">{log.action.replace(/_/g, " ").toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{log.gologin_profiles?.profile_name || "Unknown Profile"}</span>
                      {log.gologin_profiles?.folder_name && (
                        <>
                          <span>•</span>
                          <span>{log.gologin_profiles.folder_name}</span>
                        </>
                      )}
                      {log.duration_ms && (
                        <>
                          <span>•</span>
                          <span>{log.duration_ms}ms</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
