"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RefreshCw } from "lucide-react"

interface WarmupOverviewProps {
  onRefresh: () => void
}

export function WarmupOverview({ onRefresh }: WarmupOverviewProps) {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/warmup/campaigns")
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error("[v0] Error loading campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const toggleCampaign = async (campaignId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "paused" : "active"
      await fetch(`/api/warmup/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      loadCampaigns()
      onRefresh()
    } catch (error) {
      console.error("[v0] Error toggling campaign:", error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Campaigns</CardTitle>
            <CardDescription>Monitor and control your warmup campaigns</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadCampaigns}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No campaigns yet. Create your first warmup campaign to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Accounts</TableHead>
                <TableHead>Day</TableHead>
                <TableHead>Sent Today</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">{campaign.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        campaign.status === "active"
                          ? "default"
                          : campaign.status === "paused"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.total_accounts}</TableCell>
                  <TableCell>
                    {campaign.current_day} / {campaign.settings?.duration || 60}
                  </TableCell>
                  <TableCell>{campaign.emails_sent_today || 0}</TableCell>
                  <TableCell>{campaign.success_rate || 0}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => toggleCampaign(campaign.id, campaign.status)}>
                      {campaign.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
