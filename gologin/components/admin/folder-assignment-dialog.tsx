"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface FolderAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { id: string; email: string }
  onSuccess: () => void
}

export function FolderAssignmentDialog({ open, onOpenChange, user, onSuccess }: FolderAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolders, setSelectedFolders] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      fetchFolders()
      fetchAssignments()
    }
  }, [open, user.id])

  const fetchFolders = async () => {
    try {
      const response = await fetch("/api/folders")
      if (!response.ok) throw new Error("Failed to fetch folders")
      const data = await response.json()
      setFolders(data.folders)
    } catch (error) {
      console.error("[v0] Error fetching folders:", error)
    }
  }

  const fetchAssignments = async () => {
    try {
      const response = await fetch(`/api/admin/folder-assignments?userId=${user.id}`)
      if (!response.ok) throw new Error("Failed to fetch assignments")
      const data = await response.json()
      setSelectedFolders(data.assignments.map((a: any) => a.folder_name))
    } catch (error) {
      console.error("[v0] Error fetching assignments:", error)
    }
  }

  const handleToggleFolder = (folder: string) => {
    setSelectedFolders((prev) => (prev.includes(folder) ? prev.filter((f) => f !== folder) : [...prev, folder]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/admin/folder-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          folderNames: selectedFolders,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update folder assignments")
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error updating folder assignments:", error)
      alert(`Failed to update folder assignments: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Folder Access</DialogTitle>
          <DialogDescription>Select which folders {user.email} can access</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ScrollArea className="h-[300px] rounded-md border p-4">
            <div className="space-y-3">
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <div key={folder} className="flex items-center space-x-2">
                    <Checkbox
                      id={folder}
                      checked={selectedFolders.includes(folder)}
                      onCheckedChange={() => handleToggleFolder(folder)}
                    />
                    <Label htmlFor={folder} className="cursor-pointer">
                      📁 {folder}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No folders found</p>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>{selectedFolders.length} folder(s) selected</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
