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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"

interface SyncProfilesDialogProps {
  onSuccess?: () => void
}

export function SyncProfilesDialog({ onSuccess }: SyncProfilesDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiKey, setApiKey] = useState("")

  const handleSync = async () => {
    if (!apiKey.trim()) {
      alert("Please enter your GoLogin API key")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/profiles/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gologin_api_key: apiKey }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to sync profiles")

      alert(data.message)
      setOpen(false)
      setApiKey("")
      onSuccess?.()
    } catch (error: any) {
      console.error("[v0] Error syncing profiles:", error)
      alert(error.message || "Failed to sync profiles")
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
            ones.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api_key">GoLogin API Key</Label>
            <Input
              id="api_key"
              type="password"
              placeholder="Enter your GoLogin API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">You can find your API key in your GoLogin account settings</p>
          </div>
        </div>
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
