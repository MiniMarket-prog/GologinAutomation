"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, Square, Copy, Check } from "lucide-react"

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

interface WebDriverInfo {
  profileId: string
  webdriverUrl: string
  port: number
}

export default function KameleoTestPage() {
  const [profiles, setProfiles] = useState<KameleoProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<any>(null)
  const [activeConnections, setActiveConnections] = useState<WebDriverInfo[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/kameleo-test/connection", {
        method: "POST",
      })
      const data = await response.json()
      setConnectionStatus(data)
    } catch (error) {
      setConnectionStatus({ success: false, message: "Failed to connect" })
    } finally {
      setLoading(false)
    }
  }

  const loadProfiles = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/kameleo-test/list", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        setProfiles(data.profiles)
      }
    } catch (error) {
      console.error("Failed to load profiles:", error)
    } finally {
      setLoading(false)
    }
  }

  const startProfile = async (profileId: string) => {
    setActionLoading(profileId)
    try {
      const response = await fetch("/api/kameleo-test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })
      const data = await response.json()
      if (data.success) {
        const connectionInfo: WebDriverInfo = {
          profileId: data.profileId,
          webdriverUrl: data.webdriverUrl,
          port: data.port,
        }
        setActiveConnections((prev) => [...prev.filter((c) => c.profileId !== profileId), connectionInfo])
      } else {
        alert(`Failed to start profile: ${data.message}`)
      }
    } catch (error) {
      alert("Failed to start profile")
    } finally {
      setActionLoading(null)
    }
  }

  const stopProfile = async (profileId: string) => {
    setActionLoading(profileId)
    try {
      const response = await fetch("/api/kameleo-test/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })
      const data = await response.json()
      if (data.success) {
        setActiveConnections((prev) => prev.filter((c) => c.profileId !== profileId))
      } else {
        alert(`Failed to stop profile: ${data.message}`)
      }
    } catch (error) {
      alert("Failed to stop profile")
    } finally {
      setActionLoading(null)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Kameleo Test Dashboard</h1>
        <p className="text-muted-foreground">Manage and test Kameleo browser profiles</p>
      </div>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Test</CardTitle>
          <CardDescription>Test connection to Kameleo Local API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testConnection} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Test Connection
          </Button>
          {connectionStatus && (
            <div
              className={`p-4 rounded-lg ${
                connectionStatus.success ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
              }`}
            >
              <p className="font-medium">{connectionStatus.message}</p>
              {connectionStatus.profileCount !== undefined && (
                <p className="text-sm mt-1">Profiles available: {connectionStatus.profileCount}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {activeConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active WebDriver Connections</CardTitle>
            <CardDescription>Use these URLs to connect with Selenium or Puppeteer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeConnections.map((conn) => {
              const profile = profiles.find((p) => p.id === conn.profileId)
              return (
                <div key={conn.profileId} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{profile?.name || "Unknown Profile"}</h4>
                    <Badge variant="secondary">Running</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">WebDriver URL:</span>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-xs">{conn.webdriverUrl}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(conn.webdriverUrl, `url-${conn.profileId}`)}
                        >
                          {copiedId === `url-${conn.profileId}` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Profile ID:</span>
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-muted rounded text-xs">{conn.profileId}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(conn.profileId, `id-${conn.profileId}`)}
                        >
                          {copiedId === `id-${conn.profileId}` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-muted/50 rounded text-xs space-y-1">
                    <p className="font-medium">Selenium Example:</p>
                    <code className="block">
                      options.add_experimental_option("kameleo:profileId", "{conn.profileId}")
                      <br />
                      driver = webdriver.Remote(command_executor="{conn.webdriverUrl}", options=options)
                    </code>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Profile List */}
      <Card>
        <CardHeader>
          <CardTitle>Browser Profiles</CardTitle>
          <CardDescription>Manage your Kameleo browser profiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadProfiles} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Load Profiles
          </Button>

          {profiles.length > 0 && (
            <div className="space-y-3">
              {profiles.map((profile) => {
                const isActive = activeConnections.some((c) => c.profileId === profile.id)
                return (
                  <div
                    key={profile.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isActive ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{profile.name}</h3>
                        <Badge variant="outline">{profile.device.type}</Badge>
                        {isActive && <Badge variant="secondary">Running</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {profile.browser.product} {profile.browser.version}
                        </span>
                        <span>•</span>
                        <span>{profile.os.family}</span>
                        <span>•</span>
                        <span>{profile.device.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => startProfile(profile.id)}
                        disabled={actionLoading === profile.id || isActive}
                      >
                        {actionLoading === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Start
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => stopProfile(profile.id)}
                        disabled={actionLoading === profile.id || !isActive}
                      >
                        {actionLoading === profile.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            Stop
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {profiles.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No profiles loaded. Click "Load Profiles" to fetch your Kameleo profiles.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
