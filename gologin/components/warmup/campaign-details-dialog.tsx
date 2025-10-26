"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, TrendingUp, Mail, CheckCircle, XCircle } from "lucide-react"

interface CampaignDetailsDialogProps {
  campaign: any
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CampaignDetailsDialog({ campaign, open, onOpenChange }: CampaignDetailsDialogProps) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && campaign) {
      loadDetails()
    }
  }, [open, campaign])

  const loadDetails = async () => {
    setLoading(true)
    try {
      // Load campaign accounts with stats
      const accountsRes = await fetch(`/api/warmup/campaigns/${campaign.id}/accounts`)
      const accountsData = await accountsRes.json()
      setAccounts(accountsData.accounts || [])

      // Load recent logs
      const logsRes = await fetch(`/api/warmup/campaigns/${campaign.id}/logs?limit=50`)
      const logsData = await logsRes.json()
      setLogs(logsData.logs || [])
    } catch (error) {
      console.error("[v0] Error loading campaign details:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalSent = accounts.reduce((sum, acc) => sum + (acc.total_emails_sent || 0), 0)
  const totalOpens = accounts.reduce((sum, acc) => sum + (acc.total_opens || 0), 0)
  const totalReplies = accounts.reduce((sum, acc) => sum + (acc.total_replies || 0), 0)
  const totalBounces = accounts.reduce((sum, acc) => sum + (acc.total_bounces || 0), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{campaign.name}</DialogTitle>
              <DialogDescription>{campaign.description}</DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadDetails} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSent}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Opens</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOpens}</div>
              <p className="text-xs text-muted-foreground">
                {totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : 0}% rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Replies</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReplies}</div>
              <p className="text-xs text-muted-foreground">
                {totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : 0}% rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bounces</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBounces}</div>
              <p className="text-xs text-muted-foreground">
                {totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : 0}% rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Account Stats */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Account Performance</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Opens</TableHead>
                  <TableHead>Replies</TableHead>
                  <TableHead>Bounces</TableHead>
                  <TableHead>Last Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No accounts in this campaign
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.profile_name}</TableCell>
                      <TableCell>Cohort {account.cohort_number}</TableCell>
                      <TableCell>
                        <Badge variant={account.status === "active" ? "default" : "secondary"}>{account.status}</Badge>
                      </TableCell>
                      <TableCell>{account.total_emails_sent || 0}</TableCell>
                      <TableCell>{account.total_opens || 0}</TableCell>
                      <TableCell>{account.total_replies || 0}</TableCell>
                      <TableCell>{account.total_bounces || 0}</TableCell>
                      <TableCell>
                        {account.last_email_sent_at ? new Date(account.last_email_sent_at).toLocaleString() : "Never"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent Activity Logs */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No activity yet
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell>{log.profile_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action_type}</Badge>
                      </TableCell>
                      <TableCell>{log.recipient_email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
