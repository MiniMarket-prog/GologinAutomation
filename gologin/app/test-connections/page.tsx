import { TestConnectionsClient } from "./test-connections-client"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export default async function TestConnectionsPage() {
  // Test Supabase connection on server side
  let supabaseStatus = {
    connected: false,
    error: null as string | null,
    profileCount: 0,
    taskCount: 0,
  }

  try {
    const supabase = await getSupabaseServerClient()

    // Test database connection by counting profiles
    const { count: profileCount, error: profileError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    if (profileError) throw profileError

    // Test counting tasks
    const { count: taskCount, error: taskError } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })

    if (taskError) throw taskError

    supabaseStatus = {
      connected: true,
      error: null,
      profileCount: profileCount || 0,
      taskCount: taskCount || 0,
    }
  } catch (error) {
    supabaseStatus = {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
      profileCount: 0,
      taskCount: 0,
    }
  }

  return <TestConnectionsClient initialSupabaseStatus={supabaseStatus} />
}
