"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Loader2 } from "lucide-react"

export function QueueProcessor() {
  const [processing, setProcessing] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [autoProcess, setAutoProcess] = useState(false)

  const handleProcess = async () => {
    const key = apiKey || localStorage.getItem("gologin_api_key")

    if (!key) {
      alert("Please enter your GoLogin API key in Settings first")
      return
    }

    setProcessing(true)

    try {
      const response = await fetch("/api/queue/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gologin_api_key: key }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to process queue")

      alert("Queue processed successfully!")
    } catch (error: any) {
      console.error("[v0] Error processing queue:", error)
      alert(error.message || "Failed to process queue")
    } finally {
      setProcessing(false)
    }
  }

  const startAutoProcess = () => {
    setAutoProcess(true)
    const interval = setInterval(() => {
      handleProcess()
    }, 60000) // Process every minute

    // Store interval ID to clear later
    ;(window as any).queueInterval = interval
  }

  const stopAutoProcess = () => {
    setAutoProcess(false)
    if ((window as any).queueInterval) {
      clearInterval((window as any).queueInterval)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Queue Processor</CardTitle>
        <CardDescription>Process pending automation tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="queue_api_key">GoLogin API Key (optional)</Label>
          <Input
            id="queue_api_key"
            type="password"
            placeholder="Uses saved key from Settings if empty"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleProcess} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process Queue Now
              </>
            )}
          </Button>

          {!autoProcess ? (
            <Button variant="outline" onClick={startAutoProcess}>
              Start Auto-Process (1 min)
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopAutoProcess}>
              Stop Auto-Process
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The queue processor will execute all pending tasks in order of priority and scheduled time. Auto-process runs
          every minute while enabled.
        </p>
      </CardContent>
    </Card>
  )
}
