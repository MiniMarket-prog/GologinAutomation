"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, Mail, Users, AlertCircle } from "lucide-react"
import { WarmupOverview } from "@/components/warmup/warmup-overview"
import { WarmupCampaigns } from "@/components/warmup/warmup-campaigns"
import { WarmupTemplates } from "@/components/warmup/warmup-templates"
import { WarmupSettings } from "@/components/warmup/warmup-settings"
import { CreateCampaignDialog } from "@/components/warmup/create-campaign-dialog"

export default function WarmupPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [stats, setStats] = useState({
    activeCampaigns: 0,
    totalAccounts: 0,
    emailsSentToday: 0,
    successRate: 0,
  })

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch("/api/warmup/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("[v0] Error loading warmup stats:", error)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gmail Warmup</h1>
          <p className="text-muted-foreground mt-1">Gradually build sender reputation for your Gmail accounts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAccounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent Today</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emailsSentToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <WarmupOverview onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <WarmupCampaigns onRefresh={loadStats} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <WarmupTemplates />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <WarmupSettings />
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false)
          loadStats()
        }}
      />
    </div>
  )
}
