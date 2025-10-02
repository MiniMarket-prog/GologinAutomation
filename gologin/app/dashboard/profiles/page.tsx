import { AddProfileDialog } from "@/components/profiles/add-profile-dialog"
import { SyncProfilesDialog } from "@/components/profiles/sync-profiles-dialog"
import { ProfileTable } from "@/components/profiles/profile-table"

export default function ProfilesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profiles</h1>
          <p className="text-muted-foreground">Manage your GoLogin profiles</p>
        </div>
        <div className="flex gap-2">
          <SyncProfilesDialog />
          <AddProfileDialog />
        </div>
      </div>

      <ProfileTable />
    </div>
  )
}
