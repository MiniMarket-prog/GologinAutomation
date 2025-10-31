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
  recovery_email?: string | null // Added recovery_email field for profile recovery email
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
  fingerprint?: {
    os?: "win" | "mac" | "lin"
    platform?: string
    timezone?: string
    language?: string
    languages?: string[]
    hardware_concurrency?: number // CPU cores
    device_memory?: number // RAM in GB
    screen?: {
      width: number
      height: number
      availWidth: number
      availHeight: number
      colorDepth: number
      pixelDepth: number
    }
    fonts?: string[]
    webgl?: {
      vendor?: string
      renderer?: string
      noise?: boolean
    }
    canvas?: {
      mode?: "off" | "noise" | "block"
      noise?: boolean
    }
    audio?: {
      noise?: boolean
    }
    webrtc?: {
      mode?: "disabled" | "altered" | "real"
      public_ip?: string
      local_ips?: string[]
    }
    media_devices?: {
      enable_masking?: boolean
      video_inputs?: number
      audio_inputs?: number
      audio_outputs?: number
    }
  }
}

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


export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      kameleo_account_tasks: {
        Row: {
          id: string
          status: string
          profile_id: string | null
          email: string | null
          password: string | null
          first_name: string | null
          last_name: string | null
          birth_date: string | null
          phone: string | null
          recovery_email: string | null
          error_message: string | null
          retry_count: number
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: string
          profile_id?: string | null
          email?: string | null
          password?: string | null
          first_name?: string | null
          last_name?: string | null
          birth_date?: string | null
          phone?: string | null
          recovery_email?: string | null
          error_message?: string | null
          retry_count?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: string
          profile_id?: string | null
          email?: string | null
          password?: string | null
          first_name?: string | null
          last_name?: string | null
          birth_date?: string | null
          phone?: string | null
          recovery_email?: string | null
          error_message?: string | null
          retry_count?: number
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      kameleo_profiles: {
        Row: {
          id: string
          profile_id: string
          profile_name: string
          folder_path: string | null
          gmail_email: string | null
          gmail_password: string | null
          recovery_email: string | null
          status: string
          last_run: string | null
          assigned_user_id: string | null
          fingerprint_config: any | null
          proxy_config: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          profile_name: string
          folder_path?: string | null
          gmail_email?: string | null
          gmail_password?: string | null
          recovery_email?: string | null
          status?: string
          last_run?: string | null
          assigned_user_id?: string | null
          fingerprint_config?: any | null
          proxy_config?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          profile_name?: string
          folder_path?: string | null
          gmail_email?: string | null
          gmail_password?: string | null
          recovery_email?: string | null
          status?: string
          last_run?: string | null
          assigned_user_id?: string | null
          fingerprint_config?: any | null
          proxy_config?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      account_creation_tasks: {
        Row: {
          id: string
          email: string | null
          password: string | null
          recovery_email: string | null
          first_name: string | null
          last_name: string | null
          birth_date: string | null
          phone_number: string | null
          phone_order_id: string | null
          status: string
          error_message: string | null
          created_by: string | null
          created_at: string
          completed_at: string | null
          proxy_server: string | null
          proxy_username: string | null
          proxy_password: string | null
          use_existing_profile: boolean
          existing_profile_id: string | null
          country: string
          browser_type: string
          fingerprint_settings: any | null
          gologin_mode: string
        }
        Insert: {
          id?: string
          email?: string | null
          password?: string | null
          recovery_email?: string | null
          first_name?: string | null
          last_name?: string | null
          birth_date?: string | null
          phone_number?: string | null
          phone_order_id?: string | null
          status?: string
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
          proxy_server?: string | null
          proxy_username?: string | null
          proxy_password?: string | null
          use_existing_profile?: boolean
          existing_profile_id?: string | null
          country?: string
          browser_type?: string
          fingerprint_settings?: any | null
          gologin_mode?: string
        }
        Update: {
          id?: string
          email?: string | null
          password?: string | null
          recovery_email?: string | null
          first_name?: string | null
          last_name?: string | null
          birth_date?: string | null
          phone_number?: string | null
          phone_order_id?: string | null
          status?: string
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
          proxy_server?: string | null
          proxy_username?: string | null
          proxy_password?: string | null
          use_existing_profile?: boolean
          existing_profile_id?: string | null
          country?: string
          browser_type?: string
          fingerprint_settings?: any | null
          gologin_mode?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          profile_id: string | null
          task_id: string | null
          action: string
          details: any | null
          duration_ms: number | null
          success: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id?: string | null
          task_id?: string | null
          action: string
          details?: any | null
          duration_ms?: number | null
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string | null
          task_id?: string | null
          action?: string
          details?: any | null
          duration_ms?: number | null
          success?: boolean
          created_at?: string
        }
      }
      automation_tasks: {
        Row: {
          id: string
          profile_id: string | null
          task_type: string
          status: string
          priority: number
          config: any | null
          scheduled_at: string | null
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          created_by: string | null
          created_at: string
          action_count: number
        }
        Insert: {
          id?: string
          profile_id?: string | null
          task_type: string
          status?: string
          priority?: number
          config?: any | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          action_count?: number
        }
        Update: {
          id?: string
          profile_id?: string | null
          task_type?: string
          status?: string
          priority?: number
          config?: any | null
          scheduled_at?: string | null
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          action_count?: number
        }
      }
      behavior_patterns: {
        Row: {
          id: string
          name: string
          description: string | null
          config: any
          is_default: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          config: any
          is_default?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          config?: any
          is_default?: boolean
          created_by?: string | null
          created_at?: string
        }
      }
      gologin_profiles: {
        Row: {
          id: string
          profile_id: string | null
          profile_name: string
          gmail_email: string | null
          gmail_password: string | null
          status: string
          last_run: string | null
          assigned_user_id: string | null
          created_at: string
          updated_at: string
          folder_name: string | null
          gmail_status: string | null
          gmail_status_checked_at: string | null
          gmail_status_message: string | null
          is_deleted: boolean
          deleted_at: string | null
          recovery_email: string | null
          profile_type: string
          local_config: any
          proxy_enabled: boolean
          proxy_host: string | null
          proxy_port: number | null
          proxy_username: string | null
          proxy_password: string | null
          browser_type: string
          fingerprint_config: any | null
        }
        Insert: {
          id?: string
          profile_id?: string | null
          profile_name: string
          gmail_email?: string | null
          gmail_password?: string | null
          status?: string
          last_run?: string | null
          assigned_user_id?: string | null
          created_at?: string
          updated_at?: string
          folder_name?: string | null
          gmail_status?: string | null
          gmail_status_checked_at?: string | null
          gmail_status_message?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          recovery_email?: string | null
          profile_type?: string
          local_config?: any
          proxy_enabled?: boolean
          proxy_host?: string | null
          proxy_port?: number | null
          proxy_username?: string | null
          proxy_password?: string | null
          browser_type?: string
          fingerprint_config?: any | null
        }
        Update: {
          id?: string
          profile_id?: string | null
          profile_name?: string
          gmail_email?: string | null
          gmail_password?: string | null
          status?: string
          last_run?: string | null
          assigned_user_id?: string | null
          created_at?: string
          updated_at?: string
          folder_name?: string | null
          gmail_status?: string | null
          gmail_status_checked_at?: string | null
          gmail_status_message?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          recovery_email?: string | null
          profile_type?: string
          local_config?: any
          proxy_enabled?: boolean
          proxy_host?: string | null
          proxy_port?: number | null
          proxy_username?: string | null
          proxy_password?: string | null
          browser_type?: string
          fingerprint_config?: any | null
        }
      }
      settings: {
        Row: {
          id: string
          key: string
          value: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: any
          created_at?: string
          updated_at?: string
        }
      }
      user_folder_assignments: {
        Row: {
          id: string
          user_id: string
          folder_name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_name?: string
          created_at?: string
        }
      }
      user_proxies: {
        Row: {
          id: string
          user_id: string
          name: string
          host: string
          port: number
          username: string | null
          password: string | null
          type: string
          status: string
          last_tested: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          host: string
          port: number
          username?: string | null
          password?: string | null
          type?: string
          status?: string
          last_tested?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          host?: string
          port?: number
          username?: string | null
          password?: string | null
          type?: string
          status?: string
          last_tested?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warmup_accounts: {
        Row: {
          id: string
          profile_id: string
          email: string
          status: string
          warmup_stage: string
          daily_limit: number
          current_daily_count: number
          total_sent: number
          total_received: number
          last_activity: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          email: string
          status?: string
          warmup_stage?: string
          daily_limit?: number
          current_daily_count?: number
          total_sent?: number
          total_received?: number
          last_activity?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          email?: string
          status?: string
          warmup_stage?: string
          daily_limit?: number
          current_daily_count?: number
          total_sent?: number
          total_received?: number
          last_activity?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warmup_campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          config: any
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string
          config: any
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string
          config?: any
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      warmup_logs: {
        Row: {
          id: string
          account_id: string
          action_type: string
          recipient: string | null
          subject: string | null
          success: boolean
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          action_type: string
          recipient?: string | null
          subject?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          action_type?: string
          recipient?: string | null
          subject?: string | null
          success?: boolean
          error_message?: string | null
          created_at?: string
        }
      }
      warmup_schedules: {
        Row: {
          id: string
          account_id: string
          scheduled_time: string
          action_type: string
          status: string
          executed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          scheduled_time: string
          action_type: string
          status?: string
          executed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          scheduled_time?: string
          action_type?: string
          status?: string
          executed_at?: string | null
          created_at?: string
        }
      }
      warmup_seed_accounts: {
        Row: {
          id: string
          email: string
          provider: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          provider: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          provider?: string
          is_active?: boolean
          created_at?: string
        }
      }
      warmup_templates: {
        Row: {
          id: string
          name: string
          subject: string
          body: string
          category: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          subject: string
          body: string
          category: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          body?: string
          category?: string
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}
