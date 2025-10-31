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
import { Loader2, RefreshCw, Eye, EyeOff } from "lucide-react"
import type { KameleoProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface EditKameleoProfileDialogProps {
  profile: KameleoProfile
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditKameleoProfileDialog({ profile, open, onOpenChange, onSuccess }: EditKameleoProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [showGmailPassword, setShowGmailPassword] = useState(false)
  const [showProxyPassword, setShowProxyPassword] = useState(false)
  const { toast } = useToast()

  const [form, setForm] = useState({
    profile_name: "",
    gmail_email: "",
    gmail_password: "",
    recovery_email: "",
    folder_path: "",
    proxyHost: "",
    proxyPort: "",
    proxyUsername: "",
    proxyPassword: "",
    proxyType: "http",
  })

  const generateRandomPassword = () => {
    const length = 12 + Math.floor(Math.random() * 5)
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

  useEffect(() => {
    if (open && profile) {
      const proxyConfig = profile.proxy_config as any

      setForm({
        profile_name: profile.profile_name || "",
        gmail_email: profile.gmail_email || "",
        gmail_password: profile.gmail_password || "",
        recovery_email: profile.recovery_email || "",
        folder_path: profile.folder_path || "",
        proxyHost: proxyConfig?.host || "",
        proxyPort: proxyConfig?.port?.toString() || "",
        proxyUsername: proxyConfig?.username || "",
        proxyPassword: proxyConfig?.password || "",
        proxyType: proxyConfig?.type || "http",
      })
    }
  }, [open, profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const updateData: any = {
        profile_name: form.profile_name,
        gmail_email: form.gmail_email || null,
        gmail_password: form.gmail_password || null,
        recovery_email: form.recovery_email || null,
        folder_path: form.folder_path || null,
      }

      if (form.proxyHost && form.proxyPort) {
        updateData.proxy_config = {
          type: form.proxyType,
          host: form.proxyHost,
          port: Number.parseInt(form.proxyPort),
          username: form.proxyUsername || undefined,
          password: form.proxyPassword || undefined,
        }
      } else {
        updateData.proxy_config = null
      }

      const response = await fetch(`/api/kameleo-profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update profile")
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Kameleo Profile</DialogTitle>
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
            <Label htmlFor="folder_path">Folder Path</Label>
            <Input
              id="folder_path"
              value={form.folder_path}
              onChange={(e) => setForm({ ...form, folder_path: e.target.value })}
              placeholder="e.g., Work/Clients"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmail_email">Gmail Email</Label>
            <Input
              id="gmail_email"
              type="email"
              value={form.gmail_email}
              onChange={(e) => setForm({ ...form, gmail_email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gmail_password">Gmail Password</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="gmail_password"
                  type={showGmailPassword ? "text" : "password"}
                  value={form.gmail_password}
                  onChange={(e) => setForm({ ...form, gmail_password: e.target.value })}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowGmailPassword(!showGmailPassword)}
                  title={showGmailPassword ? "Hide password" : "Show password"}
                >
                  {showGmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
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
            <Label htmlFor="recovery_email">Recovery Email</Label>
            <Input
              id="recovery_email"
              type="email"
              value={form.recovery_email}
              onChange={(e) => setForm({ ...form, recovery_email: e.target.value })}
            />
          </div>

          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="font-medium text-sm">Proxy Configuration</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proxyHost">Proxy Host</Label>
                <Input
                  id="proxyHost"
                  value={form.proxyHost}
                  onChange={(e) => setForm({ ...form, proxyHost: e.target.value })}
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

            {form.proxyHost && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="proxyType">Proxy Type</Label>
                  <Input
                    id="proxyType"
                    value={form.proxyType}
                    onChange={(e) => setForm({ ...form, proxyType: e.target.value })}
                    placeholder="http"
                  />
                </div>
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
                    <div className="relative">
                      <Input
                        id="proxyPassword"
                        type={showProxyPassword ? "text" : "password"}
                        value={form.proxyPassword}
                        onChange={(e) => setForm({ ...form, proxyPassword: e.target.value })}
                        placeholder="c311b7035d"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowProxyPassword(!showProxyPassword)}
                        title={showProxyPassword ? "Hide password" : "Show password"}
                      >
                        {showProxyPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

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
