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
import { Plus, Upload, Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface AddProfileDialogProps {
  onSuccess?: () => void
}

export function AddProfileDialog({ onSuccess }: AddProfileDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [folders, setFolders] = useState<string[]>([])
  const [loadingFolders, setLoadingFolders] = useState(false)

  // Single profile form
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
  })

  // Bulk upload form
  const [bulkForm, setBulkForm] = useState({
    csvData: "",
    folderOption: "existing" as "existing" | "new",
    existingFolder: "",
    newFolderName: "",
    autoGenerateFolderName: false,
  })

  const [bulkResults, setBulkResults] = useState<{
    created: number
    failed: number
    errors: string[]
  } | null>(null)

  // Load folders when dialog opens
  useEffect(() => {
    if (open) {
      loadFolders()
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
      // Determine folder name
      let folderName = ""
      if (singleForm.folderOption === "existing") {
        folderName = singleForm.existingFolder
      } else {
        folderName = singleForm.autoGenerateFolderName ? generateFolderName() : singleForm.newFolderName
      }

      // Determine profile name
      const profileName = singleForm.autoGenerateProfileName
        ? generateProfileName(singleForm.email)
        : singleForm.profileName

      const response = await fetch("/api/profiles/create-with-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: singleForm.email,
          password: singleForm.password,
          recovery: singleForm.recovery,
          folderName,
          profileName,
        }),
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
      // Parse CSV data
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

      // Determine folder name
      let folderName = ""
      if (bulkForm.folderOption === "existing") {
        folderName = bulkForm.existingFolder
      } else {
        folderName = bulkForm.autoGenerateFolderName ? generateFolderName() : bulkForm.newFolderName
      }

      const response = await fetch("/api/profiles/bulk-create-with-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profiles,
          folderName,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create profiles")
      }

      const results = await response.json()
      setBulkResults(results)

      // Reset form after successful bulk creation
      setBulkForm({
        csvData: "",
        folderOption: "existing",
        existingFolder: "",
        newFolderName: "",
        autoGenerateFolderName: false,
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
                        <SelectItem key={folder} value={folder}>
                          {folder}
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
                        <SelectItem key={folder} value={folder}>
                          {folder}
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
                  </p>
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
