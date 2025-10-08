import { createClient } from "@supabase/supabase-js"

let adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdminClient() {
  if (adminClient) {
    return adminClient
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }

  adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}
