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
  const [selectedStatus, setSelectedStatus] = useState<string>("all")

  const supportsMultipleActions = ["star_email", "read_email", "delete_email", "reply_to_email"].includes(taskType)

  const folders = useMemo(() => {
    if (!profiles) return []
    const uniqueFolders = new Set(profiles.map((p) => p.folder_name || "No Folder"))
    return Array.from(uniqueFolders).sort()
  }, [profiles])

  const statuses = useMemo(() => {
    if (!profiles) return []

    let profilesToCount = profiles
    if (selectedFolder !== "all") {
      profilesToCount = profiles.filter((p) => (p.folder_name || "No Folder") === selectedFolder)
    }

    const allPossibleStatuses = [
      "not_checked",
      "ok",
      "blocked",
      "password_required",
      "verification_required",
      "waiting_for_recovery_email",
      "error",
      "unknown",
    ]

    const statusCounts = new Map<string, number>()

    // Initialize all statuses with 0 count
    allPossibleStatuses.forEach((status) => {
      statusCounts.set(status, 0)
    })

    // Count actual profiles
    profilesToCount.forEach((p) => {
      const status = p.gmail_status === null ? "not_checked" : p.gmail_status || "unknown"
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
    })

    return allPossibleStatuses
      .map((status) => ({ status, count: statusCounts.get(status) || 0 }))
      .sort((a, b) => {
        // Sort by count descending, then by status name
        if (b.count !== a.count) return b.count - a.count
        return a.status.localeCompare(b.status)
      })
  }, [profiles, selectedFolder])

  const filteredProfiles = useMemo(() => {
    if (!profiles) return []
    let filtered = profiles

    if (selectedFolder !== "all") {
      filtered = filtered.filter((p) => (p.folder_name || "No Folder") === selectedFolder)
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((p) => {
        const profileStatus = p.gmail_status === null ? "not_checked" : p.gmail_status || "unknown"
        return profileStatus === selectedStatus
      })
    }

    return filtered
  }, [profiles, selectedFolder, selectedStatus])

  const handleToggleProfile = (profileId: string) => {
    if (!profileId) {
      console.error("[v0] Attempted to toggle profile with null/undefined ID")
      return
    }
    setSelectedProfiles((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId],
    )
  }

  const handleSelectAll = () => {
    if (selectedProfiles.length === filteredProfiles?.length) {
      setSelectedProfiles([])
    } else {
      const validProfileIds = filteredProfiles?.map((p) => p.profile_id).filter((id) => id != null) || []
      const uniqueProfileIds = Array.from(new Set(validProfileIds))
      setSelectedProfiles(uniqueProfileIds)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validProfileIds = Array.from(new Set(selectedProfiles.filter((id) => id != null)))

    if (validProfileIds.length === 0) {
      alert("Please select at least one valid profile")
      return
    }

    if (validProfileIds.length !== selectedProfiles.length) {
      console.warn("[v0] Removed duplicate or null profile IDs from selection")
    }

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
        profile_ids: validProfileIds,
        task_type: taskType,
        config,
        sequential: sequentialMode,
      })

      const response = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: validProfileIds,
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

  const getStatusLabel = (status: string | null | undefined) => {
    if (status === null || status === undefined || status === "not_checked") {
      return "Not Checked"
    }
    const labels: Record<string, string> = {
      ok: "OK",
      blocked: "Blocked",
      password_required: "Password Required",
      verification_required: "Verification Required",
      error: "Error",
      unknown: "Unknown",
      waiting_for_recovery_email: "Waiting for Recovery Email",
    }
    return labels[status] || status
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
                  setSelectedProfiles([])
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Folders ({profiles?.length || 0} profiles)</option>
                {folders.map((folder) => (
                  <option key={folder || "no-folder"} value={folder}>
                    {folder} ({profiles?.filter((p) => (p.folder_name || "No Folder") === folder).length || 0} profiles)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Filter profiles by folder to easily select profiles from specific teams or groups
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_filter">Filter by Status</Label>
              <select
                id="status_filter"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value)
                  setSelectedProfiles([])
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Statuses ({profiles?.length || 0} profiles)</option>
                {statuses.map(({ status, count }) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)} ({count} profiles)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Filter profiles by their Gmail account status (ok, blocked, etc.)
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
                  <div
                    key={profile.profile_id || `profile-${profile.profile_name}`}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={profile.profile_id ?? undefined}
                      checked={profile.profile_id ? selectedProfiles.includes(profile.profile_id) : false}
                      onCheckedChange={() => profile.profile_id && handleToggleProfile(profile.profile_id)}
                      disabled={!profile.profile_id}
                    />
                    <label
                      htmlFor={profile.profile_id ?? undefined}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {profile.profile_name} {profile.gmail_email && `(${profile.gmail_email})`}
                      {profile.folder_name && (
                        <span className="ml-2 text-xs text-muted-foreground">({profile.folder_name})</span>
                      )}
                      <span
                        className={`ml-2 text-xs ${
                          profile.gmail_status === "ok"
                            ? "text-green-600"
                            : profile.gmail_status === "blocked"
                              ? "text-red-600"
                              : profile.gmail_status === "error"
                                ? "text-red-600"
                                : profile.gmail_status === null
                                  ? "text-gray-500"
                                  : "text-yellow-600"
                        }`}
                      >
                        [{getStatusLabel(profile.gmail_status)}]
                      </span>
                      {!profile.profile_id && <span className="ml-2 text-xs text-red-500">(Invalid - No ID)</span>}
                    </label>
                  </div>
                ))}
                {filteredProfiles?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No profiles match the selected filters
                  </p>
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
