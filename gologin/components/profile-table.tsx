"use client"

import { useState } from "react"
import { useProfiles } from "@/lib/use-profiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Play, Pause, Trash2 } from "lucide-react"
import type { GoLoginProfile } from "@/lib/types"

const statusColors = {
  idle: "bg-gray-500",
  running: "bg-green-500",
  paused: "bg-yellow-500",
  error: "bg-red-500",
}

export function ProfileTable() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>()

  const { profiles, total, totalPages, isLoading, mutate } = useProfiles(page, 50, statusFilter, search)

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile Name</TableHead>
              <TableHead>Gmail Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading profiles...
                </TableCell>
              </TableRow>
            ) : profiles && profiles.length > 0 ? (
              profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.profile_name}</TableCell>
                  <TableCell>{profile.gmail_email || "-"}</TableCell>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
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
            Showing {profiles?.length || 0} of {total || 0} profiles
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
    </div>
  )
}
