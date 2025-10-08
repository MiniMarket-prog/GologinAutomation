import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const supabase = await getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function isAdmin() {
  const supabase = await getSupabaseServerClient()
  const user = await getCurrentUser()
  if (!user) return false

  console.log("[v0] Checking admin status for user:", user.email)

  // Query the users table to get the role
  const { data: userData, error } = await supabase.from("users").select("role").eq("email", user.email).single()

  console.log("[v0] User data from database:", userData)
  console.log("[v0] Query error:", error)

  if (error || !userData) {
    console.log("[v0] No user data found or error occurred")
    return false
  }

  const isAdminUser = userData.role === "admin"
  console.log("[v0] Is admin:", isAdminUser)

  return isAdminUser
}

export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error("Unauthorized: Admin access required")
  }
}
