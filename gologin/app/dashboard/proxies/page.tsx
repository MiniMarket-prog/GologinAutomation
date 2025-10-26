"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import React from "react"
import {
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Users,
  ChevronDown,
  ChevronUp,
  MapPin,
  Server,
  Home,
  Smartphone,
  Network,
  Download,
  TrendingUp,
  BarChart3,
  Activity,
  Plus,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface ProxyStats {
  proxy_server: string
  profile_count: number
  last_used: string | null
  usernames: string[]
  profile_names: string[]
  location?: { country: string; city: string; ip: string }
  proxyType?: string
}

interface BulkTestResult {
  proxy: string
  success: boolean
  message: string
  responseTime?: number
  location?: { country: string; city: string }
  proxyType?: string
}

interface UserProxy {
  id: string
  name: string
  proxy_server: string
  proxy_port: number
  proxy_username?: string
  proxy_password?: string
  location_country?: string
  location_city?: string
  proxy_type?: string
  is_working: boolean
  response_time?: number
  last_tested_at?: string
}

export default function ProxiesPage() {
  const [proxyStats, setProxyStats] = useState<ProxyStats[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [bulkProxies, setBulkProxies] = useState("")
  const [bulkTesting, setBulkTesting] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkTestResult[]>([])
  const [userProxies, setUserProxies] = useState<UserProxy[]>([])
  const [loadingUserProxies, setLoadingUserProxies] = useState(false)
  const [testingProxyId, setTestingProxyId] = useState<string | null>(null)
  const [bulkProxyInput, setBulkProxyInput] = useState("")
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkImportResults, setBulkImportResults] = useState<
    Array<{
      proxy: string
      success: boolean
      message: string
    }>
  >([])
  const [newProxy, setNewProxy] = useState({
    name: "",
    proxy_server: "",
    proxy_port: "",
    proxy_username: "",
    proxy_password: "",
  })
  const [addingProxy, setAddingProxy] = useState(false)

  useEffect(() => {
    fetchProxyStats()
    fetchUserProxies()
    checkAdmin()
    const interval = setInterval(() => {
      fetchProxyStats()
      fetchUserProxies()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const checkAdmin = async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase.auth.getUser()
    setIsAdmin(data.user?.user_metadata?.role === "admin")
  }

  const fetchProxyStats = async () => {
    try {
      const response = await fetch("/api/proxies/stats")
      if (response.ok) {
        const data = await response.json()
        setProxyStats(data.stats || [])
      }
    } catch (error) {
      console.error("Failed to fetch proxy stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const testBulkProxies = async () => {
    if (!bulkProxies.trim()) return

    setBulkTesting(true)
    setBulkResults([])

    const lines = bulkProxies.trim().split("\n")
    const results: BulkTestResult[] = []

    for (const line of lines) {
      const parts = line.split(",").map((s) => s.trim())
      if (parts.length < 2) continue

      const [ip, username, password, port] = parts
      const proxyString = `${ip}:${port || parts[3]}`

      try {
        const response = await fetch("/api/proxies/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip,
            port: port || parts[3],
            username,
            password,
          }),
        })

        const data = await response.json()
        results.push({
          proxy: proxyString,
          success: data.success,
          message: data.message,
          responseTime: data.responseTime,
          location: data.location,
          proxyType: data.proxyType,
        })
      } catch (error) {
        results.push({
          proxy: proxyString,
          success: false,
          message: "Failed to test",
        })
      }

      setBulkResults([...results])
    }

    setBulkTesting(false)
  }

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedRows(newExpanded)
  }

  const downloadProfileList = (stat: ProxyStats) => {
    const csv = [
      ["Profile Name", "Proxy Server", "Last Used"].join(","),
      ...stat.profile_names.map((name) => [name, stat.proxy_server, stat.last_used || "Never"].join(",")),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `profiles-${stat.proxy_server.replace(/[^a-z0-9]/gi, "_")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getHealthStatus = (profileCount: number) => {
    if (profileCount === 0) return { label: "Unused", color: "bg-gray-500", icon: Globe }
    if (profileCount <= 3) return { label: "Healthy", color: "bg-green-500", icon: CheckCircle }
    if (profileCount <= 7) return { label: "Moderate", color: "bg-yellow-500", icon: AlertTriangle }
    return { label: "Overused", color: "bg-red-500", icon: XCircle }
  }

  const getProxyTypeInfo = (type?: string) => {
    switch (type) {
      case "Datacenter":
        return { icon: Server, color: "text-blue-500", label: "Datacenter" }
      case "Residential":
        return { icon: Home, color: "text-green-500", label: "Residential" }
      case "ISP (Static Residential)":
        return { icon: Network, color: "text-purple-500", label: "ISP Static" }
      case "Mobile":
        return { icon: Smartphone, color: "text-orange-500", label: "Mobile" }
      default:
        return { icon: Globe, color: "text-gray-500", label: "Unknown" }
    }
  }

  const fetchUserProxies = async () => {
    setLoadingUserProxies(true)
    try {
      const response = await fetch("/api/user-proxies")
      if (response.ok) {
        const data = await response.json()
        setUserProxies(data.proxies || [])
      }
    } catch (error) {
      console.error("Failed to fetch user proxies:", error)
    } finally {
      setLoadingUserProxies(false)
    }
  }

  const handleBulkImport = async () => {
    if (!bulkProxyInput.trim()) return

    setBulkImporting(true)
    setBulkImportResults([])

    const lines = bulkProxyInput.trim().split("\n")
    const results: Array<{ proxy: string; success: boolean; message: string }> = []

    for (const line of lines) {
      const trimmedLine = line.trim()
      if (!trimmedLine) continue

      let proxyData: {
        name: string
        proxy_server: string
        proxy_port: number
        proxy_username?: string
        proxy_password?: string
      } | null = null

      // Try different formats
      // Format 1: ip,username,password,port
      if (trimmedLine.includes(",")) {
        const parts = trimmedLine.split(",").map((s) => s.trim())
        if (parts.length >= 2) {
          const [ip, username, password, port] = parts
          proxyData = {
            name: `${ip}:${port || parts[3]}`,
            proxy_server: ip,
            proxy_port: Number.parseInt(port || parts[3] || "8080"),
            proxy_username: username || undefined,
            proxy_password: password || undefined,
          }
        }
      }
      // Format 2: protocol://username:password@ip:port or ip:port:username:password
      else if (trimmedLine.includes(":")) {
        // Try protocol://username:password@ip:port
        const protocolMatch = trimmedLine.match(/^(?:https?:\/\/)?(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/)
        if (protocolMatch) {
          const [, username, password, ip, port] = protocolMatch
          proxyData = {
            name: `${ip}:${port}`,
            proxy_server: ip,
            proxy_port: Number.parseInt(port),
            proxy_username: username || undefined,
            proxy_password: password || undefined,
          }
        } else {
          // Try ip:port:username:password
          const parts = trimmedLine.split(":")
          if (parts.length >= 2) {
            proxyData = {
              name: `${parts[0]}:${parts[1]}`,
              proxy_server: parts[0],
              proxy_port: Number.parseInt(parts[1]),
              proxy_username: parts[2] || undefined,
              proxy_password: parts[3] || undefined,
            }
          }
        }
      }

      if (!proxyData) {
        results.push({
          proxy: trimmedLine,
          success: false,
          message: "Invalid format",
        })
        setBulkImportResults([...results])
        continue
      }

      // Add proxy to database
      try {
        const response = await fetch("/api/user-proxies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(proxyData),
        })

        const data = await response.json()

        if (response.ok) {
          results.push({
            proxy: `${proxyData.proxy_server}:${proxyData.proxy_port}`,
            success: true,
            message: data.message || "Added successfully",
          })
        } else {
          results.push({
            proxy: `${proxyData.proxy_server}:${proxyData.proxy_port}`,
            success: false,
            message: data.message || data.error || "Failed to add",
          })
        }
      } catch (error: any) {
        results.push({
          proxy: `${proxyData.proxy_server}:${proxyData.proxy_port}`,
          success: false,
          message: error.message || "Error adding proxy",
        })
      }

      setBulkImportResults([...results])
    }

    setBulkImporting(false)
    fetchUserProxies()
  }

  const handleAddProxy = async () => {
    if (!newProxy.proxy_server || !newProxy.proxy_port) {
      alert("Proxy server and port are required")
      return
    }

    setAddingProxy(true)
    try {
      const response = await fetch("/api/user-proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProxy.name || `${newProxy.proxy_server}:${newProxy.proxy_port}`,
          proxy_server: newProxy.proxy_server,
          proxy_port: Number.parseInt(newProxy.proxy_port),
          proxy_username: newProxy.proxy_username || undefined,
          proxy_password: newProxy.proxy_password || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNewProxy({
          name: "",
          proxy_server: "",
          proxy_port: "",
          proxy_username: "",
          proxy_password: "",
        })
        fetchUserProxies()
        alert("Proxy added and validated successfully!")
      } else {
        alert(`Failed to add proxy: ${data.message || data.error}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    } finally {
      setAddingProxy(false)
    }
  }

  const handleDeleteProxy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this proxy?")) return

    try {
      const response = await fetch(`/api/user-proxies/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchUserProxies()
      } else {
        alert("Failed to delete proxy")
      }
    } catch (error) {
      alert("Error deleting proxy")
    }
  }

  const handleTestProxy = async (id: string) => {
    setTestingProxyId(id)
    try {
      const response = await fetch(`/api/user-proxies/${id}/test`, {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        alert(`Proxy is working! Response time: ${data.responseTime}ms`)
      } else {
        alert(`Proxy test failed: ${data.message}`)
      }

      fetchUserProxies()
    } catch (error: any) {
      alert(`Error testing proxy: ${error.message}`)
    } finally {
      setTestingProxyId(null)
    }
  }

  const uniqueProxyCount = proxyStats.length
  const totalProfilesWithProxy = proxyStats.reduce((sum, stat) => sum + stat.profile_count, 0)
  const healthyProxies = proxyStats.filter((s) => s.profile_count > 0 && s.profile_count <= 3).length
  const moderateProxies = proxyStats.filter((s) => s.profile_count >= 4 && s.profile_count <= 7).length
  const overusedProxies = proxyStats.filter((s) => s.profile_count >= 8).length
  const unusedProxies = proxyStats.filter((s) => s.profile_count === 0).length

  const proxyTypeDistribution = proxyStats.reduce(
    (acc, stat) => {
      const type = stat.proxyType || "Unknown"
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const geoDistribution = proxyStats.reduce(
    (acc, stat) => {
      if (stat.location) {
        const country = stat.location.country
        acc[country] = (acc[country] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const healthScore =
    Math.round(
      ((healthyProxies * 100 + moderateProxies * 60 + overusedProxies * 20) /
        (healthyProxies + moderateProxies + overusedProxies || 1)) *
        100,
    ) / 100

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Proxy Management</h1>
        <p className="text-muted-foreground">Monitor, test, and optimize your proxy infrastructure</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="my-proxies">My Proxies</TabsTrigger>
          <TabsTrigger value="test">Bulk Test</TabsTrigger>
          <TabsTrigger value="list">Proxy List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Proxies</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueProxyCount}</div>
                <p className="text-xs text-muted-foreground">{isAdmin ? "Across all users" : "In your account"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Profiles</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProfilesWithProxy}</div>
                <p className="text-xs text-muted-foreground">Using proxies</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Health Score</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthScore}%</div>
                <p className="text-xs text-muted-foreground">
                  {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "Needs attention"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Healthy Proxies</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{healthyProxies}</div>
                <p className="text-xs text-muted-foreground">Optimal usage</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Health Distribution</CardTitle>
                <CardDescription>Proxy usage breakdown</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm">Healthy (1-3 profiles)</span>
                  </div>
                  <Badge variant="outline">{healthyProxies}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Moderate (4-7 profiles)</span>
                  </div>
                  <Badge variant="outline">{moderateProxies}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="text-sm">Overused (8+ profiles)</span>
                  </div>
                  <Badge variant="outline">{overusedProxies}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-500" />
                    <span className="text-sm">Unused</span>
                  </div>
                  <Badge variant="outline">{unusedProxies}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Optimize your proxy usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {overusedProxies > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      You have {overusedProxies} overused {overusedProxies === 1 ? "proxy" : "proxies"}. Consider adding
                      more proxies to distribute the load.
                    </AlertDescription>
                  </Alert>
                )}
                {moderateProxies > healthyProxies && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Most proxies are moderately used. Adding more proxies will improve distribution.
                    </AlertDescription>
                  </Alert>
                )}
                {healthScore >= 80 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>Your proxy infrastructure is well-optimized!</AlertDescription>
                  </Alert>
                )}
                {unusedProxies > 0 && (
                  <Alert>
                    <Globe className="h-4 w-4" />
                    <AlertDescription>
                      You have {unusedProxies} unused {unusedProxies === 1 ? "proxy" : "proxies"}. Consider assigning
                      them to profiles.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="my-proxies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import Proxies</CardTitle>
              <CardDescription>
                Import multiple proxies at once. Supported formats:
                <br />• ip,username,password,port
                <br />• ip:port:username:password
                <br />• protocol://username:password@ip:port
                <br />• ip:port (without authentication)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-proxy-input">Proxy List (one per line)</Label>
                <Textarea
                  id="bulk-proxy-input"
                  placeholder="102.129.208.102,username,password,12323&#10;103.45.67.89:8080:user2:pass2&#10;http://user3:pass3@104.56.78.90:3128&#10;105.67.89.10:8080"
                  value={bulkProxyInput}
                  onChange={(e) => setBulkProxyInput(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Each proxy will be tested before being added. This may take several minutes for large lists.
                </AlertDescription>
              </Alert>

              <Button onClick={handleBulkImport} disabled={bulkImporting || !bulkProxyInput.trim()} className="w-full">
                {bulkImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing {bulkImportResults.length} /{" "}
                    {
                      bulkProxyInput
                        .trim()
                        .split("\n")
                        .filter((l) => l.trim()).length
                    }
                    ...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Import{" "}
                    {
                      bulkProxyInput
                        .trim()
                        .split("\n")
                        .filter((l) => l.trim()).length
                    }{" "}
                    Proxies
                  </>
                )}
              </Button>

              {bulkImportResults.length > 0 && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      Results: {bulkImportResults.filter((r) => r.success).length} / {bulkImportResults.length}{" "}
                      successful
                    </p>
                  </div>
                  {bulkImportResults.map((result, index) => (
                    <Alert key={index} variant={result.success ? "default" : "destructive"}>
                      <AlertDescription className="flex items-center gap-2">
                        {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span className="font-mono text-sm">{result.proxy}</span>
                        <span className="text-xs">{result.message}</span>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Proxy</CardTitle>
              <CardDescription>Add and validate your own proxies for account creation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="proxy-name">Name (Optional)</Label>
                  <Input
                    id="proxy-name"
                    placeholder="My Proxy 1"
                    value={newProxy.name}
                    onChange={(e) => setNewProxy({ ...newProxy, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-server">
                    Proxy Server <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="proxy-server"
                    placeholder="102.129.208.102"
                    value={newProxy.proxy_server}
                    onChange={(e) => setNewProxy({ ...newProxy, proxy_server: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-port">
                    Port <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="proxy-port"
                    placeholder="12323"
                    type="number"
                    value={newProxy.proxy_port}
                    onChange={(e) => setNewProxy({ ...newProxy, proxy_port: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-username">Username (Optional)</Label>
                  <Input
                    id="proxy-username"
                    placeholder="username"
                    value={newProxy.proxy_username}
                    onChange={(e) => setNewProxy({ ...newProxy, proxy_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-password">Password (Optional)</Label>
                  <Input
                    id="proxy-password"
                    type="password"
                    placeholder="password"
                    value={newProxy.proxy_password}
                    onChange={(e) => setNewProxy({ ...newProxy, proxy_password: e.target.value })}
                  />
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The proxy will be tested before being added. This may take up to 30 seconds.
                </AlertDescription>
              </Alert>

              <Button onClick={handleAddProxy} disabled={addingProxy} className="w-full">
                {addingProxy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing and Adding Proxy...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Proxy
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Proxies</CardTitle>
              <CardDescription>Manage your validated proxies</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUserProxies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : userProxies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No proxies added yet. Add your first proxy above.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Response Time</TableHead>
                      <TableHead>Last Tested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userProxies.map((proxy) => {
                      const typeInfo = getProxyTypeInfo(proxy.proxy_type)
                      const TypeIcon = typeInfo.icon
                      return (
                        <TableRow key={proxy.id}>
                          <TableCell className="font-medium">{proxy.name}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {proxy.proxy_server}:{proxy.proxy_port}
                          </TableCell>
                          <TableCell>
                            {proxy.location_country ? (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {proxy.location_city}, {proxy.location_country}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {proxy.proxy_type && (
                              <div className="flex items-center gap-2">
                                <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                                <span className="text-sm">{typeInfo.label}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {proxy.is_working ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Working
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500">
                                <XCircle className="mr-1 h-3 w-3" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {proxy.response_time ? `${proxy.response_time}ms` : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {proxy.last_tested_at ? new Date(proxy.last_tested_at).toLocaleString() : "Never"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTestProxy(proxy.id)}
                                disabled={testingProxyId === proxy.id}
                              >
                                {testingProxyId === proxy.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteProxy(proxy.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Proxy Testing</CardTitle>
              <CardDescription>
                Test multiple proxies at once. Format: ip,username,password,port (one per line)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-proxies">Proxy List</Label>
                <Textarea
                  id="bulk-proxies"
                  placeholder="102.129.208.102,14a03104f588b,c311b7035d,12323&#10;103.45.67.89,user2,pass2,8080&#10;104.56.78.90,user3,pass3,3128"
                  value={bulkProxies}
                  onChange={(e) => setBulkProxies(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={testBulkProxies} disabled={bulkTesting || !bulkProxies.trim()} className="w-full">
                {bulkTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing {bulkResults.length} / {bulkProxies.trim().split("\n").length}...
                  </>
                ) : (
                  `Test ${
                    bulkProxies
                      .trim()
                      .split("\n")
                      .filter((l) => l.trim()).length
                  } Proxies`
                )}
              </Button>

              {bulkResults.length > 0 && (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      Results: {bulkResults.filter((r) => r.success).length} / {bulkResults.length} successful
                    </p>
                  </div>
                  {bulkResults.map((result, index) => (
                    <Alert key={index} variant={result.success ? "default" : "destructive"}>
                      <AlertDescription className="space-y-1">
                        <div className="flex items-center gap-2">
                          {result.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          <span className="font-mono text-sm">{result.proxy}</span>
                          <span className="text-xs">
                            {result.message}
                            {result.responseTime && ` (${result.responseTime}ms)`}
                          </span>
                        </div>
                        {result.proxyType && (
                          <div className="flex items-center gap-2 text-xs mt-1">
                            {(() => {
                              const typeInfo = getProxyTypeInfo(result.proxyType)
                              const TypeIcon = typeInfo.icon
                              return (
                                <>
                                  <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                                  <span className="font-medium">{typeInfo.label}</span>
                                </>
                              )
                            })()}
                          </div>
                        )}
                        {result.location && (
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {result.location.city}, {result.location.country}
                            </span>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proxy Usage Statistics</CardTitle>
              <CardDescription>Detailed view of all proxies and their usage</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : proxyStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No proxies configured yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proxy Server</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Profiles</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>Last Used</TableHead>
                      {isAdmin && <TableHead>Users</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proxyStats.map((stat, index) => {
                      const health = getHealthStatus(stat.profile_count)
                      const HealthIcon = health.icon
                      const isExpanded = expandedRows.has(index)
                      const typeInfo = getProxyTypeInfo(stat.proxyType)
                      const TypeIcon = typeInfo.icon
                      return (
                        <React.Fragment key={index}>
                          <TableRow>
                            <TableCell className="font-mono text-sm">{stat.proxy_server || "No proxy"}</TableCell>
                            <TableCell>
                              {stat.location ? (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className="h-3 w-3" />
                                  <span>
                                    {stat.location.city}, {stat.location.country}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {typeInfo.label && (
                                <div className="flex items-center gap-2">
                                  <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                                  <span className="text-sm">{typeInfo.label}</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{stat.profile_count}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${health.color}`} />
                                <span className="text-sm">{health.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {stat.last_used ? new Date(stat.last_used).toLocaleDateString() : "Never"}
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-sm text-muted-foreground">
                                {stat.usernames.join(", ")}
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {stat.profile_count > 0 && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => downloadProfileList(stat)}
                                      title="Download profile list"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => toggleRow(index)}>
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={isAdmin ? 8 : 7} className="bg-muted/50">
                                <div className="py-2 px-4">
                                  <p className="text-sm font-medium mb-2">Profiles using this proxy:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {stat.profile_names.map((name, i) => (
                                      <Badge key={i} variant="secondary">
                                        {name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Proxy Type Distribution</CardTitle>
                <CardDescription>Breakdown by proxy type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(proxyTypeDistribution).map(([type, count]) => {
                  const typeInfo = getProxyTypeInfo(type)
                  const TypeIcon = typeInfo.icon
                  const percentage = Math.round((count / uniqueProxyCount) * 100)
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                          <span className="text-sm">{typeInfo.label}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${typeInfo.color.replace("text-", "bg-")}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Geographic Distribution</CardTitle>
                <CardDescription>Proxies by country</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(geoDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([country, count]) => {
                    const percentage = Math.round((count / uniqueProxyCount) * 100)
                    return (
                      <div key={country} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{country}</span>
                          </div>
                          <span className="text-sm font-medium">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Usage Insights</CardTitle>
              <CardDescription>Key metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Average Profiles per Proxy</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {uniqueProxyCount > 0 ? (totalProfilesWithProxy / uniqueProxyCount).toFixed(1) : 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Most Used Proxy</span>
                  </div>
                  <p className="text-lg font-bold">
                    {proxyStats.length > 0 ? `${Math.max(...proxyStats.map((s) => s.profile_count))} profiles` : "N/A"}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Utilization Rate</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {uniqueProxyCount > 0
                      ? Math.round(((uniqueProxyCount - unusedProxies) / uniqueProxyCount) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
