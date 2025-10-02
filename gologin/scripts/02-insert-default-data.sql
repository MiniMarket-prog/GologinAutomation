-- Insert default behavior pattern
INSERT INTO behavior_patterns (name, description, config, is_default)
VALUES (
  'Natural Human Behavior',
  'Realistic human-like behavior with random delays and natural movements',
  '{
    "typing_speed": {"min": 80, "max": 200},
    "action_delay": {"min": 1000, "max": 3000},
    "mouse_movement": {"enabled": true, "speed": "natural"},
    "scroll_behavior": {"enabled": true, "pause_probability": 0.3},
    "random_pauses": {"enabled": true, "probability": 0.2, "duration": {"min": 2000, "max": 5000}}
  }'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Insert demo admin user (password: admin123 - change in production!)
-- Password hash for 'admin123' using bcrypt
INSERT INTO users (email, password_hash, role)
VALUES (
  'admin@example.com',
  '$2a$10$rKvVPZJQKJQKJQKJQKJQKOeH8vXqYqYqYqYqYqYqYqYqYqYqYqYqY',
  'admin'
)
ON CONFLICT DO NOTHING;
