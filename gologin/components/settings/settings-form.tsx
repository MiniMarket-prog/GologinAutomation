"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function SettingsForm() {
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings?key=gologin_api_key")

        if (response.ok) {
          const data = await response.json()
          setApiKey(data.value || "")
        }
      } catch (error) {
        console.error("Error loading settings:", error)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!apiKey || apiKey.trim() === "") {
      toast({
        title: "Error",
        description: "Please enter an API key before saving.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        key: "gologin_api_key",
        value: apiKey,
      }

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Failed to save settings")
      }

      toast({
        title: "Settings saved",
        description: "Your GoLogin API key has been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading settings...</div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="api_key">GoLogin API Key</Label>
        <Input
          id="api_key"
          type="password"
          placeholder="Enter your GoLogin API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          This key is stored securely in the database and used to connect to GoLogin profiles
        </p>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}
