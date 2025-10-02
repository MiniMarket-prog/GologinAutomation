-- Users table for multi-user access
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' or 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GoLogin profiles table
CREATE TABLE IF NOT EXISTS gologin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id TEXT UNIQUE NOT NULL, -- GoLogin profile ID
  profile_name TEXT NOT NULL,
  gmail_email TEXT,
  gmail_password TEXT, -- Encrypted in production
  status TEXT DEFAULT 'idle', -- 'idle', 'running', 'paused', 'error'
  last_run TIMESTAMP WITH TIME ZONE,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation tasks table
CREATE TABLE IF NOT EXISTS automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES gologin_profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL, -- 'login', 'check_inbox', 'read_email', 'send_email', 'star_email'
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  priority INTEGER DEFAULT 0,
  config JSONB, -- Task-specific configuration
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES gologin_profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES automation_tasks(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Human behavior patterns table
CREATE TABLE IF NOT EXISTS behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL, -- Stores delay ranges, typing speeds, etc.
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_status ON gologin_profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON gologin_profiles(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON automation_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_profile ON automation_tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON automation_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_logs_profile ON activity_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON activity_logs(created_at);
