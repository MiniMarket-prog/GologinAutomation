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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Upload, Loader2, Monitor, Cloud } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface AddProfileDialogProps {
  onSuccess?: () => void
}

interface FolderWithType {
  name: string
  gologinCount: number
  localCount: number
  totalCount: number
}

export function AddProfileDialog({ onSuccess }: AddProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState<FolderWithType[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [profileType, setProfileType] = useState<"gologin" | "local">("gologin")

  const [singleForm, setSingleForm] = useState({
    email: "",
    password: "",
    recovery: "",
    folderOption: "existing" as "existing" | "new",
    existingFolder: "",
    newFolderName: "",
    autoGenerateFolderName: false,
    profileName: "",
    autoGenerateProfileName: true,
    assignToUser: "",
    userAgent: "",
    proxyServer: "",
    proxyUsername: "",
    proxyPassword: "",
    viewportWidth: "1366",
    viewportHeight: "768",
    windowWidth: "1366",
    windowHeight: "768",
    windowX: "",
    windowY: "",
  })

  const [bulkForm, setBulkForm] = useState({
    csvData: "",
    folderOption: "existing" as "existing" | "new",
    existingFolder: "",
    newFolderName: "",
    autoGenerateFolderName: false,
    profileType: "gologin" as "gologin" | "local",
    viewportWidth: "1366",
    viewportHeight: "768",
    userAgent: "",
    proxyServer: "",
    proxyUsername: "",
    proxyPassword: "",
    windowWidth: "1366",
    windowHeight: "768",
    windowX: "",
    windowY: "",
  })

  const [bulkResults, setBulkResults] = useState<{
    created: number
    failed: number
    skipped?: number
    skippedEmails?: string[]
    errors: string[]
  } | null>(null)

  useEffect(() => {
    if (open) {
      loadFolders()
      checkAdminStatus()
    }
  }, [open])

  const loadFolders = async () => {
    setLoadingFolders(true)
    try {
      const response = await fetch("/api/folders")
      const data = await response.json()
      setFolders(data.folders || [])
    } catch (error) {
      console.error("[v0] Error loading folders:", error)
    } finally {
      setLoadingFolders(false)
    }
  }

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/auth/check-admin")
      const data = await response.json()
      setIsAdmin(data.isAdmin)

      if (data.isAdmin) {
        loadUsers()
      }
    } catch (error) {
      console.error("[v0] Error checking admin status:", error)
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch("/api/users")
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("[v0] Error loading users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const generateFolderName = () => {
    const date = new Date().toISOString().split("T")[0]
    const username = "user" // You can get this from auth context
    return `${date}_${username}`
  }

  const generateProfileName = (email: string) => {
    return email.split("@")[0]
  }

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let folderName = ""
      if (singleForm.folderOption === "existing") {
        folderName = singleForm.existingFolder
      } else {
        folderName = singleForm.autoGenerateFolderName ? generateFolderName() : singleForm.newFolderName
      }

      const profileName = singleForm.autoGenerateProfileName
        ? generateProfileName(singleForm.email)
        : singleForm.profileName

      const endpoint = profileType === "local" ? "/api/profiles/create-local" : "/api/profiles/create-with-setup"

      const body: any = {
        email: singleForm.email,
        password: singleForm.password,
        recovery: singleForm.recovery,
        folderName,
        profileName,
        ...(singleForm.assignToUser && { assignToUserEmail: singleForm.assignToUser }),
      }

      if (profileType === "local") {
        body.localConfig = {
          user_agent: singleForm.userAgent || undefined,
          viewport: {
            width: Number.parseInt(singleForm.viewportWidth) || 1366,
            height: Number.parseInt(singleForm.viewportHeight) || 768,
          },
          window_size: {
            width: Number.parseInt(singleForm.windowWidth) || 1366,
            height: Number.parseInt(singleForm.windowHeight) || 768,
            ...(singleForm.windowX && { x: Number.parseInt(singleForm.windowX) }),
            ...(singleForm.windowY && { y: Number.parseInt(singleForm.windowY) }),
          },
          ...(singleForm.proxyServer && {
            proxy: {
              server: singleForm.proxyServer,
              username: singleForm.proxyUsername || undefined,
              password: singleForm.proxyPassword || undefined,
            },
          }),
        }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create profile")
      }

      setOpen(false)
      setSingleForm({
        email: "",
        password: "",
        recovery: "",
        folderOption: "existing",
        existingFolder: "",
        newFolderName: "",
        autoGenerateFolderName: false,
        profileName: "",
        autoGenerateProfileName: true,
        assignToUser: "",
        userAgent: "",
        proxyServer: "",
        proxyUsername: "",
        proxyPassword: "",
        viewportWidth: "1366",
        viewportHeight: "768",
        windowWidth: "1366",
        windowHeight: "768",
        windowX: "",
        windowY: "",
      })
      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error creating profile:", error)
      alert(error instanceof Error ? error.message : "Failed to create profile")
    } finally {
      setLoading(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setBulkResults(null)

    try {
      const lines = bulkForm.csvData.trim().split("\n")
      const profiles = lines
        .map((line) => {
          const [email, password, recovery] = line.split(",").map((s) => s.trim())
          return { email, password, recovery }
        })
        .filter((p) => p.email && p.password)

      if (profiles.length === 0) {
        throw new Error("No valid profiles found in CSV data")
      }

      let folderName = ""
      if (bulkForm.folderOption === "existing") {
        folderName = bulkForm.existingFolder
      } else {
        folderName = bulkForm.autoGenerateFolderName ? generateFolderName() : bulkForm.newFolderName
      }

      const requestBody: any = {
        profiles,
        folderName,
        profileType: bulkForm.profileType,
      }

      if (bulkForm.profileType === "local") {
        requestBody.localConfig = {
          viewport: {
            width: Number.parseInt(bulkForm.viewportWidth) || 1366,
            height: Number.parseInt(bulkForm.viewportHeight) || 768,
          },
          window_size: {
            width: Number.parseInt(bulkForm.windowWidth) || 1366,
            height: Number.parseInt(bulkForm.windowHeight) || 768,
            ...(bulkForm.windowX && { x: Number.parseInt(bulkForm.windowX) }),
            ...(bulkForm.windowY && { y: Number.parseInt(bulkForm.windowY) }),
          },
          ...(bulkForm.userAgent && { user_agent: bulkForm.userAgent }),
          ...(bulkForm.proxyServer && {
            proxy: {
              server: bulkForm.proxyServer,
              username: bulkForm.proxyUsername || undefined,
              password: bulkForm.proxyPassword || undefined,
            },
          }),
        }
      }

      const response = await fetch("/api/profiles/bulk-create-with-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create profiles")
      }

      const results = await response.json()
      setBulkResults(results)

      setBulkForm({
        csvData: "",
        folderOption: "existing",
        existingFolder: "",
        newFolderName: "",
        autoGenerateFolderName: false,
        profileType: "gologin",
        viewportWidth: "1366",
        viewportHeight: "768",
        userAgent: "",
        proxyServer: "",
        proxyUsername: "",
        proxyPassword: "",
        windowWidth: "1366",
        windowHeight: "768",
        windowX: "",
        windowY: "",
      })

      onSuccess?.()
    } catch (error) {
      console.error("[v0] Error creating profiles:", error)
      alert(error instanceof Error ? error.message : "Failed to create profiles")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Profile(s)</DialogTitle>
          <DialogDescription>Create a single profile or upload multiple profiles from a CSV file.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Profile</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setProfileType("gologin")}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      profileType === "gologin"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Cloud className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">GoLogin</div>
                      <div className="text-xs text-muted-foreground">Use GoLogin API</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileType("local")}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      profileType === "local" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Monitor className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Local Browser</div>
                      <div className="text-xs text-muted-foreground">Use local Chrome</div>
                    </div>
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label>Assign To User (Optional)</Label>
                  <Select
                    value={singleForm.assignToUser}
                    onValueChange={(value) => setSingleForm({ ...singleForm, assignToUser: value })}
                    disabled={loadingUsers}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingUsers ? "Loading users..." : "Select user (leave empty for yourself)"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Leave empty to assign to yourself</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Gmail Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={singleForm.email}
                  onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })}
                  required
                  placeholder="example@gmail.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Gmail Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={singleForm.password}
                  onChange={(e) => setSingleForm({ ...singleForm, password: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recovery">Recovery Email</Label>
                <Input
                  id="recovery"
                  type="email"
                  value={singleForm.recovery}
                  onChange={(e) => setSingleForm({ ...singleForm, recovery: e.target.value })}
                  placeholder="recovery@email.com"
                />
              </div>

              {profileType === "local" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">Local Browser Configuration (Optional)</h4>

                  {/* Removed busterExtensionPath field */}

                  <div className="space-y-2">
                    <Label htmlFor="userAgent">User Agent (Optional)</Label>
                    <Input
                      id="userAgent"
                      value={singleForm.userAgent}
                      onChange={(e) => setSingleForm({ ...singleForm, userAgent: e.target.value })}
                      placeholder="Leave empty for default"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="viewportWidth">Viewport Width</Label>
                      <Input
                        id="viewportWidth"
                        type="number"
                        value={singleForm.viewportWidth}
                        onChange={(e) => setSingleForm({ ...singleForm, viewportWidth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="viewportHeight">Viewport Height</Label>
                      <Input
                        id="viewportHeight"
                        type="number"
                        value={singleForm.viewportHeight}
                        onChange={(e) => setSingleForm({ ...singleForm, viewportHeight: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Window Size & Position</Label>
                    <p className="text-xs text-muted-foreground">
                      Configure browser window size and position for multi-window setups
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="windowWidth">Window Width</Label>
                        <Input
                          id="windowWidth"
                          type="number"
                          value={singleForm.windowWidth}
                          onChange={(e) => setSingleForm({ ...singleForm, windowWidth: e.target.value })}
                          placeholder="1366"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="windowHeight">Window Height</Label>
                        <Input
                          id="windowHeight"
                          type="number"
                          value={singleForm.windowHeight}
                          onChange={(e) => setSingleForm({ ...singleForm, windowHeight: e.target.value })}
                          placeholder="768"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="windowX">Window X Position (Optional)</Label>
                        <Input
                          id="windowX"
                          type="number"
                          value={singleForm.windowX}
                          onChange={(e) => setSingleForm({ ...singleForm, windowX: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="windowY">Window Y Position (Optional)</Label>
                        <Input
                          id="windowY"
                          type="number"
                          value={singleForm.windowY}
                          onChange={(e) => setSingleForm({ ...singleForm, windowY: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proxyServer">Proxy Server (Optional)</Label>
                    <Input
                      id="proxyServer"
                      value={singleForm.proxyServer}
                      onChange={(e) => setSingleForm({ ...singleForm, proxyServer: e.target.value })}
                      placeholder="http://proxy.example.com:8080"
                    />
                  </div>

                  {singleForm.proxyServer && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proxyUsername">Proxy Username</Label>
                        <Input
                          id="proxyUsername"
                          value={singleForm.proxyUsername}
                          onChange={(e) => setSingleForm({ ...singleForm, proxyUsername: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proxyPassword">Proxy Password</Label>
                        <Input
                          id="proxyPassword"
                          type="password"
                          value={singleForm.proxyPassword}
                          onChange={(e) => setSingleForm({ ...singleForm, proxyPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Folder</Label>
                <Select
                  value={singleForm.folderOption}
                  onValueChange={(value: "existing" | "new") => setSingleForm({ ...singleForm, folderOption: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Use Existing Folder</SelectItem>
                    <SelectItem value="new">Create New Folder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {singleForm.folderOption === "existing" ? (
                <div className="space-y-2">
                  <Label>Select Folder *</Label>
                  <Select
                    value={singleForm.existingFolder}
                    onValueChange={(value) => setSingleForm({ ...singleForm, existingFolder: value })}
                    disabled={loadingFolders}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFolders ? "Loading..." : "Select a folder"} />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.name || "no-folder"} value={folder.name || "no-folder"}>
                          {folder.name || "No Folder"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoFolder"
                      checked={singleForm.autoGenerateFolderName}
                      onCheckedChange={(checked) =>
                        setSingleForm({ ...singleForm, autoGenerateFolderName: checked as boolean })
                      }
                    />
                    <Label htmlFor="autoFolder" className="text-sm font-normal">
                      Auto-generate folder name (YYYY-MM-DD_username)
                    </Label>
                  </div>
                  {!singleForm.autoGenerateFolderName && (
                    <Input
                      placeholder="Enter folder name"
                      value={singleForm.newFolderName}
                      onChange={(e) => setSingleForm({ ...singleForm, newFolderName: e.target.value })}
                      required
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoProfile"
                    checked={singleForm.autoGenerateProfileName}
                    onCheckedChange={(checked) =>
                      setSingleForm({ ...singleForm, autoGenerateProfileName: checked as boolean })
                    }
                  />
                  <Label htmlFor="autoProfile" className="text-sm font-normal">
                    Auto-generate profile name from email
                  </Label>
                </div>
                {!singleForm.autoGenerateProfileName && (
                  <Input
                    placeholder="Enter profile name"
                    value={singleForm.profileName}
                    onChange={(e) => setSingleForm({ ...singleForm, profileName: e.target.value })}
                    required
                  />
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Profile"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="bulk">
            <form onSubmit={handleBulkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Profile Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBulkForm({ ...bulkForm, profileType: "gologin" })}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      bulkForm.profileType === "gologin"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Cloud className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">GoLogin</div>
                      <div className="text-xs text-muted-foreground">Use GoLogin API</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkForm({ ...bulkForm, profileType: "local" })}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                      bulkForm.profileType === "local"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Monitor className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Local Browser</div>
                      <div className="text-xs text-muted-foreground">Use local Chrome</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="csvData">CSV Data *</Label>
                <Textarea
                  id="csvData"
                  value={bulkForm.csvData}
                  onChange={(e) => setBulkForm({ ...bulkForm, csvData: e.target.value })}
                  placeholder="email1@gmail.com,password123,recovery1@email.com&#10;email2@gmail.com,password456,recovery2@email.com"
                  rows={8}
                  required
                />
                <p className="text-sm text-muted-foreground">Format: email,password,recovery (one per line)</p>
              </div>

              {bulkForm.profileType === "local" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">Local Browser Configuration (Applied to All Profiles)</h4>

                  {/* Removed busterExtensionPath field */}

                  <div className="space-y-2">
                    <Label htmlFor="bulkUserAgent">User Agent (Optional)</Label>
                    <Input
                      id="bulkUserAgent"
                      value={bulkForm.userAgent}
                      onChange={(e) => setBulkForm({ ...bulkForm, userAgent: e.target.value })}
                      placeholder="Leave empty for default"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulkViewportWidth">Viewport Width</Label>
                      <Input
                        id="bulkViewportWidth"
                        type="number"
                        value={bulkForm.viewportWidth}
                        onChange={(e) => setBulkForm({ ...bulkForm, viewportWidth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulkViewportHeight">Viewport Height</Label>
                      <Input
                        id="bulkViewportHeight"
                        type="number"
                        value={bulkForm.viewportHeight}
                        onChange={(e) => setBulkForm({ ...bulkForm, viewportHeight: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Window Size & Position</Label>
                    <p className="text-xs text-muted-foreground">
                      Configure browser window size and position for multi-window setups
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulkWindowWidth">Window Width</Label>
                        <Input
                          id="bulkWindowWidth"
                          type="number"
                          value={bulkForm.windowWidth}
                          onChange={(e) => setBulkForm({ ...bulkForm, windowWidth: e.target.value })}
                          placeholder="1366"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulkWindowHeight">Window Height</Label>
                        <Input
                          id="bulkWindowHeight"
                          type="number"
                          value={bulkForm.windowHeight}
                          onChange={(e) => setBulkForm({ ...bulkForm, windowHeight: e.target.value })}
                          placeholder="768"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulkWindowX">Window X Position (Optional)</Label>
                        <Input
                          id="bulkWindowX"
                          type="number"
                          value={bulkForm.windowX}
                          onChange={(e) => setBulkForm({ ...bulkForm, windowX: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulkWindowY">Window Y Position (Optional)</Label>
                        <Input
                          id="bulkWindowY"
                          type="number"
                          value={bulkForm.windowY}
                          onChange={(e) => setBulkForm({ ...bulkForm, windowY: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulkProxyServer">Proxy Server (Optional)</Label>
                    <Input
                      id="bulkProxyServer"
                      value={bulkForm.proxyServer}
                      onChange={(e) => setBulkForm({ ...bulkForm, proxyServer: e.target.value })}
                      placeholder="http://proxy.example.com:8080"
                    />
                  </div>

                  {bulkForm.proxyServer && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulkProxyUsername">Proxy Username</Label>
                        <Input
                          id="bulkProxyUsername"
                          value={bulkForm.proxyUsername}
                          onChange={(e) => setBulkForm({ ...bulkForm, proxyUsername: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulkProxyPassword">Proxy Password</Label>
                        <Input
                          id="bulkProxyPassword"
                          type="password"
                          value={bulkForm.proxyPassword}
                          onChange={(e) => setBulkForm({ ...bulkForm, proxyPassword: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Folder</Label>
                <Select
                  value={bulkForm.folderOption}
                  onValueChange={(value: "existing" | "new") => setBulkForm({ ...bulkForm, folderOption: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Use Existing Folder</SelectItem>
                    <SelectItem value="new">Create New Folder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {bulkForm.folderOption === "existing" ? (
                <div className="space-y-2">
                  <Label>Select Folder *</Label>
                  <Select
                    value={bulkForm.existingFolder}
                    onValueChange={(value) => setBulkForm({ ...bulkForm, existingFolder: value })}
                    disabled={loadingFolders}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingFolders ? "Loading..." : "Select a folder"} />
                    </SelectTrigger>
                    <SelectContent>
                      {folders.map((folder) => (
                        <SelectItem key={folder.name || "no-folder"} value={folder.name || "no-folder"}>
                          {folder.name || "No Folder"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoBulkFolder"
                      checked={bulkForm.autoGenerateFolderName}
                      onCheckedChange={(checked) =>
                        setBulkForm({ ...bulkForm, autoGenerateFolderName: checked as boolean })
                      }
                    />
                    <Label htmlFor="autoBulkFolder" className="text-sm font-normal">
                      Auto-generate folder name (YYYY-MM-DD_username)
                    </Label>
                  </div>
                  {!bulkForm.autoGenerateFolderName && (
                    <Input
                      placeholder="Enter folder name"
                      value={bulkForm.newFolderName}
                      onChange={(e) => setBulkForm({ ...bulkForm, newFolderName: e.target.value })}
                      required
                    />
                  )}
                </div>
              )}

              {bulkResults && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="font-semibold">Upload Results</h4>
                  <p className="text-sm">
                    <span className="text-green-600">Created: {bulkResults.created}</span>
                    {" | "}
                    <span className="text-red-600">Failed: {bulkResults.failed}</span>
                    {bulkResults.skipped !== undefined && bulkResults.skipped > 0 && (
                      <>
                        {" | "}
                        <span className="text-yellow-600">Skipped (already exist): {bulkResults.skipped}</span>
                      </>
                    )}
                  </p>
                  {bulkResults.skippedEmails && bulkResults.skippedEmails.length > 0 && (
                    <div className="text-sm text-yellow-600 space-y-1">
                      <p className="font-medium">Skipped emails (already exist in database):</p>
                      <div className="max-h-32 overflow-y-auto">
                        {bulkResults.skippedEmails.map((email, i) => (
                          <p key={i}>• {email}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  {bulkResults.errors.length > 0 && (
                    <div className="text-sm text-red-600 space-y-1">
                      <p className="font-medium">Errors:</p>
                      {bulkResults.errors.map((error, i) => (
                        <p key={i}>• {error}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Profiles
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
