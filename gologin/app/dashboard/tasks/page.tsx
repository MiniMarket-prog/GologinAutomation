import { TaskList } from "@/components/tasks/task-list"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"
import { BulkTaskDialog } from "@/components/tasks/bulk-task-dialog"
import { QueueProcessor } from "@/components/queue/queue-processor"

export default function TasksPage() {
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

      <QueueProcessor />

      <TaskList />
    </div>
  )
}
