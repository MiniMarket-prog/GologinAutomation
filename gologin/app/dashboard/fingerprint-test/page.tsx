"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

export default function FingerprintTestPage() {
  const [os, setOs] = useState<"mac" | "win" | "lin">("mac")
  const [profileName, setProfileName] = useState("fingerprint-test")
  const [email, setEmail] = useState("test@example.com")
  const [password, setPassword] = useState("TestPassword123!")
  const [isCreating, setIsCreating] = useState(false)
  const [isLaunching, setIsLaunching] = useState(false)
  const [profileId, setProfileId] = useState<number | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleCreateProfile = async () => {
    setIsCreating(true)
    setResult(null)

    try {
      const response = await fetch("/api/profiles/create-local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          recovery: "recovery@example.com",
          folderName: "Test",
          profileName,
          fingerprintSettings: {
            os,
            mode: "custom",
          },
          localConfig: {
            browser_type: "chrome",
          },
        }),
      })

      const data = await response.json()

      if (data.success) {
        setProfileId(data.profile.id)
        setResult({
          type: "success",
          message: "Profile created successfully!",
          data: {
            profileId: data.profile.id,
            storedFingerprint: data.profile.fingerprint_config,
          },
        })
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to create profile",
        })
      }
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to create profile",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleLaunchAndTest = async () => {
    if (!profileId) return

    setIsLaunching(true)
    setResult(null)

    try {
      const response = await fetch("/api/profiles/fingerprint-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      })

      const data = await response.json()

      if (data.success) {
        setResult({
          type: "success",
          message: "Profile launched and tested!",
          data: {
            selectedOS: os,
            actualUserAgent: data.userAgent,
            actualPlatform: data.platform,
            matches: data.matches,
            allNavigatorProps: data.navigatorProps,
          },
        })
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to launch profile",
        })
      }
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to launch profile",
      })
    } finally {
      setIsLaunching(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Fingerprint Test Page</h1>
        <p className="text-muted-foreground mt-2">
          Test custom fingerprint settings and verify user agent matches selected OS
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Create Test Profile</CardTitle>
            <CardDescription>Create a profile with custom fingerprint settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="os">Operating System</Label>
              <Select value={os} onValueChange={(value: any) => setOs(value)}>
                <SelectTrigger id="os">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mac">macOS</SelectItem>
                  <SelectItem value="win">Windows</SelectItem>
                  <SelectItem value="lin">Linux</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileName">Profile Name</Label>
              <Input
                id="profileName"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="fingerprint-test"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="TestPassword123!"
              />
            </div>

            <Button onClick={handleCreateProfile} disabled={isCreating} className="w-full">
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Test Profile
            </Button>
          </CardContent>
        </Card>

        {profileId && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Launch and Test</CardTitle>
              <CardDescription>Launch the profile and verify fingerprint settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLaunchAndTest} disabled={isLaunching} className="w-full">
                {isLaunching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Launch Profile & Check User Agent
              </Button>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg ${result.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`font-medium ${result.type === "success" ? "text-green-900" : "text-red-900"}`}>
                  {result.message}
                </p>

                {result.data && (
                  <div className="mt-4 space-y-3">
                    {result.data.selectedOS && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Selected OS:</p>
                        <p className="text-sm text-gray-600 font-mono">{result.data.selectedOS}</p>
                      </div>
                    )}

                    {result.data.actualUserAgent && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Actual User Agent:</p>
                        <p className="text-sm text-gray-600 font-mono break-all">{result.data.actualUserAgent}</p>
                      </div>
                    )}

                    {result.data.actualPlatform && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Actual Platform:</p>
                        <p className="text-sm text-gray-600 font-mono">{result.data.actualPlatform}</p>
                      </div>
                    )}

                    {result.data.matches !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">OS Match:</p>
                        <p className={`text-sm font-mono ${result.data.matches ? "text-green-600" : "text-red-600"}`}>
                          {result.data.matches
                            ? "✓ User agent matches selected OS"
                            : "✗ User agent does NOT match selected OS"}
                        </p>
                      </div>
                    )}

                    {result.data.allNavigatorProps && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">All Navigator Properties:</p>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                          {JSON.stringify(result.data.allNavigatorProps, null, 2)}
                        </pre>
                      </div>
                    )}

                    {result.data.storedFingerprint && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Stored Fingerprint Config:</p>
                        <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                          {JSON.stringify(result.data.storedFingerprint, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
