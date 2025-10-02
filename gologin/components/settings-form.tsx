"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function SettingsForm() {
  const [apiKey, setApiKey] = useState("")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem("gologin_api_key", apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
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
          This key is stored locally in your browser and used to connect to GoLogin profiles
        </p>
      </div>
      <Button onClick={handleSave}>{saved ? "Saved!" : "Save Settings"}</Button>
    </div>
  )
}
