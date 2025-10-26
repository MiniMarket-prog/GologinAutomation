"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateCampaignDialog({ open, onOpenChange, onSuccess }: CreateCampaignDialogProps) {
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [seedAccounts, setSeedAccounts] = useState<any[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cohortCount: "5",
    duration: "60",
    selectedTemplates: [] as string[],
  })

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    try {
      // Load Gmail accounts
      const accountsRes = await fetch("/api/profiles?profile_type=local")
      const accountsData = await accountsRes.json()
      const gmailAccounts = accountsData.profiles?.filter((p: any) => p.gmail_email) || []
      setAccounts(gmailAccounts)

      // Load templates
      const templatesRes = await fetch("/api/warmup/templates")
      const templatesData = await templatesRes.json()
      setTemplates(templatesData.templates || [])

      // Load seed accounts
      const seedRes = await fetch("/api/warmup/seed-accounts")
      const seedData = await seedRes.json()
      setSeedAccounts(seedData.accounts || [])
    } catch (error) {
      console.error("[v0] Error loading data:", error)
    }
  }

  const handleSelectAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(accounts.map((a) => a.id))
    }
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Campaign name is required",
        variant: "destructive",
      })
      return
    }

    if (selectedAccounts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one account",
        variant: "destructive",
      })
      return
    }

    if (seedAccounts.length === 0) {
      toast({
        title: "Error",
        description: "Please add seed accounts in Settings first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/warmup/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          cohortCount: Number.parseInt(formData.cohortCount),
          duration: Number.parseInt(formData.duration),
          accountIds: selectedAccounts,
          templateIds: formData.selectedTemplates,
        }),
      })

      if (!response.ok) throw new Error("Failed to create campaign")

      toast({
        title: "Success",
        description: "Campaign created successfully",
      })

      onSuccess()
    } catch (error) {
      console.error("[v0] Error creating campaign:", error)
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Warmup Campaign</DialogTitle>
          <DialogDescription>Configure a new Gmail warmup campaign</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campaign Details */}
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              placeholder="Q1 2025 Warmup"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Warmup campaign for new accounts"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cohortCount">Number of Cohorts</Label>
              <Select
                value={formData.cohortCount}
                onValueChange={(value) => setFormData({ ...formData, cohortCount: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Cohorts</SelectItem>
                  <SelectItem value="5">5 Cohorts</SelectItem>
                  <SelectItem value="10">10 Cohorts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Days)</Label>
              <Select
                value={formData.duration}
                onValueChange={(value) => setFormData({ ...formData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Accounts ({selectedAccounts.length} selected)</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedAccounts.length === accounts.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto space-y-2">
              {accounts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No Gmail accounts found. Please add Gmail accounts first.
                </div>
              ) : (
                accounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={account.id}
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAccounts([...selectedAccounts, account.id])
                        } else {
                          setSelectedAccounts(selectedAccounts.filter((id) => id !== account.id))
                        }
                      }}
                    />
                    <label htmlFor={account.id} className="text-sm cursor-pointer flex-1">
                      {account.profile_name} ({account.gmail_email})
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Email Templates (Optional)</Label>
            <div className="border rounded-lg p-4 max-h-32 overflow-y-auto space-y-2">
              {templates.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-2">
                  No templates available. Default templates will be used.
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={template.id}
                      checked={formData.selectedTemplates.includes(template.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            selectedTemplates: [...formData.selectedTemplates, template.id],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            selectedTemplates: formData.selectedTemplates.filter((id) => id !== template.id),
                          })
                        }
                      }}
                    />
                    <label htmlFor={template.id} className="text-sm cursor-pointer flex-1">
                      {template.name} - {template.subject}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Seed Accounts Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <strong>Seed Accounts:</strong> {seedAccounts.length} configured
              {seedAccounts.length === 0 && (
                <span className="text-destructive ml-2">(Please add seed accounts in Settings)</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Campaign
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
