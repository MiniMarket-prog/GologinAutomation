"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Loader2, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface QueueProcessorProps {
  onProcessComplete?: () => void
}

export function QueueProcessor({ onProcessComplete }: QueueProcessorProps) {
  const [processing, setProcessing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [autoProcess, setAutoProcess] = useState(false)
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(1)
  const { toast } = useToast()

  const handleProcess = async () => {
    setProcessing(true)

    try {
      const response = await fetch("/api/queue/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxConcurrentTasks }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to process queue")

      toast({
        title: "Queue processed",
        description: `Processed tasks with ${maxConcurrentTasks} concurrent window${maxConcurrentTasks > 1 ? "s" : ""}.`,
      })

      if (onProcessComplete) {
        onProcessComplete()
      }
    } catch (error: any) {
      console.error("[v0] Error processing queue:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process queue",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleClearPending = async () => {
    if (!confirm("Are you sure you want to clear all pending tasks? This action cannot be undone.")) {
      return
    }

    setClearing(true)

    try {
      const response = await fetch("/api/tasks/clear-pending", {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || "Failed to clear pending tasks")

      toast({
        title: "Pending tasks cleared",
        description: data.message || "All pending tasks have been removed.",
      })

      // Trigger a page refresh to update the task list
      window.location.reload()
    } catch (error: any) {
      console.error("[v0] Error clearing pending tasks:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to clear pending tasks",
        variant: "destructive",
      })
    } finally {
      setClearing(false)
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
        <CardDescription>Process pending automation tasks using your saved API key</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="concurrency">Concurrent Windows</Label>
          <Input
            id="concurrency"
            type="number"
            min={1}
            max={10}
            value={maxConcurrentTasks}
            onChange={(e) => setMaxConcurrentTasks(Math.max(1, Math.min(10, Number.parseInt(e.target.value) || 1)))}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Number of browser windows to open simultaneously (1-10). Higher numbers process tasks faster but use more
            resources.
          </p>
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

          <Button variant="outline" onClick={handleClearPending} disabled={clearing} className="ml-auto bg-transparent">
            {clearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Pending Tasks
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          The queue processor will execute pending tasks with the specified concurrency. Auto-process runs every minute
          while enabled. Make sure you've saved your GoLogin API key in Settings.
        </p>
      </CardContent>
    </Card>
  )
}
