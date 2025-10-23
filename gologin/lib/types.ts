export interface User {
  id: string
  email: string
  role: "admin" | "user"
  created_at: string
  updated_at: string
}

export interface GoLoginProfile {
  id: string
  profile_id: string | null // Made nullable for local profiles
  profile_name: string
  profile_type: "gologin" | "local" // Added profile type
  folder_name?: string | null
  gmail_email: string | null
  gmail_password: string | null
  gmail_status?: "ok" | "blocked" | "password_required" | "verification_required" | "error" | "unknown" | null
  gmail_status_checked_at?: string | null
  gmail_status_message?: string | null
  status: "idle" | "running" | "paused" | "error"
  last_run: string | null
  assigned_user_id: string | null
  local_config?: LocalProfileConfig | null // Added local config
  created_at: string
  updated_at: string
}

export interface LocalProfileConfig {
  user_data_dir?: string // Path to browser user data directory
  proxy?: {
    server: string
    username?: string
    password?: string
  }
  browser_args?: string[] // Additional browser arguments
  viewport?: {
    width: number
    height: number
  }
  user_agent?: string
}

export interface AutomationTask {
  id: string
  profile_id: string
  task_type:
    | "login"
    | "check_inbox"
    | "read_email"
    | "send_email"
    | "star_email"
    | "reply_to_email"
    | "report_to_inbox"
    | "check_gmail_status"
    | "setup_gmail" // Added setup_gmail task type
  status: "pending" | "running" | "completed" | "failed"
  priority: number
  config: Record<string, any>
  action_count?: number
  scheduled_at: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_by: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  profile_id: string
  task_id: string | null
  action: string
  details: Record<string, any>
  duration_ms: number | null
  success: boolean
  created_at: string
}

export interface BehaviorPattern {
  id: string
  name: string
  description: string | null
  config: {
    typing_speed: { min: number; max: number }
    action_delay: { min: number; max: number }
    mouse_movement: { enabled: boolean; speed: string }
    scroll_behavior: { enabled: boolean; pause_probability: number }
    random_pauses: {
      enabled: boolean
      probability: number
      duration: { min: number; max: number }
    }
  }
  is_default: boolean
  created_by: string | null
  created_at: string
}
