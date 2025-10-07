"use client"

import type React from "react"

import { useState, useMemo } from "react"
import { useProfiles } from "@/lib/hooks/use-profiles"
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
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Layers, Folder } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

export function BulkTaskDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { profiles } = useProfiles(1, 1000)
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([])
  const [taskType, setTaskType] = useState("check_inbox")
  const [actionCount, setActionCount] = useState(1)
  const [replyConfig, setReplyConfig] = useState({
    searchFrom: "",
    replyMessage: "",
  })
  const [reportSearchQuery, setReportSearchQuery] = useState("")
  const [loginDuration, setLoginDuration] = useState({ min: 10, max: 30 })
  const [useRandomDuration, setUseRandomDuration] = useState(true)
  const [sequentialMode, setSequentialMode] = useState(false)
  const [waitForManualClose, setWaitForManualClose] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>("all")

  const supportsMultipleActions = ["star_email", "read_email", "delete_email", "reply_to_email"].includes(taskType)

  const folders = useMemo(() => {
    if (!profiles) return []
    const uniqueFolders = new Set(profiles.map((p) => p.folder_name || "No Folder"))
    return Array.from(uniqueFolders).sort()
  }, [profiles])

  const filteredProfiles = useMemo(() => {
    if (!profiles) return []
    if (selectedFolder === "all") return profiles
    return profiles.filter((p) => (p.folder_name || "No Folder") === selectedFolder)
  }, [profiles, selectedFolder])

  const handleToggleProfile = (profileId: string) => {
    setSelectedProfiles((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    )
  }

  const handleSelectAll = () => {
    if (selectedProfiles.length === filteredProfiles?.length) {
      setSelectedProfiles([])
    } else {
      setSelectedProfiles(filteredProfiles?.map((p) => p.id) || [])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let config: any = {}

      if (supportsMultipleActions) {
        config.count = actionCount
      }

      if (taskType === "login") {
        if (waitForManualClose) {
          config.duration = -1 // -1 means wait for manual close
          config.waitForManualClose = true
        } else if (useRandomDuration) {
          config.minDuration = loginDuration.min
          config.maxDuration = loginDuration.max
        } else {
          config.duration = loginDuration.min
        }
      }

      if (taskType === "reply_to_email") {
        config = {
          ...config,
          searchFrom: replyConfig.searchFrom,
          replyMessage: replyConfig.replyMessage,
        }
      }

      if (taskType === "report_to_inbox") {
        config = {
          ...config,
          search_query: reportSearchQuery,
        }
      }

      console.log("[v0] Creating bulk tasks with:", {
        profile_ids: selectedProfiles,
        task_type: taskType,
        config,
        sequential: sequentialMode,
      })

      const response = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: selectedProfiles,
          task_type: taskType,
          config,
          sequential: sequentialMode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] Bulk task creation failed:", data)
        throw new Error(data.error || "Failed to create bulk tasks")
      }

      alert(`Created ${data.count} tasks successfully!`)
      setOpen(false)
      setSelectedProfiles([])
      setActionCount(1)
      setReplyConfig({ searchFrom: "", replyMessage: "" })
      setReportSearchQuery("")
      setLoginDuration({ min: 10, max: 30 })
      setUseRandomDuration(true)
      setSequentialMode(false)
      setWaitForManualClose(false)
    } catch (error) {
      console.error("[v0] Error creating bulk tasks:", error)
      alert(`Failed to create bulk tasks: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Layers className="mr-2 h-4 w-4" />
          Bulk Create
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Bulk Tasks</DialogTitle>
            <DialogDescription>Create the same task for multiple profiles at once</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type</Label>
              <select
                id="task_type"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="login">Login to Gmail</option>
                <option value="check_gmail_status">Check Gmail Status</option>
                <option value="check_inbox">Check Inbox</option>
                <option value="read_email">Read Email</option>
                <option value="star_email">Star Email</option>
                <option value="reply_to_email">Reply to Email from Sender</option>
                <option value="report_to_inbox">Report to Inbox (from Spam)</option>
              </select>
            </div>

            {taskType === "login" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="wait_for_manual_close"
                      checked={waitForManualClose}
                      onCheckedChange={(checked) => setWaitForManualClose(checked as boolean)}
                    />
                    <Label htmlFor="wait_for_manual_close" className="font-normal">
                      Keep open until manually closed
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Profile will stay open indefinitely. Close the browser window manually to move to the next profile
                    (works best with sequential mode).
                  </p>
                </div>

                {!waitForManualClose && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="use_random_duration"
                          checked={useRandomDuration}
                          onCheckedChange={(checked) => setUseRandomDuration(checked as boolean)}
                        />
                        <Label htmlFor="use_random_duration" className="font-normal">
                          Use random duration (recommended)
                        </Label>
                      </div>
                    </div>

                    {useRandomDuration ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="min_duration">Min Duration (seconds)</Label>
                          <Input
                            id="min_duration"
                            type="number"
                            min="5"
                            max="300"
                            value={loginDuration.min}
                            onChange={(e) =>
                              setLoginDuration({ ...loginDuration, min: Number.parseInt(e.target.value) || 5 })
                            }
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="max_duration">Max Duration (seconds)</Label>
                          <Input
                            id="max_duration"
                            type="number"
                            min="5"
                            max="300"
                            value={loginDuration.max}
                            onChange={(e) =>
                              setLoginDuration({ ...loginDuration, max: Number.parseInt(e.target.value) || 30 })
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="fixed_duration">Duration (seconds)</Label>
                        <Input
                          id="fixed_duration"
                          type="number"
                          min="5"
                          max="300"
                          value={loginDuration.min}
                          onChange={(e) =>
                            setLoginDuration({ ...loginDuration, min: Number.parseInt(e.target.value) || 10 })
                          }
                          className="w-full"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      How long to keep each profile open before closing automatically
                    </p>
                  </>
                )}
              </>
            )}

            {supportsMultipleActions && (
              <div className="space-y-2">
                <Label htmlFor="bulk_action_count">Number of Actions</Label>
                <Input
                  id="bulk_action_count"
                  type="number"
                  min="1"
                  max="50"
                  value={actionCount}
                  onChange={(e) => setActionCount(Number.parseInt(e.target.value) || 1)}
                  placeholder="How many emails to process"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {taskType === "star_email" && "Number of emails to star per profile (starting from the top)"}
                  {taskType === "read_email" && "Number of emails to read per profile (starting from the top)"}
                  {taskType === "delete_email" && "Number of emails to delete per profile (starting from the top)"}
                  {taskType === "reply_to_email" &&
                    "Number of emails to reply to from this sender per profile (starting from the most recent)"}
                </p>
              </div>
            )}

            {taskType === "reply_to_email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bulk_search_from">Search From Email</Label>
                  <Input
                    id="bulk_search_from"
                    type="email"
                    value={replyConfig.searchFrom}
                    onChange={(e) => setReplyConfig({ ...replyConfig, searchFrom: e.target.value })}
                    placeholder="sender@example.com"
                    className="w-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The app will search for emails from this sender and reply to them
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulk_reply_message">Reply Message</Label>
                  <Textarea
                    id="bulk_reply_message"
                    value={replyConfig.replyMessage}
                    onChange={(e) => setReplyConfig({ ...replyConfig, replyMessage: e.target.value })}
                    placeholder="Your reply message..."
                    className="w-full min-h-24"
                    required
                  />
                  <p className="text-xs text-muted-foreground">This message will be sent as a reply</p>
                </div>
              </>
            )}

            {taskType === "report_to_inbox" && (
              <div className="space-y-2">
                <Label htmlFor="bulk_report_search_query">Search Query</Label>
                <Input
                  id="bulk_report_search_query"
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="e.g., from:sender@example.com OR subject:Important"
                  className="w-full"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter a search query to find the email in spam. Use Gmail search syntax like "from:sender@example.com"
                  or "subject:keyword". The first matching email will be reported as "not spam" and moved to inbox.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sequential_mode"
                  checked={sequentialMode}
                  onCheckedChange={(checked) => setSequentialMode(checked as boolean)}
                />
                <Label htmlFor="sequential_mode" className="font-normal">
                  Open profiles sequentially (one at a time)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, profiles will open one after another instead of all at once.
                {taskType === "login" && waitForManualClose
                  ? " Each profile will wait for you to close it before opening the next one."
                  : " Each profile will complete before the next one starts."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder_filter">
                <Folder className="inline-block mr-2 h-4 w-4" />
                Filter by Folder
              </Label>
              <select
                id="folder_filter"
                value={selectedFolder}
                onChange={(e) => {
                  setSelectedFolder(e.target.value)
                  setSelectedProfiles([]) // Clear selection when changing folder
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Folders ({profiles?.length || 0} profiles)</option>
                {folders.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder} ({profiles?.filter((p) => (p.folder_name || "No Folder") === folder).length || 0} profiles)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Filter profiles by folder to easily select profiles from specific teams or groups
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Profiles ({selectedProfiles.length} selected)</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
                  {selectedProfiles.length === filteredProfiles?.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-input p-4">
                {filteredProfiles?.map((profile) => (
                  <div key={profile.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={profile.id}
                      checked={selectedProfiles.includes(profile.id)}
                      onCheckedChange={() => handleToggleProfile(profile.id)}
                    />
                    <label
                      htmlFor={profile.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {profile.profile_name} {profile.gmail_email && `(${profile.gmail_email})`}
                      {profile.folder_name && (
                        <span className="ml-2 text-xs text-muted-foreground">({profile.folder_name})</span>
                      )}
                    </label>
                  </div>
                ))}
                {filteredProfiles?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No profiles in this folder</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || selectedProfiles.length === 0}>
              {loading ? "Creating..." : `Create ${selectedProfiles.length} Tasks`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
