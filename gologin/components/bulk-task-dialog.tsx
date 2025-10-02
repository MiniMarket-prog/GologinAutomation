"use client"

import type React from "react"

import { useState } from "react"
import { useProfiles } from "@/lib/use-profiles"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Layers } from "lucide-react"

export function BulkTaskDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { profiles } = useProfiles(1, 1000)
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
  const [taskType, setTaskType] = useState("check_inbox")

  const handleToggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    )
  }

  const handleSelectAll = () => {
    if (selectedProfiles.length === profiles?.length) {
      setSelectedProfiles([])
    } else {
      setSelectedProfiles(profiles?.map((p) => p.id) || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: selectedProfiles,
          task_type: taskType,
          config: {},
        }),
      })

      if (!response.ok) throw new Error("Failed to create bulk tasks")

      const data = await response.json()
      alert(`Created ${data.count} tasks successfully!`)
      setOpen(false)
      setSelectedProfiles([])
    } catch (error) {
      console.error("[v0] Error creating bulk tasks:", error)
      alert("Failed to create bulk tasks")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Layers className="mr-2 h-4 w-4" />
          Bulk Create
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Bulk Tasks</DialogTitle>
            <DialogDescription>Create the same task for multiple profiles at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type</Label>
              <select
                id="task_type"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="login">Login to Gmail</option>
                <option value="check_inbox">Check Inbox</option>
                <option value="read_email">Read Email</option>
                <option value="star_email">Star Email</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Profiles ({selectedProfiles.length} selected)</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedProfiles.length === profiles?.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-input p-4">
                {profiles?.map((profile) => (
                  <div key={profile.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={profile.id}
                      checked={selectedProfiles.includes(profile.id)}
                      onCheckedChange={() => handleToggleProfile(profile.id)}
                    />
                    <label
                      htmlFor={profile.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {profile.profile_name} {profile.gmail_email && `(${profile.gmail_email})`}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedProfiles.length === 0}>
              {loading ? "Creating..." : `Create ${selectedProfiles.length} Tasks`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
