"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, TrendingDown, Activity, Clock } from "lucide-react"
import { format } from "date-fns"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface Analytics {
  taskTypeDistribution: Array<{ name: string; value: number }>
  successRateByTaskType: Array<{ name: string; rate: number; total: number }>
  averageDurationByTaskType: Array<{ name: string; duration: number }>
  activityByHour: Array<{ hour: number; count: number }>
  topProfiles: Array<{ name: string; count: number; successRate: number }>
  folderActivity: Array<{ name: string; count: number; successRate: number }>
  errorPatterns: Array<{ error: string; count: number }>
  dailyActivity: Array<{ date: string; total: number; success: number; failed: number }>
  summary: {
    totalActivities: number
    successfulActivities: number
    failedActivities: number
    averageDuration: number
  }
}

export function ActivityAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
  const [dateTo, setDateTo] = useState<Date>(new Date())

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      })

      const response = await fetch(`/api/activity/analytics?${params}`)
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error("[v0] Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [dateFrom, dateTo])

  if (loading || !analytics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const successRate = Math.round((analytics.summary.successfulActivities / analytics.summary.totalActivities) * 100)

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Analytics Period</CardTitle>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={(date) => date && setDateFrom(date)} />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={(date) => date && setDateTo(date)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.totalActivities}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            {successRate >= 80 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.summary.averageDuration / 1000).toFixed(1)}s</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Tasks</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.summary.failedActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Task Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.taskTypeDistribution.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
                <Progress value={(item.value / analytics.summary.totalActivities) * 100} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Success Rate by Task Type */}
        <Card>
          <CardHeader>
            <CardTitle>Success Rate by Task Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.successRateByTaskType.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground">{item.rate}%</span>
                </div>
                <Progress
                  value={item.rate}
                  className={item.rate >= 80 ? "" : item.rate >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Profiles */}
        <Card>
          <CardHeader>
            <CardTitle>Top Active Profiles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.topProfiles.slice(0, 10).map((profile, index) => (
              <div key={profile.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{index + 1}</Badge>
                  <span className="text-sm font-medium">{profile.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{profile.count} tasks</span>
                  <Badge variant={profile.successRate >= 80 ? "default" : "destructive"}>{profile.successRate}%</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Folder Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Activity by Folder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.folderActivity
              .sort((a, b) => b.count - a.count)
              .map((folder) => (
                <div key={folder.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{folder.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{folder.count}</span>
                      <Badge variant={folder.successRate >= 80 ? "default" : "destructive"} className="text-xs">
                        {folder.successRate}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={(folder.count / analytics.summary.totalActivities) * 100} />
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Error Patterns */}
      {analytics.errorPatterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Common Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.errorPatterns.map((error) => (
                <div key={error.error} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm">{error.error}</span>
                  <Badge variant="destructive">{error.count} occurrences</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.dailyActivity.map((day) => (
              <div key={day.date} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{format(new Date(day.date), "MMM dd, yyyy")}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span className="text-green-600">{day.success} success</span>
                    <span className="text-red-600">{day.failed} failed</span>
                    <span>{day.total} total</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Progress value={(day.success / day.total) * 100} className="flex-1" />
                  <Progress value={(day.failed / day.total) * 100} className="flex-1 [&>div]:bg-red-500" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
