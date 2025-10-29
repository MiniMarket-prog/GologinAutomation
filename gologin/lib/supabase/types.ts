export type Database = {
  public: {
    Tables: {
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
    }
  }
}
