"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"
import type { GoLoginProfile } from "@/lib/types"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface EditProfileDialogProps {
  profile: GoLoginProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditProfileDialog({ profile, open, onOpenChange, onSuccess }: EditProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [recoveryEmails, setRecoveryEmails] = useState<{ id: string; email: string }[]>([])
  const [loadingRecoveryEmails, setLoadingRecoveryEmails] = useState(false)

  const [form, setForm] = useState({
    profile_name: "",
    gmail_email: "",
    gmail_password: "",
    recovery_email: "", // Added recovery email field
    userAgent: "",
    proxyIp: "",
    proxyPort: "",
    proxyUsername: "",
    proxyPassword: "",
    viewportWidth: "1366",
    viewportHeight: "768",
  })

  const generateRandomPassword = () => {
    const length = 12 + Math.floor(Math.random() * 5) // 12-16 characters
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const special = "!@#$%^&*"
    const allChars = uppercase + lowercase + numbers + special

    let password = ""
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("")

    setForm({ ...form, gmail_password: password })
  }

  const loadRecoveryEmails = async () => {
    setLoadingRecoveryEmails(true)
    try {
      const response = await fetch("/api/profiles/recovery-emails")
      const data = await response.json()
      const uniqueEmails = Array.from(
        new Map((data.emails || []).map((email: { id: string; email: string }) => [email.email, email])).values(),
      ) as { id: string; email: string }[]
      setRecoveryEmails(uniqueEmails)
    } catch (error) {
      console.error("[v0] Error loading recovery emails:", error)
    } finally {
      setLoadingRecoveryEmails(false)
    }
  }

  useEffect(() => {
    if (open && profile) {
      const localConfig = profile.local_config as any
      const proxyServer = localConfig?.proxy?.server || ""
      let proxyIp = ""
      let proxyPort = ""
      if (proxyServer) {
        const match = proxyServer.match(/^(?:https?:\/\/)?([^:]+):(\d+)$/)
        if (match) {
          proxyIp = match[1]
          proxyPort = match[2]
        }
      }

      setForm({
        profile_name: profile.profile_name || "",
        gmail_email: profile.gmail_email || "",
        gmail_password: profile.gmail_password || "",
        recovery_email: profile.recovery_email || "", // Load recovery email
        userAgent: localConfig?.user_agent || "",
        proxyIp,
        proxyPort,
        proxyUsername: localConfig?.proxy?.username || "",
        proxyPassword: localConfig?.proxy?.password || "",
        viewportWidth: localConfig?.viewport?.width?.toString() || "1366",
        viewportHeight: localConfig?.viewport?.height?.toString() || "768",
      })

      loadRecoveryEmails()
    }
  }, [open, profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData: any = {
        profile_name: form.profile_name,
        gmail_email: form.gmail_email,
        gmail_password: form.gmail_password,
        recovery_email: form.recovery_email || null, // Include recovery email in update
      }

      if (profile.profile_type === "local") {
        const proxyServer = form.proxyIp && form.proxyPort ? `http://${form.proxyIp}:${form.proxyPort}` : ""

        updateData.local_config = {
          user_agent: form.userAgent || undefined,
          viewport: {
            width: Number.parseInt(form.viewportWidth) || 1366,
            height: Number.parseInt(form.viewportHeight) || 768,
          },
          ...(proxyServer && {
            proxy: {
              server: proxyServer,
              username: form.proxyUsername || undefined,
              password: form.proxyPassword || undefined,
            },
          }),
        }
      }

      const response = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      alert(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update profile details, credentials, and proxy settings.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile_name">Profile Name *</Label>
            <Input
              id="profile_name"
              value={form.profile_name}
              onChange={(e) => setForm({ ...form, profile_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmail_email">Gmail Email *</Label>
            <Input
              id="gmail_email"
              type="email"
              value={form.gmail_email}
              onChange={(e) => setForm({ ...form, gmail_email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmail_password">Gmail Password *</Label>
            <div className="flex gap-2">
              <Input
                id="gmail_password"
                type="text" // Changed type from "password" to "text" to show password in plain text
                value={form.gmail_password}
                onChange={(e) => setForm({ ...form, gmail_password: e.target.value })}
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={generateRandomPassword}
                title="Generate random password"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recovery_email">Recovery Email (Optional)</Label>
            <Select
              value={form.recovery_email || "none"}
              onValueChange={(value) => setForm({ ...form, recovery_email: value === "none" ? "" : value })}
              disabled={loadingRecoveryEmails}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingRecoveryEmails ? "Loading..." : "Select recovery email"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {recoveryEmails.map((email) => (
                  <SelectItem key={email.id} value={email.email}>
                    {email.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {profile.profile_type === "local" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm">Local Browser Configuration (Chrome Only)</h4>

              <div className="space-y-2">
                <Label htmlFor="userAgent">User Agent (Optional)</Label>
                <Input
                  id="userAgent"
                  value={form.userAgent}
                  onChange={(e) => setForm({ ...form, userAgent: e.target.value })}
                  placeholder="Leave empty for default"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="viewportWidth">Viewport Width</Label>
                  <Input
                    id="viewportWidth"
                    type="number"
                    value={form.viewportWidth}
                    onChange={(e) => setForm({ ...form, viewportWidth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viewportHeight">Viewport Height</Label>
                  <Input
                    id="viewportHeight"
                    type="number"
                    value={form.viewportHeight}
                    onChange={(e) => setForm({ ...form, viewportHeight: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxyIp">Proxy IP (Optional)</Label>
                  <Input
                    id="proxyIp"
                    value={form.proxyIp}
                    onChange={(e) => setForm({ ...form, proxyIp: e.target.value })}
                    placeholder="102.129.208.102"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxyPort">Proxy Port</Label>
                  <Input
                    id="proxyPort"
                    value={form.proxyPort}
                    onChange={(e) => setForm({ ...form, proxyPort: e.target.value })}
                    placeholder="12323"
                  />
                </div>
              </div>

              {form.proxyIp && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proxyUsername">Proxy Username</Label>
                    <Input
                      id="proxyUsername"
                      value={form.proxyUsername}
                      onChange={(e) => setForm({ ...form, proxyUsername: e.target.value })}
                      placeholder="14a03104f588b"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proxyPassword">Proxy Password</Label>
                    <Input
                      id="proxyPassword"
                      type="password"
                      value={form.proxyPassword}
                      onChange={(e) => setForm({ ...form, proxyPassword: e.target.value })}
                      placeholder="c311b7035d"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
