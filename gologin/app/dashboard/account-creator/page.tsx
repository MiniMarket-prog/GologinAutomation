"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  Download,
  Play,
  StopCircle,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  AdvancedFingerprintSettings,
  type FingerprintSettings,
} from "@/components/profiles/advanced-fingerprint-settings"

interface AccountTask {
  id: string
  email: string | null
  password: string | null
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  status: string
  error_message: string | null
  created_at: string
  completed_at: string | null
}

interface UserProxy {
  id: string
  name: string
  proxy_server: string
  proxy_port: number
  proxy_username?: string
  proxy_password?: string
  is_working: boolean
  location_country?: string
  location_city?: string
  proxy_type?: string
}

interface ProfileWithGmail {
  id: string
  profile_name: string
  gmail_email: string
  profile_type: "gologin" | "local"
}

export default function AccountCreatorPage() {
  const [count, setCount] = useState(1)
  const [selectedProxy, setSelectedProxy] = useState<string>("")
  const [proxies, setProxies] = useState<UserProxy[]>([])
  const [useExistingProfile, setUseExistingProfile] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<string>("")
  const [profilesWithGmail, setProfilesWithGmail] = useState<ProfileWithGmail[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>("italy")
  const [isCreating, setIsCreating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [tasks, setTasks] = useState<AccountTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [useCustomFingerprint, setUseCustomFingerprint] = useState(false)
  const [fingerprintSettings, setFingerprintSettings] = useState<FingerprintSettings>({
    mode: "auto",
  })
  const [isClearing, setIsClearing] = useState(false)
  const shouldStopProcessing = useRef(false)

  useEffect(() => {
    fetchTasks()
    fetchProxies()
    fetchProfilesWithGmail()
    const interval = setInterval(fetchTasks, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const refreshSession = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("[v0] Session refresh error:", error)
        return false
      }
      return true
    } catch (err) {
      console.error("[v0] Session refresh failed:", err)
      return false
    }
  }

  const fetchWithRetry = async (url: string, options?: RequestInit, retries = 1): Promise<Response> => {
    try {
      const response = await fetch(url, options)

      // If 401, try to refresh session and retry once
      if (response.status === 401 && retries > 0) {
        console.log("[v0] Got 401, attempting to refresh session...")
        const refreshed = await refreshSession()
        if (refreshed) {
          console.log("[v0] Session refreshed, retrying request...")
          return fetchWithRetry(url, options, retries - 1)
        }
      }

      return response
    } catch (err) {
      throw err
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetchWithRetry("/api/account-creator/tasks")
      if (!response.ok) {
        // Don't throw error on 401 to prevent logging out
        if (response.status === 401) {
          console.warn("[v0] Session expired, tasks not loaded")
          return
        }
        throw new Error("Failed to fetch tasks")
      }
      const data = await response.json()
      setTasks(data.tasks || [])
    } catch (err) {
      console.error("Error fetching tasks:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProxies = async () => {
    try {
      const response = await fetchWithRetry("/api/user-proxies")
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("[v0] Session expired, proxies not loaded")
          return
        }
        throw new Error("Failed to fetch proxies")
      }
      const data = await response.json()
      // Only show working proxies
      setProxies(data.proxies?.filter((p: UserProxy) => p.is_working) || [])
    } catch (err) {
      console.error("Error fetching proxies:", err)
    }
  }

  const fetchProfilesWithGmail = async () => {
    try {
      const response = await fetchWithRetry("/api/profiles?gmailStatus=ok&limit=1000")
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("[v0] Session expired, profiles not loaded")
          return
        }
        throw new Error("Failed to fetch profiles")
      }
      const data = await response.json()
      setProfilesWithGmail(
        data.profiles
          ?.filter((p: any) => p.gmail_email)
          .map((p: any) => ({
            id: p.id,
            profile_name: p.profile_name,
            gmail_email: p.gmail_email,
            profile_type: p.profile_type,
          })) || [],
      )
    } catch (err) {
      console.error("Error fetching profiles with Gmail:", err)
    }
  }

  const handleCreate = async () => {
    if (count < 1 || count > 50) {
      setError("Please enter a number between 1 and 50")
      return
    }

    if (useExistingProfile && !selectedProfile) {
      setError("Please select an existing profile")
      return
    }

    if (!selectedCountry) {
      setError("Please select a country for phone verification")
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      let proxyData = {}
      if (selectedProxy) {
        const proxy = proxies.find((p) => p.id === selectedProxy)
        if (proxy) {
          proxyData = {
            proxy_server: `http://${proxy.proxy_server}:${proxy.proxy_port}`,
            proxy_username: proxy.proxy_username || null,
            proxy_password: proxy.proxy_password || null,
          }
        }
      }

      const requestBody = {
        count,
        ...proxyData,
        country: selectedCountry,
        ...(useCustomFingerprint && { fingerprintSettings }),
        ...(useExistingProfile && {
          use_existing_profile: true,
          existing_profile_id: selectedProfile,
        }),
      }

      const response = await fetchWithRetry("/api/account-creator/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create accounts")
      }

      await fetchTasks()
      setCount(1)
      setUseExistingProfile(false)
      setSelectedProfile("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create accounts")
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartProcessing = async () => {
    shouldStopProcessing.current = false
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetchWithRetry("/api/account-creator/process", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to process tasks")
      }

      const data = await response.json()
      console.log("[v0] Processing result:", data)

      await fetchTasks()

      if (stats.pending > 0 && !shouldStopProcessing.current) {
        setTimeout(handleStartProcessing, 2000) // Wait 2 seconds before next batch
      } else if (shouldStopProcessing.current) {
        console.log("[v0] Processing stopped by user")
        setIsProcessing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process tasks")
      setIsProcessing(false)
    }
  }

  const handleStopProcessing = () => {
    shouldStopProcessing.current = true
    setIsProcessing(false)
    console.log("[v0] Stop processing requested")
  }

  const handleClearPendingTasks = async () => {
    if (!confirm("Are you sure you want to delete all pending tasks? This action cannot be undone.")) {
      return
    }

    setIsClearing(true)
    setError(null)

    try {
      const response = await fetchWithRetry("/api/account-creator/tasks/clear-pending", {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to clear pending tasks")
      }

      const data = await response.json()
      console.log("[v0] Cleared tasks:", data)

      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear pending tasks")
    } finally {
      setIsClearing(false)
    }
  }

  const downloadCSV = () => {
    const completedTasks = tasks.filter((t) => t.status === "completed" && t.email)
    if (completedTasks.length === 0) return

    const csv = [
      ["Email", "Password", "First Name", "Last Name", "Phone Number", "Created At"].join(","),
      ...completedTasks.map((t) =>
        [t.email, t.password, t.first_name, t.last_name, t.phone_number, new Date(t.created_at).toLocaleString()].join(
          ",",
        ),
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gmail-accounts-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: Clock, label: "Pending" },
      getting_number: { variant: "default", icon: Phone, label: "Getting Number" },
      creating: { variant: "default", icon: Loader2, label: "Creating" },
      verifying: { variant: "default", icon: Mail, label: "Verifying" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed" },
      failed: { variant: "destructive", icon: AlertCircle, label: "Failed" },
    }

    const config = variants[status] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    pending: tasks.filter((t) => t.status === "pending").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    inProgress: tasks.filter((t) => ["getting_number", "creating", "verifying"].includes(t.status)).length,
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gmail Account Creator</h1>
        <p className="text-muted-foreground">Create Gmail accounts automatically with phone verification</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {stats.pending > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">Ready to Process</h3>
                <p className="text-sm text-muted-foreground">
                  You have {stats.pending} pending task{stats.pending > 1 ? "s" : ""} waiting to be processed
                </p>
              </div>
              <div className="flex gap-2">
                {isProcessing ? (
                  <Button onClick={handleStopProcessing} variant="destructive" size="lg">
                    <StopCircle className="mr-2 h-4 w-4" />
                    Stop Processing
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleStartProcessing} disabled={isProcessing} size="lg">
                      <Play className="mr-2 h-4 w-4" />
                      Start Processing
                    </Button>
                    <Button onClick={handleClearPendingTasks} disabled={isClearing} variant="outline" size="lg">
                      {isClearing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Clearing...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear Pending
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create Accounts</TabsTrigger>
          <TabsTrigger value="tasks">Account Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Accounts</CardTitle>
              <CardDescription>Specify how many Gmail accounts to create (1-50)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="count">Number of Accounts</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Number.parseInt(e.target.value) || 1)}
                  placeholder="Enter number of accounts"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Phone Verification Country</Label>
                <select
                  id="country"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="italy">🇮🇹 Italy</option>
                  <option value="france">🇫🇷 France</option>
                  <option value="spain">🇪🇸 Spain</option>
                  <option value="portugal">🇵🇹 Portugal</option>
                  <option value="poland">🇵🇱 Poland</option>
                  <option value="romania">🇷🇴 Romania</option>
                  <option value="bulgaria">🇧🇬 Bulgaria</option>
                  <option value="greece">🇬🇷 Greece</option>
                  <option value="hungary">🇭🇺 Hungary</option>
                  <option value="czech">🇨🇿 Czech Republic</option>
                  <option value="slovakia">🇸🇰 Slovakia</option>
                  <option value="croatia">🇭🇷 Croatia</option>
                  <option value="serbia">🇷🇸 Serbia</option>
                  <option value="lithuania">🇱🇹 Lithuania</option>
                  <option value="latvia">🇱🇻 Latvia</option>
                  <option value="estonia">🇪🇪 Estonia</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Select the country for phone verification. Test availability in the{" "}
                  <a href="/dashboard/5sim-test" className="underline">
                    5sim Test Page
                  </a>{" "}
                  first to ensure numbers are available for your chosen country.
                </p>
              </div>

              <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useExistingProfile"
                    checked={useExistingProfile}
                    onChange={(e) => {
                      setUseExistingProfile(e.target.checked)
                      if (!e.target.checked) setSelectedProfile("")
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="useExistingProfile" className="font-semibold cursor-pointer">
                    Create from existing profile (Recommended)
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Use a profile that already has a Gmail account to add new accounts. This reduces detection risk.
                </p>

                {useExistingProfile && (
                  <div className="space-y-2 mt-3">
                    <Label htmlFor="existingProfile">Select Profile</Label>
                    <select
                      id="existingProfile"
                      value={selectedProfile}
                      onChange={(e) => setSelectedProfile(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a profile...</option>
                      {profilesWithGmail.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.profile_name} - {profile.gmail_email} ({profile.profile_type})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      {profilesWithGmail.length === 0 ? (
                        <>
                          No profiles with Gmail accounts found. Create profiles with Gmail first in the{" "}
                          <a href="/dashboard/profiles" className="underline">
                            Profiles
                          </a>{" "}
                          page.
                        </>
                      ) : (
                        `${profilesWithGmail.length} profile${profilesWithGmail.length > 1 ? "s" : ""} available`
                      )}
                    </p>
                  </div>
                )}
              </div>

              {!useExistingProfile && (
                <div className="space-y-2">
                  <Label htmlFor="proxy">Proxy (Optional but Recommended)</Label>
                  <select
                    id="proxy"
                    value={selectedProxy}
                    onChange={(e) => setSelectedProxy(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No Proxy</option>
                    {proxies.map((proxy) => (
                      <option key={proxy.id} value={proxy.id}>
                        {proxy.name} - {proxy.proxy_server}:{proxy.proxy_port}
                        {proxy.location_country && ` (${proxy.location_country})`}
                        {proxy.proxy_type && ` - ${proxy.proxy_type}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {proxies.length === 0 ? (
                      <>
                        No validated proxies available. Add proxies in the{" "}
                        <a href="/dashboard/proxies" className="underline">
                          Proxy Management
                        </a>{" "}
                        page.
                      </>
                    ) : (
                      "Using a proxy helps avoid rate limiting and makes accounts more legitimate"
                    )}
                  </p>
                </div>
              )}

              {!useExistingProfile && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="useCustomFingerprint"
                      checked={useCustomFingerprint}
                      onChange={(e) => {
                        setUseCustomFingerprint(e.target.checked)
                        if (e.target.checked && fingerprintSettings.mode === "auto") {
                          // Generate random fingerprint settings
                          setFingerprintSettings({
                            mode: "custom",
                            os: ["Windows", "macOS", "Linux"][Math.floor(Math.random() * 3)] as any,
                            screen: {
                              width: [1920, 1366, 1440, 1536][Math.floor(Math.random() * 4)],
                              height: [1080, 768, 900, 864][Math.floor(Math.random() * 4)],
                            },
                            language: ["en-US", "en-GB", "fr-FR", "de-DE", "es-ES"][Math.floor(Math.random() * 5)],
                            timezone: "auto",
                            cpuCores: [4, 8, 12, 16][Math.floor(Math.random() * 4)],
                            memory: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
                            webgl: {
                              vendor: "auto",
                              renderer: "auto",
                              noise: true,
                            },
                            canvas: {
                              mode: "noise",
                            },
                            audio: {
                              noise: true,
                            },
                            webrtc: {
                              mode: "altered",
                            },
                          })
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="useCustomFingerprint" className="font-semibold cursor-pointer">
                      Use Random Fingerprints (Recommended)
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Randomize browser fingerprints for each account to avoid detection. Each profile will have unique
                    OS, screen resolution, WebGL, Canvas, and Audio fingerprints.
                  </p>

                  {useCustomFingerprint && (
                    <div className="mt-3">
                      <AdvancedFingerprintSettings settings={fingerprintSettings} onChange={setFingerprintSettings} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 bg-transparent"
                        onClick={() => {
                          // Regenerate random settings
                          setFingerprintSettings({
                            mode: "custom",
                            os: ["Windows", "macOS", "Linux"][Math.floor(Math.random() * 3)] as any,
                            screen: {
                              width: [1920, 1366, 1440, 1536][Math.floor(Math.random() * 4)],
                              height: [1080, 768, 900, 864][Math.floor(Math.random() * 4)],
                            },
                            language: ["en-US", "en-GB", "fr-FR", "de-DE", "es-ES"][Math.floor(Math.random() * 5)],
                            timezone: "auto",
                            cpuCores: [4, 8, 12, 16][Math.floor(Math.random() * 4)],
                            memory: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
                            webgl: {
                              vendor: "auto",
                              renderer: "auto",
                              noise: true,
                            },
                            canvas: {
                              mode: "noise",
                            },
                            audio: {
                              noise: true,
                            },
                            webrtc: {
                              mode: "altered",
                            },
                          })
                        }}
                      >
                        Randomize Again
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleCreate} disabled={isCreating} className="w-full">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Tasks...
                  </>
                ) : (
                  `Create ${count} Account${count > 1 ? "s" : ""}`
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {useExistingProfile ? (
                <>
                  <p>1. Opens the selected profile that already has a Gmail account</p>
                  <p>2. Navigates to Gmail and clicks "Add account"</p>
                  <p>3. Creates new Gmail accounts through the trusted session</p>
                  <p>4. Verifies accounts with SMS codes from 5sim.net</p>
                  <p>5. Saves completed accounts for your use</p>
                  <p className="text-orange-600 font-medium mt-2">
                    ⚠ Note: Using existing profiles reduces detection but may link accounts together
                  </p>
                </>
              ) : (
                <>
                  <p>1. System generates random names, birthdates, and secure passwords</p>
                  <p>2. Obtains phone numbers from 5sim.net for verification</p>
                  <p>3. Creates Gmail accounts with automated browser interaction</p>
                  <p>4. Verifies accounts with SMS codes from 5sim.net</p>
                  <p>5. Saves completed accounts for your use</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Account Creation Tasks</CardTitle>
                <CardDescription>View all account creation tasks and their status</CardDescription>
              </div>
              <Button onClick={downloadCSV} disabled={stats.completed === 0} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Completed
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No account creation tasks yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="font-mono text-sm">{task.email || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{task.password || "-"}</TableCell>
                        <TableCell>
                          {task.first_name && task.last_name ? `${task.first_name} ${task.last_name}` : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{task.phone_number || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(task.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-red-600">{task.error_message || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
