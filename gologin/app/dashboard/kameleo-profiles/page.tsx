import { KameleoProfileTable } from "@/components/kameleo-profiles/kameleo-profile-table"

export default function KameleoProfilesPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Kameleo Profiles</h1>
        <p className="text-muted-foreground mt-2">
          Manage your Kameleo browser profiles with custom fingerprints and proxy configurations
        </p>
      </div>

      <KameleoProfileTable />
    </div>
  )
}
