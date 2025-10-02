import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/settings/settings-form"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your automation system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GoLogin API Configuration</CardTitle>
          <CardDescription>Enter your GoLogin API key to enable profile automation</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>
    </div>
  )
}
