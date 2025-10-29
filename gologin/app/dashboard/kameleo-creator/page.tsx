"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Plus, Trash2, FolderPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RecoveryEmail {
  id: string
  email: string
}

interface Folder {
  name: string
  gologinCount?: number
  localCount?: number
  totalCount?: number
}

export default function KameleoCreatorPage() {
  const [profileName, setProfileName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [folderName, setFolderName] = useState("")
  const [deviceType, setDeviceType] = useState<"desktop" | "mobile">("desktop")
  const [browser, setBrowser] = useState<"chrome" | "firefox" | "edge" | "safari">("chrome")
  const [os, setOs] = useState("")
  const [proxyServer, setProxyServer] = useState("")
  const [proxyUsername, setProxyUsername] = useState("")
  const [proxyPassword, setProxyPassword] = useState("")
  const [recoveryEmails, setRecoveryEmails] = useState<RecoveryEmail[]>([])
  const [newRecoveryEmail, setNewRecoveryEmail] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [folders, setFolders] = useState<(string | Folder)[]>([])
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const { toast } = useToast()

  // Load existing folders and recovery emails
  useEffect(() => {
    loadFolders()
    loadRecoveryEmails()
  }, [])

  const loadFolders = async () => {
    try {
      const response = await fetch("/api/folders")
      if (response.ok) {
        const data = await response.json()
        const foldersData = data.folders || []
        setFolders(foldersData)
      }
    } catch (error) {
      console.error("Failed to load folders:", error)
    }
  }

  const loadRecoveryEmails = async () => {
    try {
      const response = await fetch("/api/profiles?profile_type=gologin,local,kameleo")
      if (response.ok) {
        const data = await response.json()
        const emails = data.profiles
          .filter((p: any) => p.recovery_email)
          .map((p: any) => ({
            id: p.id,
            email: p.recovery_email,
          }))
        setRecoveryEmails(emails)
      }
    } catch (error) {
      console.error("Failed to load recovery emails:", error)
    }
  }

  const addRecoveryEmail = () => {
    if (newRecoveryEmail && !recoveryEmails.find((e) => e.email === newRecoveryEmail)) {
      setRecoveryEmails([...recoveryEmails, { id: Date.now().toString(), email: newRecoveryEmail }])
      setNewRecoveryEmail("")
    }
  }

  const removeRecoveryEmail = (id: string) => {
    setRecoveryEmails(recoveryEmails.filter((e) => e.id !== id))
  }

  const createFolder = () => {
    if (newFolderName && !folders.some((f) => (typeof f === "string" ? f : f.name) === newFolderName)) {
      setFolders([...folders, newFolderName])
      setFolderName(newFolderName)
      setNewFolderName("")
      setShowNewFolderInput(false)
      toast({
        title: "Folder created",
        description: `Folder "${newFolderName}" has been created`,
      })
    }
  }

  const handleCreateProfile = async () => {
    if (!profileName || !email || !password || !folderName) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (recoveryEmails.length === 0) {
      toast({
        title: "No recovery emails",
        description: "Please add at least one recovery email",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      // Select a random recovery email
      const randomRecovery = recoveryEmails[Math.floor(Math.random() * recoveryEmails.length)]

      const response = await fetch("/api/kameleo/profiles/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileName,
          email,
          password,
          recovery: randomRecovery.email,
          folderName,
          deviceType,
          browser,
          os: os || undefined,
          proxy: proxyServer
            ? {
                server: proxyServer,
                username: proxyUsername || undefined,
                password: proxyPassword || undefined,
              }
            : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create profile")
      }

      const data = await response.json()

      toast({
        title: "Profile created",
        description: `Kameleo profile "${profileName}" has been created successfully`,
      })

      // Reset form
      setProfileName("")
      setEmail("")
      setPassword("")
      setProxyServer("")
      setProxyUsername("")
      setProxyPassword("")
    } catch (error) {
      console.error("Failed to create profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create profile",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Kameleo Account Creator</h1>
        <p className="text-muted-foreground mt-2">
          Create Gmail accounts using Kameleo profiles with custom fingerprints and local browser automation
        </p>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Note:</strong> Kameleo Desktop application must be running on your machine (default port: 5050) for
          this feature to work.
        </AlertDescription>
      </Alert>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Profile Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Configuration</CardTitle>
            <CardDescription>Configure your Kameleo profile settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profileName">Profile Name *</Label>
              <Input
                id="profileName"
                placeholder="Enter profile name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Gmail Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="username@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder">Folder *</Label>
              <div className="flex gap-2">
                <Select value={folderName} onValueChange={setFolderName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((folder, index) => {
                      const folderName = typeof folder === "string" ? folder : folder.name
                      const folderValue = typeof folder === "string" ? folder : folder.name
                      return (
                        <SelectItem key={`${folderName}-${index}`} value={folderValue}>
                          {folderName}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                  title="Create new folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>
              {showNewFolderInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="New folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                  />
                  <Button onClick={createFolder}>Create</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type</Label>
                <Select value={deviceType} onValueChange={(v: any) => setDeviceType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="browser">Browser</Label>
                <Select value={browser} onValueChange={(v: any) => setBrowser(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chrome">Chrome</SelectItem>
                    <SelectItem value="firefox">Firefox</SelectItem>
                    <SelectItem value="edge">Edge</SelectItem>
                    <SelectItem value="safari">Safari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="os">Operating System (Optional)</Label>
              <Input
                id="os"
                placeholder="e.g., windows, macos, linux"
                value={os}
                onChange={(e) => setOs(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Proxy & Recovery Emails */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Proxy Configuration</CardTitle>
              <CardDescription>Optional proxy settings for the profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proxyServer">Proxy Server</Label>
                <Input
                  id="proxyServer"
                  placeholder="host:port (e.g., 192.168.1.1:8080)"
                  value={proxyServer}
                  onChange={(e) => setProxyServer(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proxyUsername">Username</Label>
                  <Input
                    id="proxyUsername"
                    placeholder="Optional"
                    value={proxyUsername}
                    onChange={(e) => setProxyUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proxyPassword">Password</Label>
                  <Input
                    id="proxyPassword"
                    type="password"
                    placeholder="Optional"
                    value={proxyPassword}
                    onChange={(e) => setProxyPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recovery Emails *</CardTitle>
              <CardDescription>Add recovery emails to use during account creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="recovery@example.com"
                  value={newRecoveryEmail}
                  onChange={(e) => setNewRecoveryEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addRecoveryEmail()}
                />
                <Button onClick={addRecoveryEmail} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {recoveryEmails.map((email) => (
                  <div key={email.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{email.email}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeRecoveryEmail(email.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {recoveryEmails.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recovery emails added yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleCreateProfile} disabled={isCreating} size="lg">
          {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Profile & Start Account Creation
        </Button>
      </div>
    </div>
  )
}
