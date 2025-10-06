"use client"

import { useState } from "react"
import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, AlertCircle, Search } from "lucide-react"
import type { AutomationTask } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusColors = {
  pending: "bg-yellow-500",
  running: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
}

export function TaskList() {
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  const buildUrl = () => {
    const params = new URLSearchParams()
    if (filter !== "all") params.append("status", filter)
    params.append("limit", "100")
    if (search) params.append("search", search)
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

  const tasks = data?.tasks as (AutomationTask & { profile_name?: string; folder_name?: string })[] | undefined

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
      </div>

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Type</TableHead>
              <TableHead>Profile Name</TableHead>
              <TableHead>Folder</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading tasks...
                </TableCell>
              </TableRow>
            ) : tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.task_type}</TableCell>
                  <TableCell className="text-muted-foreground">{task.profile_name || "Unknown"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{task.folder_name || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[task.status]}>{task.status}</Badge>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
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
