"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function WarmupSettings() {
  const [seedAccounts, setSeedAccounts] = useState<any[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadSeedAccounts()
  }, [])

  const loadSeedAccounts = async () => {
    try {
      console.log("[v0] Loading seed accounts...")
      const response = await fetch("/api/warmup/seed-accounts")
      console.log("[v0] Response status:", response.status)
      const data = await response.json()
      console.log("[v0] Seed accounts data:", data)
      setSeedAccounts(data.accounts || [])
    } catch (error) {
      console.error("[v0] Error loading seed accounts:", error)
    }
  }

  const addSeedAccount = async () => {
    if (!newEmail) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    try {
      console.log("[v0] Adding seed account:", { email: newEmail, name: newName, notes: newNotes })
      const response = await fetch("/api/warmup/seed-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          notes: newNotes,
        }),
      })

      console.log("[v0] Add response status:", response.status)
      const result = await response.json()
      console.log("[v0] Add response data:", result)

      if (!response.ok) {
        throw new Error(result.error || "Failed to add seed account")
      }

      setNewEmail("")
      setNewName("")
      setNewNotes("")
      loadSeedAccounts()

      toast({
        title: "Success",
        description: "Seed account added successfully",
      })
    } catch (error) {
      console.error("[v0] Error adding seed account:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add seed account",
        variant: "destructive",
      })
    }
  }

  const deleteSeedAccount = async (accountId: string) => {
    try {
      await fetch(`/api/warmup/seed-accounts/${accountId}`, {
        method: "DELETE",
      })
      loadSeedAccounts()
      toast({
        title: "Success",
        description: "Seed account deleted successfully",
      })
    } catch (error) {
      console.error("[v0] Error deleting seed account:", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Seed Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Seed Accounts</CardTitle>
          <CardDescription>Controlled email addresses that will receive and reply to warmup emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Seed Account */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seed@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input id="name" placeholder="John Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Personal account"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addSeedAccount} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Seed Account
              </Button>
            </div>
          </div>

          {/* Seed Accounts List */}
          {seedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No seed accounts yet. Add your first seed account above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seedAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.email}</TableCell>
                    <TableCell>{account.name || "-"}</TableCell>
                    <TableCell>{account.notes || "-"}</TableCell>
                    <TableCell>
                      {account.is_active ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-gray-400">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => deleteSeedAccount(account.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Warmup Schedule Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Warmup Schedule</CardTitle>
          <CardDescription>Configure the default ramp-up schedule for new campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Default schedule (can be customized per campaign):</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Days 1-7: 1-2 emails per day</li>
                <li>Days 8-14: 3-5 emails per day</li>
                <li>Days 15-21: 6-10 emails per day</li>
                <li>Days 22-30: 11-15 emails per day</li>
                <li>Days 31-60: 15-30 emails per day</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
