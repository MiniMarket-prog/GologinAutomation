"use client"

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
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SyncProfilesDialogProps {
  onSuccess?: () => void
}

export function SyncProfilesDialog({ onSuccess }: SyncProfilesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSync = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/profiles/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to sync profiles")

      toast({
        title: "Profiles synced",
        description: data.message,
      })
      setOpen(false)
      onSuccess?.()
    } catch (error: any) {
      console.error("[v0] Error syncing profiles:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to sync profiles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync from GoLogin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Profiles from GoLogin</DialogTitle>
          <DialogDescription>
            Import all your GoLogin profiles automatically. This will only add new profiles and won't affect existing
            ones. Make sure you've saved your API key in Settings first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSync} disabled={loading}>
            {loading ? "Syncing..." : "Sync Profiles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
