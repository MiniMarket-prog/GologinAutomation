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
import { Plus, Upload, Loader2, Monitor, Cloud, RefreshCw } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { AdvancedFingerprintSettings } from "./advanced-fingerprint-settings"

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

  const [workingProxies, setWorkingProxies] = useState<
    Array<{
      id: string
      name: string
      proxy_server: string
      proxy_port: number
      proxy_username: string
      proxy_password: string
    }>
  >([])
  const [loadingProxies, setLoadingProxies] = useState(false)
  const [recoveryEmails, setRecoveryEmails] = useState<
    Array<{
      id: string
      email: string
    }>
  >([])
  const [loadingRecoveryEmails, setLoadingRecoveryEmails] = useState(false)

  const [singleForm, setSingleForm] = useState({
    emailPrefix: "", // Added email prefix for generator
    emailDomain: "gmail.com", // Added email domain with gmail as default
    email: "",
    password: "",
    recovery: "",
    proxyId: "", // Added proxy selection
    folderOption: "existing" as "existing" | "new",
    existingFolder: "",
    newFolderName: "",
    autoGenerateFolderName: false,
    profileName: "",
    autoGenerateProfileName: true,
    assignToUser: "",
    userAgent: "",
    proxyIp: "",
    proxyPort: "",
    proxyUsername: "",
    proxyPassword: "",
    viewportWidth: "1366",
    viewportHeight: "768",
    fingerprintSettings: {}, // Initialize fingerprint settings
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
    proxyIp: "",
    proxyPort: "",
    proxyUsername: "",
    proxyPassword: "",
    fingerprintSettings: {}, // Initialize fingerprint settings
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
      if (profileType === "local") {
        loadWorkingProxies()
        loadRecoveryEmails()
      }
    }
  }, [open, profileType])

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

  const generateRandomEmailPrefix = () => {
    const adjectives = ["happy", "sunny", "cool", "smart", "quick", "bright", "lucky", "swift"]
    const nouns = ["cat", "dog", "bird", "fish", "lion", "bear", "wolf", "fox"]
    const randomNum = Math.floor(Math.random() * 9999)
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
    return `${randomAdj}${randomNoun}${randomNum}`
  }

  const generateRandomPassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const special = "!@#$%^&*"
    const allChars = uppercase + lowercase + numbers + special

    let password = ""
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]

    // Fill the rest randomly (total length 12-16)
    const length = 12 + Math.floor(Math.random() * 5)
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }

    // Shuffle the password
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("")
  }

  const loadWorkingProxies = async () => {
    setLoadingProxies(true)
    try {
      const response = await fetch("/api/proxies?working=true")
      const data = await response.json()
      setWorkingProxies(data.proxies || [])
    } catch (error) {
      console.error("[v0] Error loading proxies:", error)
    } finally {
      setLoadingProxies(false)
    }
  }

  const loadRecoveryEmails = async () => {
    setLoadingRecoveryEmails(true)
    try {
      const response = await fetch("/api/profiles/recovery-emails")
      const data = await response.json()
      const uniqueEmails = Array.from(
        new Map((data.emails || []).map((email: any) => [email.email, email])).values(),
      ) as { id: string; email: string }[]
      setRecoveryEmails(uniqueEmails)
    } catch (error) {
      console.error("[v0] Error loading recovery emails:", error)
    } finally {
      setLoadingRecoveryEmails(false)
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

  useEffect(() => {
    if (singleForm.emailPrefix && singleForm.emailDomain) {
      setSingleForm((prev) => ({
        ...prev,
        email: `${prev.emailPrefix}@${prev.emailDomain}`,
      }))
    }
  }, [singleForm.emailPrefix, singleForm.emailDomain])

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
        fingerprintSettings: singleForm.fingerprintSettings, // Include fingerprint settings
      }

      if (profileType === "local") {
        let proxyServer = ""
        let proxyUsername = ""
        let proxyPassword = ""

        if (singleForm.proxyId) {
          const selectedProxy = workingProxies.find((p) => p.id === singleForm.proxyId)
          if (selectedProxy) {
            proxyServer = `http://${selectedProxy.proxy_server}:${selectedProxy.proxy_port}`
            proxyUsername = selectedProxy.proxy_username
            proxyPassword = selectedProxy.proxy_password
          }
        } else if (singleForm.proxyIp && singleForm.proxyPort) {
          proxyServer = `http://${singleForm.proxyIp}:${singleForm.proxyPort}`
          proxyUsername = singleForm.proxyUsername
          proxyPassword = singleForm.proxyPassword
        }

        body.localConfig = {
          user_agent: singleForm.userAgent || undefined,
          viewport: {
            width: Number.parseInt(singleForm.viewportWidth) || 1366,
            height: Number.parseInt(singleForm.viewportHeight) || 768,
          },
          ...(proxyServer && {
            proxy: {
              server: proxyServer,
              username: proxyUsername || undefined,
              password: proxyPassword || undefined,
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
        emailPrefix: "",
        emailDomain: "gmail.com",
        email: "",
        password: "",
        recovery: "",
        proxyId: "",
        folderOption: "existing",
        existingFolder: "",
        newFolderName: "",
        autoGenerateFolderName: false,
        profileName: "",
        autoGenerateProfileName: true,
        assignToUser: "",
        userAgent: "",
        proxyIp: "",
        proxyPort: "",
        proxyUsername: "",
        proxyPassword: "",
        viewportWidth: "1366",
        viewportHeight: "768",
        fingerprintSettings: {}, // Reset fingerprint settings
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
        .map((line: string) => {
          const [email, password, recovery, proxyIp, proxyUsername, proxyPassword, proxyPort] = line
            .split(",")
            .map((s: string) => s.trim())
          return { email, password, recovery, proxyIp, proxyUsername, proxyPassword, proxyPort }
        })
        .filter((p: any) => p.email && p.password) // Assuming ProfileData interface can be inferred or is not strictly needed here for filtering

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
        fingerprintSettings: bulkForm.fingerprintSettings, // Include fingerprint settings
      }

      if (bulkForm.profileType === "local") {
        const proxyServer =
          bulkForm.proxyIp && bulkForm.proxyPort ? `http://${bulkForm.proxyIp}:${bulkForm.proxyPort}` : ""

        requestBody.localConfig = {
          viewport: {
            width: Number.parseInt(bulkForm.viewportWidth) || 1366,
            height: Number.parseInt(bulkForm.viewportHeight) || 768,
          },
          ...(bulkForm.userAgent && { user_agent: bulkForm.userAgent }),
          ...(proxyServer && {
            proxy: {
              server: proxyServer,
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
        proxyIp: "",
        proxyPort: "",
        proxyUsername: "",
        proxyPassword: "",
        fingerprintSettings: {}, // Reset fingerprint settings
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

              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Email Generator</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const randomPrefix = generateRandomEmailPrefix()
                      setSingleForm({ ...singleForm, emailPrefix: randomPrefix })
                    }}
                  >
                    <RefreshCw className="mr-2 h-3 w-3" />
                    Generate Random
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="emailPrefix">Email Prefix *</Label>
                    <Input
                      id="emailPrefix"
                      value={singleForm.emailPrefix}
                      onChange={(e) => setSingleForm({ ...singleForm, emailPrefix: e.target.value })}
                      required
                      placeholder="username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailDomain">Domain *</Label>
                    <Select
                      value={singleForm.emailDomain}
                      onValueChange={(value) => setSingleForm({ ...singleForm, emailDomain: value })}
                    >
                      <SelectTrigger id="emailDomain">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gmail.com">Gmail</SelectItem>
                        <SelectItem value="yahoo.com">Yahoo</SelectItem>
                        <SelectItem value="outlook.com">Outlook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="generatedEmail">Generated Email</Label>
                  <Input
                    id="generatedEmail"
                    value={singleForm.email}
                    readOnly
                    className="bg-muted"
                    placeholder="Generated email will appear here"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Gmail Password *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="password"
                    value={singleForm.password}
                    onChange={(e) => setSingleForm({ ...singleForm, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const randomPassword = generateRandomPassword()
                      setSingleForm({ ...singleForm, password: randomPassword })
                    }}
                    title="Generate random password"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recovery">Recovery Email</Label>
                <Select
                  value={singleForm.recovery}
                  onValueChange={(value) => setSingleForm({ ...singleForm, recovery: value === "none" ? "" : value })}
                >
                  <SelectTrigger id="recovery">
                    <SelectValue
                      placeholder={loadingRecoveryEmails ? "Loading..." : "Select recovery email (optional)"}
                    />
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
                <p className="text-sm text-muted-foreground">Select from existing accounts or leave empty</p>
              </div>

              {profileType === "local" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">Local Browser Configuration (Chrome Only)</h4>

                  <div className="space-y-2">
                    <Label htmlFor="proxySelect">Select Proxy (Optional)</Label>
                    <Select
                      value={singleForm.proxyId}
                      onValueChange={(value) => setSingleForm({ ...singleForm, proxyId: value })}
                    >
                      <SelectTrigger id="proxySelect">
                        <SelectValue placeholder={loadingProxies ? "Loading..." : "Select a working proxy"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Manual Entry)</SelectItem>
                        {workingProxies.map((proxy) => (
                          <SelectItem key={proxy.id} value={proxy.id}>
                            {proxy.name || `${proxy.proxy_server}:${proxy.proxy_port}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Only showing working proxies. Select "None" to enter manually.
                    </p>
                  </div>

                  {!singleForm.proxyId && (
                    <>
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="proxyIp">Proxy IP (Optional)</Label>
                          <Input
                            id="proxyIp"
                            value={singleForm.proxyIp}
                            onChange={(e) => setSingleForm({ ...singleForm, proxyIp: e.target.value })}
                            placeholder="102.129.208.102"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="proxyPort">Proxy Port</Label>
                          <Input
                            id="proxyPort"
                            value={singleForm.proxyPort}
                            onChange={(e) => setSingleForm({ ...singleForm, proxyPort: e.target.value })}
                            placeholder="12323"
                          />
                        </div>
                      </div>

                      {singleForm.proxyIp && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="proxyUsername">Proxy Username</Label>
                            <Input
                              id="proxyUsername"
                              value={singleForm.proxyUsername}
                              onChange={(e) => setSingleForm({ ...singleForm, proxyUsername: e.target.value })}
                              placeholder="14a03104f588b"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="proxyPassword">Proxy Password</Label>
                            <Input
                              id="proxyPassword"
                              type="password"
                              value={singleForm.proxyPassword}
                              onChange={(e) => setSingleForm({ ...singleForm, proxyPassword: e.target.value })}
                              placeholder="c311b7035d"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <AdvancedFingerprintSettings
                settings={singleForm.fingerprintSettings}
                onChange={(settings) => setSingleForm({ ...singleForm, fingerprintSettings: settings })}
              />

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
                  placeholder="email1@gmail.com,password123,recovery1@email.com,102.129.208.102,user1,pass1,12323&#10;email2@gmail.com,password456,recovery2@email.com,103.130.209.103,user2,pass2,12324"
                  rows={8}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Format: email,password,recovery,proxy_ip,proxy_user,proxy_pass,proxy_port (one per line)
                  <br />
                  Example: email@gmail.com,pass123,recovery@email.com,102.129.208.102,proxyuser,proxypass,12323
                  <br />
                  Proxy fields are optional. Leave empty to use default proxy below.
                </p>
              </div>

              {bulkForm.profileType === "local" && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium text-sm">
                    Local Browser Configuration (Chrome Only - Applied to All Profiles)
                  </h4>

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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulkProxyIp">Default Proxy IP (Optional)</Label>
                      <Input
                        id="bulkProxyIp"
                        value={bulkForm.proxyIp}
                        onChange={(e) => setBulkForm({ ...bulkForm, proxyIp: e.target.value })}
                        placeholder="102.129.208.102"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bulkProxyPort">Default Proxy Port</Label>
                      <Input
                        id="bulkProxyPort"
                        value={bulkForm.proxyPort}
                        onChange={(e) => setBulkForm({ ...bulkForm, proxyPort: e.target.value })}
                        placeholder="12323"
                      />
                    </div>
                  </div>

                  {bulkForm.proxyIp && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulkProxyUsername">Default Proxy Username</Label>
                        <Input
                          id="bulkProxyUsername"
                          value={bulkForm.proxyUsername}
                          onChange={(e) => setBulkForm({ ...bulkForm, proxyUsername: e.target.value })}
                          placeholder="14a03104f588b"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulkProxyPassword">Default Proxy Password</Label>
                        <Input
                          id="bulkProxyPassword"
                          type="password"
                          value={bulkForm.proxyPassword}
                          onChange={(e) => setBulkForm({ ...bulkForm, proxyPassword: e.target.value })}
                          placeholder="c311b7035d"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <AdvancedFingerprintSettings
                settings={bulkForm.fingerprintSettings}
                onChange={(settings) => setBulkForm({ ...bulkForm, fingerprintSettings: settings })}
              />

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
