import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./types"


let adminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (adminClient) {
    return adminClient
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  adminClient = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
