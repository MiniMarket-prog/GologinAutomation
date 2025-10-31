export interface KameleoProfile {
  id: string
  profile_id: string
  profile_name: string
  folder_path: string | null
  gmail_email: string | null
  gmail_password: string | null
  recovery_email: string | null
  status: "idle" | "running" | "paused" | "error" | "deleted"
  last_run: string | null
  assigned_user_id: string | null
  fingerprint_config: Record<string, any> | null
  proxy_config: Record<string, any> | null
  created_at: string
  updated_at: string
}
