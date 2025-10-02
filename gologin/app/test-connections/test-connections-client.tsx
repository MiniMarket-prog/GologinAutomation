"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Loader2, Database, Globe } from "lucide-react"

interface SupabaseStatus {
  connected: boolean
  error: string | null
  profileCount: number
  taskCount: number
}

interface GoLoginStatus {
  connected: boolean
  error: string | null
  profileCount: number
  endpoint: string | null
}

interface TestConnectionsClientProps {
  initialSupabaseStatus: SupabaseStatus
}

export function TestConnectionsClient({ initialSupabaseStatus }: TestConnectionsClientProps) {
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>(initialSupabaseStatus)
  const [gologinStatus, setGoLoginStatus] = useState<GoLoginStatus>({
    connected: false,
    error: null,
    profileCount: 0,
    endpoint: null,
  })
  const [testing, setTesting] = useState(false)

  const testGoLogin = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test/gologin")
      const data = await response.json()

      if (response.ok) {
        setGoLoginStatus({
          connected: true,
          error: null,
          profileCount: data.profileCount,
          endpoint: data.endpoint,
        })
      } else {
        setGoLoginStatus({
          connected: false,
          error: data.error || "Failed to connect",
          profileCount: 0,
          endpoint: null,
        })
      }
    } catch (error) {
      setGoLoginStatus({
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        profileCount: 0,
        endpoint: null,
      })
    } finally {
      setTesting(false)
    }
  }

  const retestSupabase = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/test/supabase")
      const data = await response.json()

      if (response.ok) {
        setSupabaseStatus({
          connected: true,
          error: null,
          profileCount: data.profileCount,
          taskCount: data.taskCount,
        })
      } else {
        setSupabaseStatus({
          connected: false,
          error: data.error || "Failed to connect",
          profileCount: 0,
          taskCount: 0,
        })
      }
    } catch (error) {
      setSupabaseStatus({
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
        profileCount: 0,
        taskCount: 0,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Connection Tests</h1>
        <p className="text-muted-foreground">
          Test your Supabase database and GoLogin API connections to ensure everything is configured correctly.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Supabase Connection Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <CardTitle>Supabase Database</CardTitle>
              </div>
              {supabaseStatus.connected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
            <CardDescription>Database connection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {supabaseStatus.connected ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profiles in DB:</span>
                  <span className="font-medium">{supabaseStatus.profileCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks in DB:</span>
                  <span className="font-medium">{supabaseStatus.taskCount}</span>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-green-600">Database is connected and working properly.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">Connection Failed</p>
                {supabaseStatus.error && (
                  <p className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">
                    {supabaseStatus.error}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Make sure you have added the Supabase integration and run the SQL scripts.
                </p>
              </div>
            )}
            <Button onClick={retestSupabase} disabled={testing} className="w-full bg-transparent" variant="outline">
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Retest Connection"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* GoLogin API Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                <CardTitle>GoLogin API</CardTitle>
              </div>
              {gologinStatus.connected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : gologinStatus.error ? (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              ) : (
                <Badge variant="secondary">Not Tested</Badge>
              )}
            </div>
            <CardDescription>GoLogin API connection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gologinStatus.connected ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profiles found:</span>
                  <span className="font-medium">{gologinStatus.profileCount}</span>
                </div>
                {gologinStatus.endpoint && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Endpoint:</span>
                    <span className="font-mono text-xs">{gologinStatus.endpoint}</span>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-sm text-green-600">GoLogin API is connected and working properly.</p>
                </div>
              </div>
            ) : gologinStatus.error ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive font-medium">Connection Failed</p>
                <p className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded-md">{gologinStatus.error}</p>
                <p className="text-sm text-muted-foreground">
                  Make sure you have added the GOLOGIN_API_KEY environment variable.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Click the button below to test your GoLogin API connection.
                </p>
              </div>
            )}
            <Button onClick={testGoLogin} disabled={testing} className="w-full">
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test GoLogin Connection"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Required Environment Variables</CardTitle>
          <CardDescription>Make sure these are set in your .env.local file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_URL</span>
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">GOLOGIN_API_KEY</span>
              <span className="text-xs text-muted-foreground">(server-side only)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
