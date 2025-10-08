"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle2, Clock, Users, Mail, TrendingUp, AlertCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { Progress } from "@/components/ui/progress"

interface DashboardStats {
  profiles: {
    total: number
    byStatus: {
      idle: number
      running: number
      paused: number
      error: number
    }
  }
  gmail: {
    ok: number
    blocked: number
    not_checked: number
    other: number
  }
  tasks: {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
  }
  successRate: number
  activity: {
    total: number
    successful: number
    failed: number
  }
}

export function EnhancedStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats")
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error("[v0] Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !stats) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.profiles.total}</div>
            <p className="text-xs text-muted-foreground">{stats.profiles.byStatus.running} running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tasks.pending + stats.tasks.running}</div>
            <p className="text-xs text-muted-foreground">
              {stats.tasks.pending} pending, {stats.tasks.running} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.tasks.completed} completed, {stats.tasks.failed} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">24h Activity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activity.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activity.successful} successful, {stats.activity.failed} failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gmail Status Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Working
                </span>
                <span className="font-medium">{stats.gmail.ok}</span>
              </div>
              <Progress value={(stats.gmail.ok / stats.profiles.total) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Blocked
                </span>
                <span className="font-medium">{stats.gmail.blocked}</span>
              </div>
              <Progress value={(stats.gmail.blocked / stats.profiles.total) * 100} className="h-2 [&>div]:bg-red-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Not Checked
                </span>
                <span className="font-medium">{stats.gmail.not_checked}</span>
              </div>
              <Progress
                value={(stats.gmail.not_checked / stats.profiles.total) * 100}
                className="h-2 [&>div]:bg-gray-500"
              />
            </div>

            {stats.gmail.other > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Other Issues
                  </span>
                  <span className="font-medium">{stats.gmail.other}</span>
                </div>
                <Progress
                  value={(stats.gmail.other / stats.profiles.total) * 100}
                  className="h-2 [&>div]:bg-yellow-500"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Profile Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Idle</span>
                <span className="font-medium">{stats.profiles.byStatus.idle}</span>
              </div>
              <Progress value={(stats.profiles.byStatus.idle / stats.profiles.total) * 100} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Running</span>
                <span className="font-medium">{stats.profiles.byStatus.running}</span>
              </div>
              <Progress
                value={(stats.profiles.byStatus.running / stats.profiles.total) * 100}
                className="h-2 [&>div]:bg-green-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Paused</span>
                <span className="font-medium">{stats.profiles.byStatus.paused}</span>
              </div>
              <Progress
                value={(stats.profiles.byStatus.paused / stats.profiles.total) * 100}
                className="h-2 [&>div]:bg-yellow-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Error</span>
                <span className="font-medium">{stats.profiles.byStatus.error}</span>
              </div>
              <Progress
                value={(stats.profiles.byStatus.error / stats.profiles.total) * 100}
                className="h-2 [&>div]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
