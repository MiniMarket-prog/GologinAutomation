"use client"

import type React from "react"

import { useState } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface AddProfileDialogProps {
  onSuccess?: () => void
}

export function AddProfileDialog({ onSuccess }: AddProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    profile_id: "",
    profile_name: "",
    gmail_email: "",
    gmail_password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to create profile")

      setOpen(false)
      setFormData({ profile_id: "", profile_name: "", gmail_email: "", gmail_password: "" })
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error creating profile:", error)
      alert("Failed to create profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Profile</DialogTitle>
            <DialogDescription>Add a GoLogin profile to your automation system.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile_id">GoLogin Profile ID</Label>
              <Input
                id="profile_id"
                value={formData.profile_id}
                onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_name">Profile Name</Label>
              <Input
                id="profile_name"
                value={formData.profile_name}
                onChange={(e) => setFormData({ ...formData, profile_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmail_email">Gmail Email</Label>
              <Input
                id="gmail_email"
                type="email"
                value={formData.gmail_email}
                onChange={(e) => setFormData({ ...formData, gmail_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gmail_password">Gmail Password</Label>
              <Input
                id="gmail_password"
                type="password"
                value={formData.gmail_password}
                onChange={(e) => setFormData({ ...formData, gmail_password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
