"use client"

import { useState, useEffect } from "react"
import { useProfiles } from "@/lib/hooks/use-profiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  MoreHorizontal,
  Search,
  Play,
  Pause,
  Trash2,
  Folder,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Clock,
  ExternalLink,
  Monitor,
  Cloud,
  Eye,
  EyeOff,
  Globe,
} from "lucide-react"
import { AddProfileDialog } from "@/components/profiles/add-profile-dialog"
import { SyncProfilesDialog } from "@/components/profiles/sync-profiles-dialog"
import { EditProfileDialog } from "@/components/profiles/edit-profile-dialog"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { GoLoginProfile } from "@/lib/types"

const statusColors = {
  idle: "bg-gray-500",
  running: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-red-500",
  deleted: "bg-gray-400",
}

const gmailStatusConfig = {
  ok: { color: "bg-green-500", icon: CheckCircle2, label: "OK" },
  blocked: { color: "bg-red-500", icon: XCircle, label: "Blocked" },
  password_required: { color: "bg-orange-500", icon: AlertCircle, label: "Password Required" },
  verification_required: { color: "bg-yellow-500", icon: AlertCircle, label: "Verification Required" },
  error: { color: "bg-red-500", icon: XCircle, label: "Error" },
  unknown: { color: "bg-gray-500", icon: HelpCircle, label: "Unknown" },
}

interface FolderWithType {
  name: string
  gologinCount: number
  localCount: number
  totalCount: number
}

export function ProfileTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>()
  const [gmailStatusFilter, setGmailStatusFilter] = useState<string>()
  const [folderFilter, setFolderFilter] = useState<string>()
  const [folderTypeFilter, setFolderTypeFilter] = useState<string>("local")
  const [folders, setFolders] = useState<FolderWithType[]>([])
  const [launchingProfiles, setLaunchingProfiles] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [editingProfile, setEditingProfile] = useState<GoLoginProfile | null>(null)
  const [proxyFilter, setProxyFilter] = useState<string>()

  const { profiles, total, totalPages, isLoading, mutate } = useProfiles(
    page,
    50,
    statusFilter,
    search,
    gmailStatusFilter,
    folderFilter,
  )

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && user.email) {
        // Query the users table to get the role (consistent with server-side check)
        const { data: userData } = await supabase.from("users").select("role").eq("email", user.email).single()

        setIsAdmin(userData?.role === "admin")
      }
    }
    checkAdmin()
  }, [])

  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.json())
      .then((data) => {
        setFolders(data.folders || [])
      })
      .catch((err) => console.error("[v0] Error fetching folders:", err))
  }, [])

  useEffect(() => {
    const handleRefresh = () => {
      console.log("[v0] Profiles refresh triggered by task completion")
      mutate()
    }

    window.addEventListener("profiles-refresh", handleRefresh)
    return () => window.removeEventListener("profiles-refresh", handleRefresh)
  }, [mutate])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this profile?")) return

    try {
      const response = await fetch(`/api/profiles/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete profile")
      mutate()
    } catch (error) {
      console.error("[v0] Error deleting profile:", error)
      alert("Failed to delete profile")
    }
  }

  const handleStatusChange = async (id: string, status: GoLoginProfile["status"]) => {
    try {
      const response = await fetch(`/api/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error("Failed to update status")
      mutate()
    } catch (error) {
      console.error("[v0] Error updating status:", error)
      alert("Failed to update status")
    }
  }

  const handleLaunchProfile = async (profileId: string) => {
    setLaunchingProfiles((prev) => new Set(prev).add(profileId))

    try {
      const response = await fetch("/api/profiles/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to launch profile")
      }

      const data = await response.json()
      alert(`Profile launched successfully!\n\nBrowser will stay open until you close it manually.`)
    } catch (error) {
      console.error("[v0] Error launching profile:", error)
      alert(`Failed to launch profile: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLaunchingProfiles((prev) => {
        const next = new Set(prev)
        next.delete(profileId)
        return next
      })
    }
  }

  const handleLaunchManually = async (profileId: string) => {
    setLaunchingProfiles((prev) => new Set(prev).add(profileId))

    try {
      const response = await fetch("/api/profiles/launch-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to launch profile manually")
      }

      const data = await response.json()
      alert(
        `Profile launched manually!\n\n✓ No automation control\n✓ No detection\n✓ Use it like a normal browser\n\nClose the browser window when you're done.`,
      )
    } catch (error) {
      console.error("[v0] Error launching profile manually:", error)
      alert(`Failed to launch profile manually: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLaunchingProfiles((prev) => {
        const next = new Set(prev)
        next.delete(profileId)
        return next
      })
    }
  }

  const togglePasswordVisibility = (profileId: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev)
      if (next.has(profileId)) {
        next.delete(profileId)
      } else {
        next.add(profileId)
      }
      return next
    })
  }

  const hasProxy = (profile: GoLoginProfile) => {
    if (profile.profile_type === "local" && profile.local_config?.proxy?.server) {
      return true
    }
    return false
  }

  const getProxyDetails = (profile: GoLoginProfile) => {
    if (profile.profile_type === "local" && profile.local_config?.proxy) {
      const proxy = profile.local_config.proxy
      const server = proxy.server || ""
      const username = proxy.username || ""

      // Extract IP and port from server URL
      const serverMatch = server.match(/(?:https?:\/\/)?([^:]+):(\d+)/)
      const ip = serverMatch ? serverMatch[1] : server
      const port = serverMatch ? serverMatch[2] : ""

      return {
        ip,
        port,
        username,
        hasAuth: !!username,
      }
    }
    return null
  }

  const filteredFolders = folders.filter((folder) => {
    if (folderTypeFilter === "local") {
      return folder.localCount > 0
    } else if (folderTypeFilter === "gologin") {
      return folder.gologinCount > 0
    }
    return true // "all" shows all folders
  })

  const filteredProfiles = profiles?.filter((profile) => {
    if (folderFilter) {
      const profileFolder = profile.folder_name || "(No Folder)"
      if (profileFolder !== folderFilter) {
        return false
      }
    }

    if (folderTypeFilter === "local" && profile.profile_type !== "local") {
      return false
    } else if (folderTypeFilter === "gologin" && profile.profile_type !== "gologin") {
      return false
    }

    // Filter by proxy status
    if (proxyFilter === "with-proxy") {
      return hasProxy(profile)
    } else if (proxyFilter === "without-proxy") {
      return !hasProxy(profile)
    }
    return true
  })

  const displayTotal =
    proxyFilter || folderFilter || folderTypeFilter !== "all" ? filteredProfiles?.length || 0 : total || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search profiles by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={folderTypeFilter}
            onChange={(e) => setFolderTypeFilter(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
          >
            <option value="all">All Folder Types</option>
            <option value="local">💻 Local Folders</option>
            <option value="gologin">☁️ GoLogin Folders</option>
          </select>
          <select
            value={folderFilter || "all"}
            onChange={(e) => setFolderFilter(e.target.value === "all" ? undefined : e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="all">All Folders</option>
            {filteredFolders.map((folder) => (
              <option key={folder.name || "no-folder"} value={folder.name}>
                📁 {folder.name}
              </option>
            ))}
          </select>
          <select
            value={proxyFilter || "all"}
            onChange={(e) => setProxyFilter(e.target.value === "all" ? undefined : e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
          >
            <option value="all">All Proxies</option>
            <option value="with-proxy">🌐 With Proxy</option>
            <option value="without-proxy">No Proxy</option>
          </select>
          <select
            value={statusFilter || "all"}
            onChange={(e) => setStatusFilter(e.target.value === "all" ? undefined : e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="idle">Idle</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            value={gmailStatusFilter || "all"}
            onChange={(e) => setGmailStatusFilter(e.target.value === "all" ? undefined : e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="all">All Gmail Status</option>
            <option value="ok">✓ OK</option>
            <option value="blocked">✗ Blocked</option>
            <option value="password_required">⚠ Password Required</option>
            <option value="verification_required">⚠ Verification Required</option>
            <option value="error">✗ Error</option>
            <option value="unknown">? Unknown</option>
            <option value="unchecked">Not Checked</option>
          </select>
        </div>
        <div className="flex gap-2 ml-4">
          {isAdmin && <SyncProfilesDialog onSuccess={mutate} />}
          <AddProfileDialog />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Profile Name</TableHead>
              <TableHead>Folder</TableHead>
              <TableHead>Gmail Email</TableHead>
              <TableHead>Gmail Password</TableHead>
              <TableHead>Recovery Email</TableHead>
              <TableHead>Gmail Status</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  Loading profiles...
                </TableCell>
              </TableRow>
            ) : filteredProfiles && filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => {
                const gmailStatus = profile.gmail_status || "unknown"
                const statusConfig =
                  gmailStatusConfig[gmailStatus as keyof typeof gmailStatusConfig] || gmailStatusConfig.unknown
                const StatusIcon = statusConfig.icon
                const isLaunching = launchingProfiles.has(profile.id)
                const isPasswordVisible = visiblePasswords.has(profile.id) // Check if password is visible
                const proxyDetails = getProxyDetails(profile) // Get proxy details

                return (
                  <TableRow key={profile.id || profile.profile_id || `profile-${Math.random()}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {profile.profile_type === "local" ? (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Monitor className="h-3.5 w-3.5" />
                            <span className="text-xs">Local</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Cloud className="h-3.5 w-3.5" />
                            <span className="text-xs">GoLogin</span>
                          </div>
                        )}
                        {proxyDetails && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Globe className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-[250px]">
                                <div className="space-y-1 text-xs">
                                  <div className="font-semibold">Proxy Configuration</div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">IP:</span>
                                    <span className="font-mono">{proxyDetails.ip}</span>
                                  </div>
                                  {proxyDetails.port && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Port:</span>
                                      <span className="font-mono">{proxyDetails.port}</span>
                                    </div>
                                  )}
                                  {proxyDetails.hasAuth && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">User:</span>
                                      <span className="font-mono">{proxyDetails.username}</span>
                                    </div>
                                  )}
                                  <div className="text-green-500 text-[10px] mt-1">✓ Proxy Active</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{profile.profile_name}</TableCell>
                    <TableCell>
                      {profile.folder_name ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Folder className="h-3.5 w-3.5" />
                          <span className="text-sm">{profile.folder_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{profile.gmail_email || "-"}</TableCell>
                    <TableCell>
                      {profile.gmail_password ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {isPasswordVisible ? profile.gmail_password : "••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePasswordVisibility(profile.id)}
                          >
                            {isPasswordVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.recovery_email ? (
                        <span className="text-sm">{profile.recovery_email}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.gmail_status ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                          </div>
                          {profile.gmail_status_checked_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {new Date(profile.gmail_status_checked_at).toLocaleString()}
                            </div>
                          )}
                          {profile.gmail_status_message && (
                            <div
                              className="text-xs text-muted-foreground max-w-[200px] truncate"
                              title={profile.gmail_status_message}
                            >
                              {profile.gmail_status_message}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not checked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[profile.status]}>{profile.status}</Badge>
                    </TableCell>
                    <TableCell>{profile.last_run ? new Date(profile.last_run).toLocaleString() : "Never"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingProfile(profile)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleLaunchProfile(profile.id)} disabled={isLaunching}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {isLaunching ? "Launching..." : "Launch in Local Mode"}
                          </DropdownMenuItem>
                          {profile.profile_type === "local" && (
                            <DropdownMenuItem
                              onClick={() => handleLaunchManually(profile.id)}
                              disabled={isLaunching}
                              className="text-green-600"
                            >
                              <Monitor className="mr-2 h-4 w-4" />
                              {isLaunching ? "Launching..." : "Launch Manually (No Automation)"}
                            </DropdownMenuItem>
                          )}
                          {profile.status === "idle" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(profile.id, "running")}>
                              <Play className="mr-2 h-4 w-4" />
                              Start
                            </DropdownMenuItem>
                          )}
                          {profile.status === "running" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(profile.id, "paused")}>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(profile.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No profiles found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredProfiles?.length || 0} of {displayTotal} profiles
            {proxyFilter && <span className="ml-1 text-blue-500">(filtered by proxy)</span>}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {editingProfile && (
        <EditProfileDialog
          profile={editingProfile}
          open={!!editingProfile}
          onOpenChange={(open) => !open && setEditingProfile(null)}
          onSuccess={mutate}
        />
      )}
    </div>
  )
}
