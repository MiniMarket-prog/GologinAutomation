"use client"

import { useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Trash2,
  AlertCircle,
  Search,
  RotateCcw,
  Calendar,
  Loader2,
  StopCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import type { AutomationTask } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusColors = {
  pending: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
}

const gmailStatusConfig = {
  ok: { color: "bg-green-500", icon: CheckCircle2, label: "OK" },
  blocked: { color: "bg-red-500", icon: XCircle, label: "Blocked" },
  password_required: { color: "bg-orange-500", icon: AlertCircle, label: "Password Required" },
  verification_required: { color: "bg-yellow-500", icon: AlertCircle, label: "Verification Required" },
  waiting_for_recovery_email: { color: "bg-blue-500", icon: Clock, label: "Waiting for Recovery" },
  error: { color: "bg-red-500", icon: XCircle, label: "Error" },
  unknown: { color: "bg-gray-500", icon: HelpCircle, label: "Unknown" },
}

export function TaskList() {
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [dateFrom, setDateFrom] = useState<Date>()
  const [dateTo, setDateTo] = useState<Date>()
  const [retrying, setRetrying] = useState(false)
  const [stopping, setStopping] = useState(false)
  const { toast } = useToast()

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (filter !== "all") params.append("status", filter)
    params.append("limit", "100")
    if (search) params.append("search", search)
    if (dateFrom) params.append("date_from", dateFrom.toISOString())
    if (dateTo) params.append("date_to", dateTo.toISOString())
    return `/api/tasks?${params.toString()}`
  }

  const { data, isLoading, mutate } = useSWR(buildUrl(), fetcher, { refreshInterval: 5000 })

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return

    try {
      await fetch(`/api/tasks/${id}`, { method: "DELETE" })
      mutate()
    } catch (error) {
      console.error("[v0] Error deleting task:", error)
    }
  }

  const handleRetrySelected = async () => {
    if (selectedTasks.size === 0) {
      toast({
        title: "No tasks selected",
        description: "Please select tasks to retry",
        variant: "destructive",
      })
      return
    }

    setRetrying(true)
    try {
      const response = await fetch("/api/tasks/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_ids: Array.from(selectedTasks) }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to retry tasks")

      toast({
        title: "Tasks retried",
        description: `${data.count} task(s) have been reset to pending status`,
      })

      setSelectedTasks(new Set())
      mutate()
    } catch (error: any) {
      console.error("[v0] Error retrying tasks:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to retry tasks",
        variant: "destructive",
      })
    } finally {
      setRetrying(false)
    }
  }

  const handleStopRunning = async () => {
    if (!confirm("Are you sure you want to stop all running tasks?")) return

    setStopping(true)
    try {
      const response = await fetch("/api/tasks/stop-running", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to stop tasks")

      toast({
        title: "Tasks stopped",
        description: data.message || "Running tasks have been stopped",
      })

      mutate()
    } catch (error: any) {
      console.error("[v0] Error stopping tasks:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to stop tasks",
        variant: "destructive",
      })
    } finally {
      setStopping(false)
    }
  }

  const handleToggleAll = () => {
    if (!tasks) return

    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)))
    }
  }

  const handleToggleTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks)
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId)
    } else {
      newSelected.add(taskId)
    }
    setSelectedTasks(newSelected)
  }

  const tasks = data?.tasks as
    | (AutomationTask & {
        profile_name?: string
        folder_name?: string
        user_email?: string
        gmail_status?: string
        gmail_status_checked_at?: string
        gmail_status_message?: string
      })[]
    | undefined
  const isAdmin = data?.isAdmin || false

  const hasRunningTasks = tasks?.some((t) => t.status === "running")

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by profile name or folder..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-transparent">
              <Calendar className="mr-2 h-4 w-4" />
              {dateFrom ? (
                dateTo ? (
                  <>
                    {format(dateFrom, "MMM dd")} - {format(dateTo, "MMM dd")}
                  </>
                ) : (
                  format(dateFrom, "MMM dd, yyyy")
                )
              ) : (
                <span>Filter by date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-2">
              <div className="text-sm font-medium">From Date</div>
              <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} />
              <div className="text-sm font-medium mt-2">To Date</div>
              <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} />
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDateFrom(undefined)
                    setDateTo(undefined)
                  }}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            All
          </Button>
          <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>
            Pending
          </Button>
          <Button variant={filter === "running" ? "default" : "outline"} size="sm" onClick={() => setFilter("running")}>
            Running
          </Button>
          <Button
            variant={filter === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("completed")}
          >
            Completed
          </Button>
          <Button variant={filter === "failed" ? "default" : "outline"} size="sm" onClick={() => setFilter("failed")}>
            Failed
          </Button>
        </div>

        <div className="flex gap-2">
          {selectedTasks.size > 0 && (
            <Button size="sm" onClick={handleRetrySelected} disabled={retrying}>
              {retrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry Selected ({selectedTasks.size})
                </>
              )}
            </Button>
          )}
          {hasRunningTasks && (
            <Button size="sm" variant="destructive" onClick={handleStopRunning} disabled={stopping}>
              {stopping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Running Tasks
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={tasks && tasks.length > 0 && selectedTasks.size === tasks.length}
                  onCheckedChange={handleToggleAll}
                />
              </TableHead>
              <TableHead>Task Type</TableHead>
              <TableHead>Profile Name</TableHead>
              <TableHead>Folder</TableHead>
              {isAdmin && <TableHead>User</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Gmail Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground">
                  Loading tasks...
                </TableCell>
              </TableRow>
            ) : tasks && tasks.length > 0 ? (
              tasks.map((task) => {
                const gmailStatus = task.gmail_status || "unknown"
                const statusConfig =
                  gmailStatusConfig[gmailStatus as keyof typeof gmailStatusConfig] || gmailStatusConfig.unknown
                const StatusIcon = statusConfig.icon

                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={() => handleToggleTask(task.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{task.task_type}</TableCell>
                    <TableCell className="text-muted-foreground">{task.profile_name || "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{task.folder_name || "-"}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-muted-foreground text-sm">{task.user_email || "-"}</TableCell>
                    )}
                    <TableCell>
                      <Badge className={statusColors[task.status]}>{task.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {task.status === "completed" && task.gmail_status ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                          </div>
                          {task.gmail_status_checked_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(task.gmail_status_checked_at).toLocaleString()}
                            </div>
                          )}
                          {task.gmail_status_message && (
                            <div
                              className="text-xs text-muted-foreground max-w-[200px] truncate"
                              title={task.gmail_status_message}
                            >
                              {task.gmail_status_message}
                            </div>
                          )}
                        </div>
                      ) : task.status === "completed" ? (
                        <span className="text-sm text-muted-foreground">Not checked</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{task.scheduled_at ? new Date(task.scheduled_at).toLocaleString() : "-"}</TableCell>
                    <TableCell>
                      {task.started_at && task.completed_at
                        ? `${Math.round((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 1000)}s`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {task.status === "failed" && task.error_message && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={task.error_message}
                            onClick={() => {
                              console.log("[v0] Task error details:", {
                                taskId: task.id,
                                taskType: task.task_type,
                                profileName: task.profile_name,
                                error: task.error_message,
                                scheduledAt: task.scheduled_at,
                                startedAt: task.started_at,
                                completedAt: task.completed_at,
                              })
                              alert(`Error: ${task.error_message}`)
                            }}
                          >
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground">
                  No tasks found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
