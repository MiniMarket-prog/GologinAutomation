"use client"

import type React from "react"

import { useState } from "react"
import { useProfiles } from "@/lib/hooks/use-profiles"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { profiles } = useProfiles(1, 1000)

  const [formData, setFormData] = useState({
    profile_id: "",
    task_type: "login",
    config: {},
  })

  const [actionCount, setActionCount] = useState(1)

  const supportsMultipleActions = ["star_email", "read_email", "delete_email"].includes(formData.task_type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const config = supportsMultipleActions ? { ...formData.config, count: actionCount } : formData.config

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          config,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create task")
      }

      setOpen(false)
      setFormData({ profile_id: "", task_type: "login", config: {} })
      setActionCount(1)

      window.location.reload()
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Automation Task</DialogTitle>
            <DialogDescription>Schedule a new automation task for a profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile">Profile</Label>
              <select
                id="profile"
                value={formData.profile_id}
                onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">Select a profile</option>
                {profiles?.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.profile_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type</Label>
              <select
                id="task_type"
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="login">Login to Gmail</option>
                <option value="check_inbox">Check Inbox</option>
                <option value="read_email">Read Email</option>
                <option value="star_email">Star Email</option>
                <option value="send_email">Send Email</option>
              </select>
            </div>

            {supportsMultipleActions && (
              <div className="space-y-2">
                <Label htmlFor="action_count">Number of Actions</Label>
                <Input
                  id="action_count"
                  type="number"
                  min="1"
                  max="50"
                  value={actionCount}
                  onChange={(e) => setActionCount(Number.parseInt(e.target.value) || 1)}
                  placeholder="How many emails to process"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.task_type === "star_email" && "Number of emails to star (starting from the top)"}
                  {formData.task_type === "read_email" && "Number of emails to read (starting from the top)"}
                  {formData.task_type === "delete_email" && "Number of emails to delete (starting from the top)"}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
