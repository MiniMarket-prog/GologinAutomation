"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Loader2, Trash2, Pause } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

interface QueueProcessorProps {
  onProcessComplete?: () => void
}

export function QueueProcessor({ onProcessComplete }: QueueProcessorProps) {
  const [processing, setProcessing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [autoProcess, setAutoProcess] = useState(false)
  const [maxConcurrentTasks, setMaxConcurrentTasks] = useState(1)
  const [totalProcessed, setTotalProcessed] = useState(0)
  const [currentBatch, setCurrentBatch] = useState(0)
  const [shouldStop, setShouldStop] = useState(false)
  const { toast } = useToast()

  const handleProcess = async () => {
    setProcessing(true)
    setShouldStop(false)
    setTotalProcessed(0)
    setCurrentBatch(0)

    try {
      let batchNumber = 0
      let hasMore = true
      let totalProcessedCount = 0

      while (hasMore && !shouldStop) {
        batchNumber++
        setCurrentBatch(batchNumber)

        const response = await fetch("/api/queue/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxConcurrentTasks,
            maxTasksPerBatch: 10, // Process 10 tasks per batch
          }),
        })

        const data = await response.json()

        if (!response.ok) throw new Error(data.error || "Failed to process queue")

        totalProcessedCount += data.processedCount
        setTotalProcessed(totalProcessedCount)
        hasMore = data.hasMore

        console.log(
          `[v0] Batch ${batchNumber} complete: ${data.processedCount} processed, ${data.remainingCount} remaining`,
        )

        if (hasMore && !shouldStop) {
          toast({
            title: `Batch ${batchNumber} complete`,
            description: `Processed ${data.processedCount} tasks. ${data.remainingCount} remaining...`,
          })
        }
      }

      if (shouldStop) {
        toast({
          title: "Processing stopped",
          description: `Processed ${totalProcessedCount} tasks across ${batchNumber} batches before stopping.`,
        })
      } else {
        toast({
          title: "All tasks completed",
          description: `Successfully processed ${totalProcessedCount} tasks across ${batchNumber} batch${batchNumber > 1 ? "es" : ""}.`,
        })
      }

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
      setShouldStop(false)
      setCurrentBatch(0)
    }
  }

  const handleStop = () => {
    setShouldStop(true)
    toast({
      title: "Stopping...",
      description: "Will stop after current batch completes",
    })
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
    }, 60000)
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
        <CardDescription>Process pending automation tasks in batches (10 tasks per batch)</CardDescription>
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
            disabled={processing}
          />
          <p className="text-xs text-muted-foreground">
            Number of browser windows to open simultaneously (1-10). Higher numbers process tasks faster but use more
            resources.
          </p>
        </div>

        {processing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing batch {currentBatch}...</span>
              <span>{totalProcessed} tasks completed</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        <div className="flex gap-2">
          {!processing ? (
            <Button onClick={handleProcess}>
              <Play className="mr-2 h-4 w-4" />
              Process Queue
            </Button>
          ) : (
            <Button onClick={handleStop} variant="destructive">
              <Pause className="mr-2 h-4 w-4" />
              Stop After Current Batch
            </Button>
          )}

          {!autoProcess ? (
            <Button variant="outline" onClick={startAutoProcess} disabled={processing}>
              Start Auto-Process (1 min)
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopAutoProcess}>
              Stop Auto-Process
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleClearPending}
            disabled={clearing || processing}
            className="ml-auto bg-transparent"
          >
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
          The queue processes tasks in batches of 10. Each batch takes 2-5 minutes depending on task complexity. The
          system automatically processes all pending tasks without timeout issues, regardless of how many profiles you
          have.
        </p>
      </CardContent>
    </Card>
  )
}
