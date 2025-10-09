"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"

interface TimelineEvent {
  id: string
  action: string
  success: boolean
  duration_ms: number | null
  created_at: string
  gologin_profiles: {
    profile_name: string
    folder_name: string | null
  } | null
}

export function ActivityTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const fetchTimeline = async () => {
    setLoading(true)
    try {
      const startOfDay = new Date(selectedDate)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(selectedDate)
      endOfDay.setHours(23, 59, 59, 999)

      const params = new URLSearchParams({
        dateFrom: startOfDay.toISOString(),
        dateTo: endOfDay.toISOString(),
        limit: "1000",
      })

      const response = await fetch(`/api/activity?${params}`)
      const data = await response.json()
      setEvents(data.data || [])
    } catch (error) {
      console.error("[v0] Error fetching timeline:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
  }, [selectedDate])

  // Group events by hour
  const eventsByHour: Record<number, TimelineEvent[]> = {}
  events.forEach((event) => {
    const hour = new Date(event.created_at).getHours()
    if (!eventsByHour[hour]) {
      eventsByHour[hour] = []
    }
    eventsByHour[hour].push(event)
  })

  return (
    <div className="space-y-6">
      {/* Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Activity Timeline</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No activity on this date</p>
            </div>
          ) : (
            <div className="relative space-y-8">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 h-full w-0.5 bg-border" />

              {/* Events by hour */}
              {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => {
                const hourEvents = eventsByHour[hour] || []
                if (hourEvents.length === 0) return null

                return (
                  <div key={hour} className="relative pl-12">
                    {/* Hour marker */}
                    <div className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-bold text-primary-foreground">
                      {hour}
                    </div>

                    {/* Hour label */}
                    <div className="mb-4 text-sm font-medium text-muted-foreground">
                      {format(new Date().setHours(hour, 0, 0, 0), "h:mm a")}
                    </div>

                    {/* Events in this hour */}
                    <div className="space-y-3">
                      {hourEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant={event.success ? "default" : "destructive"}>
                                  {event.success ? "Success" : "Failed"}
                                </Badge>
                                <span className="font-medium">{event.action.replace(/_/g, " ").toUpperCase()}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{event.gologin_profiles?.profile_name || "Unknown"}</span>
                                {event.gologin_profiles?.folder_name && (
                                  <>
                                    <span>•</span>
                                    <span>{event.gologin_profiles.folder_name}</span>
                                  </>
                                )}
                                {event.duration_ms && (
                                  <>
                                    <span>•</span>
                                    <span>{event.duration_ms}ms</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at), "h:mm:ss a")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
