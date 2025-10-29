export interface KameleoAccountTask {
  id: string
  user_id: string
  status: "pending" | "processing" | "completed" | "failed"
  email: string | null
  password: string | null
  first_name: string | null
  last_name: string | null
  birth_date: string | null
  phone: string | null
  country: string
  recovery_email: string | null
  profile_id: string
  profile_type: "empty" | "with_gmail"
  proxy_id: string | null
  error_message: string | null
  retry_count: number
  started_at: string | null
  created_at: string
  completed_at: string | null
}

export interface CreateAccountParams {
  taskId: string
  profileId: string
  profileType: "empty" | "with_gmail"
  country: string
  recoveryEmails: string[]
  proxy?: {
    host: string
    port: number
    username?: string
    password?: string
  }
}

export interface AccountCreationResult {
  success: boolean
  email?: string
  password?: string
  phone?: string
  error?: string
}

/**
 * User proxy configuration for account creation
 */
export interface UserProxy {
  id: string
  user_id: string
  name: string
  proxy_server: string
  proxy_port: number
  proxy_username?: string
  proxy_password?: string
  location_country?: string
  location_city?: string
  proxy_type?: "Datacenter" | "Residential" | "ISP (Static Residential)" | "Mobile"
  is_working: boolean
  response_time?: number
  last_tested_at?: string
  created_at: string
  updated_at: string
}
