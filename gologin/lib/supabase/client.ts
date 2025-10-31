import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "./types"
import type { SupabaseClient } from "@supabase/supabase-js"

let browserClient: SupabaseClient<Database> | null = null

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient
  }

  browserClient = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return browserClient
}
