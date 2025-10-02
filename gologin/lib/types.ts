export interface User {
  id: string
  email: string
  role: "admin" | "user"
  created_at: string
  updated_at: string
}

export interface GoLoginProfile {
  id: string
  profile_id: string
  profile_name: string
  gmail_email: string | null
  gmail_password: string | null
  status: "idle" | "running" | "paused" | "error"
  last_run: string | null
  assigned_user_id: string | null
  created_at: string
  updated_at: string
}

export interface AutomationTask {
  id: string
  profile_id: string
  task_type: "login" | "check_inbox" | "read_email" | "send_email" | "star_email"
  status: "pending" | "running" | "completed" | "failed"
  priority: number
  config: Record<string, any>
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
