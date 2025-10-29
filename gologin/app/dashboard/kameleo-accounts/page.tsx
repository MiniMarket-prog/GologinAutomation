"use client"

import { useState, useEffect } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { useToast } from "@/hooks/use-toast"
import { Download, Play, Square, Trash2 } from "lucide-react"
import type { UserProxy } from "@/lib/kameleo/types"

interface KameleoProfile {
  id: string
  name: string
  device: {
    type: string
    name: string
  }
  os: {
    family: string
  }
  browser: {
    product: string
    version: string
  }
}

interface Task {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  email: string | null
  password: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  country: string
  recovery_email: string | null
  profile_id: string
  profile_type: string
  error_message: string | null
  created_at: string
  completed_at: string | null
}

interface Stats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
}

const COUNTRIES = [
  { code: "france", name: "France" },
  { code: "germany", name: "Germany" },
  { code: "spain", name: "Spain" },
  { code: "italy", name: "Italy" },
  { code: "netherlands", name: "Netherlands" },
  { code: "belgium", name: "Belgium" },
  { code: "poland", name: "Poland" },
  { code: "romania", name: "Romania" },
  { code: "portugal", name: "Portugal" },
  { code: "sweden", name: "Sweden" },
  { code: "austria", name: "Austria" },
  { code: "czech", name: "Czech Republic" },
  { code: "greece", name: "Greece" },
  { code: "hungary", name: "Hungary" },
  { code: "denmark", name: "Denmark" },
  { code: "finland", name: "Finland" },
]

export default function KameleoAccountsPage() {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0 })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [proxies, setProxies] = useState<UserProxy[]>([])
  const [isLoadingProxies, setIsLoadingProxies] = useState(false)

  const [kameleoProfiles, setKameleoProfiles] = useState<KameleoProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)

  const [accountCount, setAccountCount] = useState<number>(1)
  const [country, setCountry] = useState<string>("france")
  const [profileId, setProfileId] = useState<string>("")
  const [profileType, setProfileType] = useState<string>("empty")
  const [proxyId, setProxyId] = useState<string>("none")
  const [recoveryEmails, setRecoveryEmails] = useState<string>("")

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

  const fetchProxies = async () => {
    setIsLoadingProxies(true)
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

      if (data.proxies) {
        const workingProxies = data.proxies.filter((p: UserProxy) => p.is_working === true)
        setProxies(workingProxies)
      }
    } catch (error) {
      console.error("Error fetching proxies:", error)
    } finally {
      setIsLoadingProxies(false)
    }
  }

  const fetchKameleoProfiles = async () => {
    setIsLoadingProfiles(true)
    try {
      const response = await fetch("/api/kameleo-test/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch Kameleo profiles")
      }
      const data = await response.json()

      if (data.success && data.profiles) {
        setKameleoProfiles(data.profiles)
      } else {
        console.error("Error fetching Kameleo profiles:", data.error)
        toast({
          title: "Warning",
          description: data.message || "Failed to fetch Kameleo profiles. Make sure Kameleo Local API is running.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching Kameleo profiles:", error)
      toast({
        title: "Warning",
        description:
          "Failed to fetch Kameleo profiles. Make sure Kameleo Local API is running on http://localhost:5050",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProfiles(false)
    }
  }

  const fetchTasks = async () => {
    try {
      const response = await fetchWithRetry("/api/kameleo-accounts/tasks")
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("[v0] Session expired, tasks not loaded")
          return
        }
        throw new Error("Failed to fetch tasks")
      }
      const data = await response.json()

      if (data.success) {
        setTasks(data.tasks)
        setStats(data.stats)
      } else {
        console.error("[v0] Error fetching tasks:", data.error)
      }
    } catch (error) {
      console.error("[v0] Error fetching tasks:", error)
    }
  }

  useEffect(() => {
    fetchTasks()
    fetchProxies()
    fetchKameleoProfiles()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleCreateTasks = async () => {
    if (!profileId) {
      toast({
        title: "Error",
        description: "Please enter a Kameleo profile ID",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const recoveryEmailList = recoveryEmails
        .split("\n")
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      const response = await fetchWithRetry("/api/kameleo-accounts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: accountCount,
          country,
          profileId,
          profileType,
          proxyId: proxyId && proxyId !== "none" ? proxyId : null,
          recoveryEmails: recoveryEmailList.length > 0 ? recoveryEmailList : null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        })
        fetchTasks()
      } else {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartProcessing = async () => {
    setIsProcessing(true)

    const processNext = async () => {
      try {
        const response = await fetchWithRetry("/api/kameleo-accounts/process", {
          method: "POST",
        })

        const data = await response.json()

        if (data.success) {
          fetchTasks()

          if (data.hasMore && isProcessing) {
            setTimeout(processNext, 2000)
          } else {
            setIsProcessing(false)
            toast({
              title: "Processing Complete",
              description: "All tasks have been processed",
            })
          }
        } else {
          setIsProcessing(false)
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          })
        }
      } catch (error: any) {
        setIsProcessing(false)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    }

    processNext()
  }

  const handleStopProcessing = () => {
    setIsProcessing(false)
    toast({
      title: "Processing Stopped",
      description: "Task processing has been stopped",
    })
  }

  const handleClearPending = async () => {
    try {
      const response = await fetchWithRetry("/api/kameleo-accounts/tasks?status=pending", {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Pending tasks cleared",
        })
        fetchTasks()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      completed: "outline",
      failed: "destructive",
    }

    return <Badge variant={variants[status] || "default"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kameleo Account Creator</h1>
            <p className="text-muted-foreground">Create Gmail accounts using Kameleo profiles</p>
          </div>
          <Button onClick={() => {}} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="create" className="space-y-4">
          <TabsList>
            <TabsTrigger value="create">Create Accounts</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create New Accounts</CardTitle>
                <CardDescription>Configure and create Gmail account tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="count">Number of Accounts</Label>
                    <Input
                      id="count"
                      type="number"
                      min={1}
                      max={50}
                      value={accountCount}
                      onChange={(e) => setAccountCount(Number.parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileId">Kameleo Profile ID</Label>
                    <Select value={profileId} onValueChange={setProfileId}>
                      <SelectTrigger id="profileId">
                        <SelectValue
                          placeholder={
                            isLoadingProfiles
                              ? "Loading profiles..."
                              : kameleoProfiles.length > 0
                                ? "Select a Kameleo profile"
                                : "No profiles available"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {kameleoProfiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{profile.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {profile.device.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>
                                  {profile.browser.product} {profile.browser.version}
                                </span>
                                <span>•</span>
                                <span>{profile.os.family}</span>
                                <span>•</span>
                                <span>{profile.device.name}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {kameleoProfiles.length > 0
                        ? `${kameleoProfiles.length} profile${kameleoProfiles.length > 1 ? "s" : ""} available from Kameleo Local API`
                        : "No profiles available. Create profiles in Kameleo desktop app or make sure Kameleo Local API is running."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profileType">Profile Type</Label>
                    <Select value={profileType} onValueChange={(v: any) => setProfileType(v)}>
                      <SelectTrigger id="profileType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empty">Empty Profile</SelectItem>
                        <SelectItem value="with_gmail">Profile with Gmail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="proxy">Proxy (Optional)</Label>
                    <Select value={proxyId} onValueChange={setProxyId}>
                      <SelectTrigger id="proxy">
                        <SelectValue
                          placeholder={isLoadingProxies ? "Loading proxies..." : "Select a proxy or leave empty"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Proxy</SelectItem>
                        {proxies.map((proxy) => (
                          <SelectItem key={proxy.id} value={proxy.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {proxy.proxy_server}:{proxy.proxy_port}
                              </span>
                              {proxy.proxy_type && (
                                <Badge variant="outline" className="text-xs">
                                  {proxy.proxy_type}
                                </Badge>
                              )}
                              {proxy.location_country && (
                                <span className="text-xs text-muted-foreground">
                                  {proxy.location_city
                                    ? `${proxy.location_city}, ${proxy.location_country}`
                                    : proxy.location_country}
                                </span>
                              )}
                              {proxy.response_time && (
                                <span className="text-xs text-muted-foreground">{proxy.response_time}ms</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {proxies.length > 0
                        ? `${proxies.length} working proxy${proxies.length > 1 ? "ies" : ""} available`
                        : "No working proxies available. Add proxies in the Proxies page."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recoveryEmails">Recovery Emails (Optional)</Label>
                  <Textarea
                    id="recoveryEmails"
                    placeholder="Enter recovery emails, one per line"
                    rows={4}
                    value={recoveryEmails}
                    onChange={(e) => setRecoveryEmails(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Add recovery emails that will be randomly assigned to accounts
                  </p>
                </div>

                <Button onClick={handleCreateTasks} disabled={isLoading} className="w-full">
                  {isLoading ? <Spinner className="mr-2" /> : null}
                  Create {accountCount} Task{accountCount > 1 ? "s" : ""}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Tasks</CardTitle>
                    <CardDescription>View and manage account creation tasks</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleClearPending} variant="outline" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Pending
                    </Button>
                    {isProcessing ? (
                      <Button onClick={handleStopProcessing} variant="destructive" size="sm">
                        <Square className="mr-2 h-4 w-4" />
                        Stop Processing
                      </Button>
                    ) : (
                      <Button onClick={handleStartProcessing} disabled={stats.pending === 0} size="sm">
                        <Play className="mr-2 h-4 w-4" />
                        Start Processing
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No tasks yet. Create some accounts to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        tasks.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>{getStatusBadge(task.status)}</TableCell>
                            <TableCell className="font-mono text-sm">{task.email || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{task.password || "-"}</TableCell>
                            <TableCell>
                              {task.first_name && task.last_name ? `${task.first_name} ${task.last_name}` : "-"}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{task.phone || "-"}</TableCell>
                            <TableCell>{task.country}</TableCell>
                            <TableCell className="text-sm">{new Date(task.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-red-600">{task.error_message || "-"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </>
    </div>
  )
}
