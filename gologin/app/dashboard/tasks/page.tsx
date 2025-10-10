"use client"

import { TaskList } from "@/components/tasks/task-list"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { BulkTaskDialog } from "@/components/tasks/bulk-task-dialog"
import { QueueProcessor } from "@/components/queue/queue-processor"
import { useState, useCallback } from "react"

export default function TasksPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleProcessComplete = useCallback(() => {
    // Force refresh by updating key
    setRefreshKey((prev) => prev + 1)

    // Also trigger a global event that profile components can listen to
    window.dispatchEvent(new CustomEvent("profiles-refresh"))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage automation tasks</p>
        </div>
        <div className="flex gap-2">
          <BulkTaskDialog />
          <CreateTaskDialog />
        </div>
      </div>

      <QueueProcessor onProcessComplete={handleProcessComplete} />

      <TaskList key={refreshKey} />
    </div>
  )
}
