"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function SettingsForm() {
  const [apiKey, setApiKey] = useState("")
  const [mode, setMode] = useState<"cloud" | "local">("cloud")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isVercel, setIsVercel] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const envResponse = await fetch("/api/environment")
        const envData = await envResponse.json()
        setIsVercel(envData.isVercel)

        const [apiKeyResponse, modeResponse] = await Promise.all([
          fetch("/api/settings?key=gologin_api_key"),
          fetch("/api/settings?key=gologin_mode"),
        ])

        if (apiKeyResponse.ok) {
          const data = await apiKeyResponse.json()
          setApiKey(data.value || "")
        }

        if (modeResponse.ok) {
          const data = await modeResponse.json()
          const userMode = (data.value as "cloud" | "local") || "cloud"
          setMode(envData?.isVercel ? "cloud" : userMode)
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
      const [apiKeyResponse, modeResponse] = await Promise.all([
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "gologin_api_key",
            value: apiKey,
          }),
        }),
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: "gologin_mode",
            value: mode,
          }),
        }),
      ])

      if (!apiKeyResponse.ok || !modeResponse.ok) {
        const apiKeyData = await apiKeyResponse.json()
        const modeData = await modeResponse.json()
        throw new Error(apiKeyData.error || modeData.error || "Failed to save settings")
      }

      toast({
        title: "Settings saved",
        description: "Your GoLogin settings have been saved successfully.",
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
      {isVercel && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Running on Vercel - Cloud mode is automatically enabled. Local mode requires running the app on your own
            machine with GoLogin Desktop installed.
          </AlertDescription>
        </Alert>
      )}

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

      <div className="space-y-2">
        <Label htmlFor="mode">Connection Mode</Label>
        <Select value={mode} onValueChange={(value) => setMode(value as "cloud" | "local")} disabled={isVercel}>
          <SelectTrigger id="mode">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cloud">Cloud (Remote Browser)</SelectItem>
            <SelectItem value="local">Local (Desktop App)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isVercel
            ? "Cloud mode is required when running on Vercel. To use Local mode, run the app on your own machine."
            : mode === "cloud"
              ? "Browser runs on GoLogin's servers (no local installation needed)"
              : "Browser runs on your machine (requires GoLogin Desktop app installed and running)"}
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  )
}
