"use client"

import type React from "react"

import { useState } from "react"
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
import { Plus, Search, Check } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function CreateTaskDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileSearch, setProfileSearch] = useState("")
  const [showProfileList, setShowProfileList] = useState(false)
  const { profiles } = useProfiles(1, 1000, undefined, profileSearch)

  const [formData, setFormData] = useState<{
    profile_id: string
    task_type: string
    config: Record<string, any>
  }>({
    profile_id: "",
    task_type: "login",
    config: {},
  })

  const selectedProfile = profiles?.find((p) => p.id === formData.profile_id)

  const [actionCount, setActionCount] = useState(1)
  const [loginDuration, setLoginDuration] = useState(10)
  const [replyConfig, setReplyConfig] = useState({
    searchFrom: "",
    replyMessage: "",
  })
  const [reportSearchQuery, setReportSearchQuery] = useState("")

  const supportsMultipleActions = ["star_email", "read_email", "delete_email", "reply_to_email"].includes(
    formData.task_type,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let config = { ...formData.config }

      if (supportsMultipleActions) {
        config.count = actionCount
      }

      if (formData.task_type === "login") {
        config.duration = loginDuration
      }

      if (formData.task_type === "reply_to_email") {
        config = {
          ...config,
          searchFrom: replyConfig.searchFrom,
          replyMessage: replyConfig.replyMessage,
        }
      }

      if (formData.task_type === "report_to_inbox") {
        config = {
          ...config,
          search_query: reportSearchQuery,
        }
      }

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          config,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create task")
      }

      setOpen(false)
      setFormData({ profile_id: "", task_type: "login", config: {} })
      setActionCount(1)
      setLoginDuration(10)
      setReplyConfig({ searchFrom: "", replyMessage: "" })
      setReportSearchQuery("")

      window.location.reload()
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      alert(`Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Automation Task</DialogTitle>
            <DialogDescription>Schedule a new automation task for a profile</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile">Profile</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by profile name or folder..."
                    value={profileSearch}
                    onChange={(e) => {
                      setProfileSearch(e.target.value)
                      setShowProfileList(true)
                    }}
                    onFocus={() => setShowProfileList(true)}
                    className="pl-9"
                  />
                </div>
                {selectedProfile && !showProfileList && (
                  <div className="mt-2 rounded-md border border-input bg-muted px-3 py-2 text-sm">
                    <span className="font-medium">{selectedProfile.profile_name}</span>
                    {selectedProfile.folder_name && selectedProfile.folder_name !== "No Folder" && (
                      <span className="text-muted-foreground"> ({selectedProfile.folder_name})</span>
                    )}
                  </div>
                )}
                {showProfileList && profiles && profiles.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
                    {profiles.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, profile_id: profile.id })
                          setShowProfileList(false)
                          setProfileSearch("")
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                          formData.profile_id === profile.id && "bg-accent",
                        )}
                      >
                        {formData.profile_id === profile.id && <Check className="h-4 w-4" />}
                        <div className="flex-1">
                          <span className="font-medium">{profile.profile_name}</span>
                          {profile.folder_name && profile.folder_name !== "No Folder" && (
                            <span className="text-muted-foreground"> ({profile.folder_name})</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showProfileList && profiles && profiles.length === 0 && profileSearch && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
                    No profiles found
                  </div>
                )}
              </div>
              {/* Hidden input to ensure form validation works */}
              <input type="hidden" name="profile_id" value={formData.profile_id} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task_type">Task Type</Label>
              <select
                id="task_type"
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="login">Login to Gmail</option>
                <option value="check_gmail_status">Check Gmail Status</option>
                <option value="check_inbox">Check Inbox</option>
                <option value="read_email">Read Email</option>
                <option value="star_email">Star Email</option>
                <option value="send_email">Send Email</option>
                <option value="reply_to_email">Reply to Email from Sender</option>
                <option value="report_to_inbox">Report to Inbox (from Spam)</option>
              </select>
            </div>
            {supportsMultipleActions && (
              <div className="space-y-2">
                <Label htmlFor="action_count">Number of Actions</Label>
                <Input
                  id="action_count"
                  type="number"
                  min="1"
                  max="50"
                  value={actionCount}
                  onChange={(e) => setActionCount(Number.parseInt(e.target.value) || 1)}
                  placeholder="How many emails to process"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.task_type === "star_email" && "Number of emails to star (starting from the top)"}
                  {formData.task_type === "read_email" && "Number of emails to read (starting from the top)"}
                  {formData.task_type === "delete_email" && "Number of emails to delete (starting from the top)"}
                  {formData.task_type === "reply_to_email" &&
                    "Number of emails to reply to from this sender (starting from the most recent)"}
                </p>
              </div>
            )}
            {formData.task_type === "login" && (
              <div className="space-y-2">
                <Label htmlFor="login_duration">Keep Profile Open (seconds)</Label>
                <Input
                  id="login_duration"
                  type="number"
                  min="5"
                  max="300"
                  value={loginDuration}
                  onChange={(e) => setLoginDuration(Number.parseInt(e.target.value) || 10)}
                  placeholder="Duration in seconds"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  How long to keep the profile open before automatically closing (5-300 seconds)
                </p>
              </div>
            )}
            {formData.task_type === "reply_to_email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="search_from">Sender Name</Label>
                  <Input
                    id="search_from"
                    type="text"
                    value={replyConfig.searchFrom}
                    onChange={(e) => setReplyConfig({ ...replyConfig, searchFrom: e.target.value })}
                    placeholder="e.g., Temu, Google, AliExpress"
                    className="w-full"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the sender name (not email address). The app will search for emails from this sender and reply
                    to them.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply_message">Reply Message</Label>
                  <Textarea
                    id="reply_message"
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
            {formData.task_type === "report_to_inbox" && (
              <div className="space-y-2">
                <Label htmlFor="report_search_query">Search Query</Label>
                <Input
                  id="report_search_query"
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
