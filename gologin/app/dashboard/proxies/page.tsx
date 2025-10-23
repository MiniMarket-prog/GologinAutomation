"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
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
} from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface ProxyStats {
  proxy_server: string
  profile_count: number
  last_used: string | null
  usernames: string[]
  profile_names: string[]
  location?: { country: string; city: string; ip: string }
}

interface ProxyTestResult {
  success: boolean
  message: string
  responseTime?: number
  location?: { country: string; city: string; ip: string }
}

interface BulkTestResult {
  proxy: string
  success: boolean
  message: string
  responseTime?: number
  location?: { country: string; city: string }
}

export default function ProxiesPage() {
  const [proxyStats, setProxyStats] = useState<ProxyStats[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Test proxy form
  const [testProxyIp, setTestProxyIp] = useState("")
  const [testProxyPort, setTestProxyPort] = useState("")
  const [testProxyUser, setTestProxyUser] = useState("")
  const [testProxyPass, setTestProxyPass] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ProxyTestResult | null>(null)

  const [bulkProxies, setBulkProxies] = useState("")
  const [bulkTesting, setBulkTesting] = useState(false)
  const [bulkResults, setBulkResults] = useState<BulkTestResult[]>([])

  useEffect(() => {
    fetchProxyStats()
    checkAdmin()
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

  const testProxy = async () => {
    if (!testProxyIp || !testProxyPort) {
      setTestResult({ success: false, message: "Please enter proxy IP and port" })
      return
    }

    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/proxies/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: testProxyIp,
          port: testProxyPort,
          username: testProxyUser,
          password: testProxyPass,
        }),
      })

      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({ success: false, message: "Failed to test proxy" })
    } finally {
      setTesting(false)
    }
  }

  const testBulkProxies = async () => {
    if (!bulkProxies.trim()) {
      return
    }

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

  const getHealthStatus = (profileCount: number) => {
    if (profileCount === 0) return { label: "Unused", color: "bg-gray-500", icon: Globe }
    if (profileCount <= 3) return { label: "Healthy", color: "bg-green-500", icon: CheckCircle }
    if (profileCount <= 7) return { label: "Moderate", color: "bg-yellow-500", icon: AlertTriangle }
    return { label: "Overused", color: "bg-red-500", icon: XCircle }
  }

  const uniqueProxyCount = proxyStats.length
  const totalProfilesWithProxy = proxyStats.reduce((sum, stat) => sum + stat.profile_count, 0)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Proxy Management</h1>
        <p className="text-muted-foreground">Test proxies and monitor usage health</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Proxies</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueProxyCount}</div>
            <p className="text-xs text-muted-foreground">{isAdmin ? "Across all users" : "In your account"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profiles with Proxy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProfilesWithProxy}</div>
            <p className="text-xs text-muted-foreground">Total profiles using proxies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Health Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proxyStats.filter((s) => s.profile_count <= 3).length}</div>
            <p className="text-xs text-muted-foreground">Healthy proxies (≤3 profiles)</p>
          </CardContent>
        </Card>
      </div>

      {/* Proxy Testing Tool */}
      <Card>
        <CardHeader>
          <CardTitle>Test Proxy Connection</CardTitle>
          <CardDescription>Verify proxy works before adding to profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="test-ip">Proxy IP</Label>
              <Input
                id="test-ip"
                placeholder="102.129.208.102"
                value={testProxyIp}
                onChange={(e) => setTestProxyIp(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-port">Port</Label>
              <Input
                id="test-port"
                placeholder="12323"
                value={testProxyPort}
                onChange={(e) => setTestProxyPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-user">Username (optional)</Label>
              <Input
                id="test-user"
                placeholder="14a03104f588b"
                value={testProxyUser}
                onChange={(e) => setTestProxyUser(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-pass">Password (optional)</Label>
              <Input
                id="test-pass"
                type="password"
                placeholder="c311b7035d"
                value={testProxyPass}
                onChange={(e) => setTestProxyPass(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={testProxy} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Proxy"
            )}
          </Button>

          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              <AlertDescription className="space-y-1">
                <div className="flex items-center gap-2">
                  {testResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  <span>
                    {testResult.message}
                    {testResult.responseTime && ` (${testResult.responseTime}ms)`}
                  </span>
                </div>
                {testResult.location && (
                  <div className="flex items-center gap-2 text-sm mt-2">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {testResult.location.city}, {testResult.location.country} ({testResult.location.ip})
                    </span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
              rows={6}
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
            <div className="space-y-2 max-h-96 overflow-y-auto">
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

      {/* Proxy Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle>Proxy Usage Statistics</CardTitle>
          <CardDescription>Monitor how many profiles are using each proxy</CardDescription>
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
                  <TableHead>Profiles Using</TableHead>
                  <TableHead>Health Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  {isAdmin && <TableHead>Usernames</TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proxyStats.map((stat, index) => {
                  const health = getHealthStatus(stat.profile_count)
                  const HealthIcon = health.icon
                  const isExpanded = expandedRows.has(index)
                  return (
                    <>
                      <TableRow key={index}>
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
                          <Badge variant="outline">{stat.profile_count} profiles</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${health.color}`} />
                            <span className="text-sm">{health.label}</span>
                            <HealthIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {stat.last_used ? new Date(stat.last_used).toLocaleDateString() : "Never"}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-sm text-muted-foreground">{stat.usernames.join(", ")}</TableCell>
                        )}
                        <TableCell>
                          {stat.profile_count > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => toggleRow(index)}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={isAdmin ? 7 : 6} className="bg-muted/50">
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
                    </>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Health Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Proxy Health Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm">
              <strong>Healthy (1-3 profiles):</strong> Optimal usage, low risk of detection
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-sm">
              <strong>Moderate (4-7 profiles):</strong> Acceptable but consider adding more proxies
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-sm">
              <strong>Overused (8+ profiles):</strong> High risk, add more proxies immediately
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
