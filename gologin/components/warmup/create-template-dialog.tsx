"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface CreateTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: any
  onSuccess: () => void
}

export function CreateTemplateDialog({ open, onOpenChange, template, onSuccess }: CreateTemplateDialogProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    category: "general",
  })

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category || "general",
      })
    } else {
      setFormData({
        name: "",
        subject: "",
        body: "",
        category: "general",
      })
    }
  }, [template, open])

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const url = template ? `/api/warmup/templates/${template.id}` : "/api/warmup/templates"
      const method = template ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save template")

      toast({
        title: "Success",
        description: `Template ${template ? "updated" : "created"} successfully`,
      })

      onSuccess()
    } catch (error) {
      console.error("[v0] Error saving template:", error)
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {template ? "Update the email template" : "Create a new email template for warmup campaigns"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              placeholder="Friendly Greeting"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="greeting">Greeting</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line *</Label>
            <Input
              id="subject"
              placeholder="Quick hello!"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body *</Label>
            <Textarea
              id="body"
              placeholder="Hi there,&#10;&#10;Hope you're doing well! Just wanted to reach out and say hello.&#10;&#10;Best regards"
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use natural, conversational language. Avoid spam trigger words.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? "Update" : "Create"} Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
