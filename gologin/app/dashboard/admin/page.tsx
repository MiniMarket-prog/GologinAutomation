import { requireAdmin } from "@/lib/utils/auth"
import { UserManagementTable } from "@/components/admin/user-management-table"
import { redirect } from "next/navigation"

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and folder assignments</p>
      </div>

      <UserManagementTable />
    </div>
  )
}
