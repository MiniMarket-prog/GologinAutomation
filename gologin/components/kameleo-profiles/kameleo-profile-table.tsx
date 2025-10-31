"use client"

import { useState } from "react"
import { useKameleoProfiles } from "@/lib/hooks/use-kameleo-profiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import {
  MoreHorizontal,
  Search,
  Trash2,
  Folder,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Settings,
  RefreshCw,
  Pencil,
} from "lucide-react"
import type { KameleoProfile } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { EditKameleoProfileDialog } from "./edit-kameleo-profile-dialog"

const statusColors = {
  idle: "bg-gray-500",
  running: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-red-500",
  deleted: "bg-gray-400",
}

export function KameleoProfileTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>()
  const [launchingProfiles, setLaunchingProfiles] = useState<Set<string>>(new Set())
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set())
  const [isSyncing, setIsSyncing] = useState(false)
  const [editingProfile, setEditingProfile] = useState<KameleoProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const { profiles, total, totalPages, isLoading, mutate } = useKameleoProfiles(page, 50, statusFilter, search)
  const { toast } = useToast()

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Kameleo profile?")) return

    try {
      const response = await fetch(`/api/kameleo-profiles/${id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete profile")
      mutate()
    } catch (error) {
      console.error("[v0] Error deleting profile:", error)
      alert("Failed to delete profile")
    }
  }

  const handleLaunchProfile = async (profileId: string) => {
    setLaunchingProfiles((prev) => new Set(prev).add(profileId))

    try {
      const response = await fetch("/api/kameleo-profiles/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to launch profile")
      }

      alert(`Kameleo profile launched successfully!\n\nBrowser will stay open until you close it manually.`)
      mutate()
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

  const hasProxy = (profile: KameleoProfile) => {
    return profile.proxy_config && Object.keys(profile.proxy_config).length > 0
  }

  const getProxyDetails = (profile: KameleoProfile) => {
    if (profile.proxy_config) {
      const proxy = profile.proxy_config
      return {
        server: proxy.server || proxy.host || "N/A",
        port: proxy.port || "N/A",
        username: proxy.username || "N/A",
        hasAuth: !!proxy.username,
      }
    }
    return null
  }

  const handleSyncProfiles = async () => {
    setIsSyncing(true)

    try {
      const response = await fetch("/api/kameleo-profiles/sync", {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to sync profiles")
      }

      toast({
        title: "Sync Complete",
        description:
          result.message || `Synced ${result.synced} new profiles and updated ${result.updated} existing profiles`,
      })

      mutate()
    } catch (error) {
      console.error("[v0] Error syncing profiles:", error)
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync Kameleo profiles",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleEdit = (profile: KameleoProfile) => {
    setEditingProfile(profile)
    setIsEditDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Kameleo profiles by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
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
          </select>
          <Button onClick={handleSyncProfiles} disabled={isSyncing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Profiles"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile Name</TableHead>
              <TableHead>Profile ID</TableHead>
              <TableHead>Folder Path</TableHead>
              <TableHead>Gmail Email</TableHead>
              <TableHead>Gmail Password</TableHead>
              <TableHead>Recovery Email</TableHead>
              <TableHead>Proxy</TableHead>
              <TableHead>Fingerprint</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  Loading Kameleo profiles...
                </TableCell>
              </TableRow>
            ) : profiles && profiles.length > 0 ? (
              profiles.map((profile) => {
                const isLaunching = launchingProfiles.has(profile.id)
                const isPasswordVisible = visiblePasswords.has(profile.id)
                const proxyDetails = getProxyDetails(profile)

                return (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.profile_name}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">{profile.profile_id}</span>
                    </TableCell>
                    <TableCell>
                      {profile.folder_path ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Folder className="h-3.5 w-3.5" />
                          <span className="text-sm">{profile.folder_path}</span>
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
                      {proxyDetails ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-blue-500 cursor-help">
                                <Globe className="h-3.5 w-3.5" />
                                <span className="text-xs">Configured</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[250px]">
                              <div className="space-y-1 text-xs">
                                <div className="font-semibold">Proxy Configuration</div>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Server:</span>
                                  <span className="font-mono">{proxyDetails.server}</span>
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
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.fingerprint_config ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 text-purple-500 cursor-help">
                                <Settings className="h-3.5 w-3.5" />
                                <span className="text-xs">Custom</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[300px]">
                              <div className="space-y-1 text-xs">
                                <div className="font-semibold">Fingerprint Configuration</div>
                                <pre className="text-[10px] overflow-auto max-h-[200px]">
                                  {JSON.stringify(profile.fingerprint_config, null, 2)}
                                </pre>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">Default</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[profile.status as keyof typeof statusColors] || statusColors.idle}>
                        {profile.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{profile.last_run ? new Date(profile.last_run).toLocaleString() : "Never"}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleLaunchProfile(profile.id)} disabled={isLaunching}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {isLaunching ? "Launching..." : "Launch Profile"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(profile)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
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
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  No Kameleo profiles found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {profiles?.length || 0} of {total} profiles
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
        <EditKameleoProfileDialog
          profile={editingProfile}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  )
}
