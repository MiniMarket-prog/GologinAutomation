"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ActivityFeed } from "./activity-feed"
import { ActivityAnalytics } from "./activity-analytics"
import { ActivityTimeline } from "./activity-timeline"
import { BarChart3, List, Clock } from "lucide-react"

export function ActivityDashboard() {
  const [activeTab, setActiveTab] = useState("feed")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="feed" className="flex items-center gap-2">
          <List className="h-4 w-4" />
          Feed
        </TabsTrigger>
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="timeline" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
        </TabsTrigger>
      </TabsList>

      <TabsContent value="feed" className="space-y-6">
        <ActivityFeed />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <ActivityAnalytics />
      </TabsContent>

      <TabsContent value="timeline" className="space-y-6">
        <ActivityTimeline />
      </TabsContent>
    </Tabs>
  )
}
