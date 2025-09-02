# Complete Supabase Database Schema

## ALL TABLES (from your actual export)

### Core Tables

#### `users` table
```sql
users {
  id: uuid PRIMARY KEY,
  name: text NOT NULL,
  email: text NOT NULL,
  phone: text,
  role: text DEFAULT 'client',
  emergency_contact: text,
  medical_conditions: text,
  join_date: date DEFAULT CURRENT_DATE,
  status: text DEFAULT 'active',
  credit_balance: numeric DEFAULT 0,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  auth_id: uuid,
  push_token: text,
  enable_notifications: boolean DEFAULT true,
  default_reminder_minutes: integer DEFAULT 15,
  enable_email_notifications: boolean DEFAULT true,
  referral_source: text
}
```

#### `classes` table
```sql
classes {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name: text NOT NULL,
  instructor_id: uuid NOT NULL,
  date: date NOT NULL,
  time: time NOT NULL,
  duration: integer NOT NULL,
  capacity: integer NOT NULL,
  enrolled: integer DEFAULT 0,
  equipment: jsonb DEFAULT '[]',
  equipment_type: text NOT NULL,
  description: text,
  status: text DEFAULT 'active',
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  category: text DEFAULT 'group',
  room: text,
  notes: text
}
```

#### `bookings` table
```sql
bookings {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id: uuid NOT NULL,
  class_id: uuid NOT NULL,
  subscription_id: uuid,
  booking_date: timestamptz DEFAULT now(),
  status: text DEFAULT 'confirmed',
  checked_in: boolean DEFAULT false,
  check_in_time: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

### Subscription Management

#### `subscription_plans` table
```sql
subscription_plans {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name: text NOT NULL,
  description: text,
  monthly_price: numeric NOT NULL,
  monthly_classes: integer NOT NULL,
  equipment_access: text DEFAULT 'mat',
  category: text DEFAULT 'group',
  features: text[] DEFAULT '{}',
  is_active: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  duration: integer NOT NULL DEFAULT 1,
  duration_unit: varchar NOT NULL DEFAULT 'months'
}
```

#### `user_subscriptions` table
```sql
user_subscriptions {
  id: bigint PRIMARY KEY,
  user_id: uuid NOT NULL,
  plan_id: uuid NOT NULL,
  start_date: date NOT NULL,
  end_date: date NOT NULL,
  remaining_classes: integer NOT NULL DEFAULT 0,
  status: text NOT NULL DEFAULT 'active',
  notes: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### `subscriptions` table (Legacy?)
```sql
subscriptions {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid,
  plan_id: uuid,
  status: text DEFAULT 'active',
  start_date: timestamptz DEFAULT now(),
  end_date: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

### Notification System

#### `notification_settings` table
```sql
notification_settings {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid,
  enable_notifications: boolean DEFAULT true,
  default_reminder_minutes: integer DEFAULT 30,
  enable_push_notifications: boolean DEFAULT true,
  enable_email_notifications: boolean DEFAULT true,
  class_reminders: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  class_full_notifications: boolean DEFAULT true,
  new_enrollment_notifications: boolean DEFAULT false,
  class_cancellation_notifications: boolean DEFAULT true,
  general_reminders: boolean DEFAULT true
}
```

#### `notifications` table
```sql
notifications {
  id: bigint PRIMARY KEY,
  user_id: uuid,
  type: text NOT NULL,
  title: text NOT NULL,
  message: text NOT NULL,
  scheduled_for: timestamptz NOT NULL,
  metadata: jsonb DEFAULT '{}',
  is_read: boolean DEFAULT false,
  read_at: timestamptz,
  created_at: timestamptz DEFAULT now()
}
```

#### `class_notification_settings` table
```sql
class_notification_settings {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id: uuid,
  enable_notifications: boolean DEFAULT true,
  notification_minutes: integer DEFAULT 30,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### `push_tokens` table
```sql
push_tokens {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid NOT NULL,
  token: text NOT NULL,
  device_type: text NOT NULL,
  device_id: text,
  device_name: text,
  is_active: boolean DEFAULT true,
  last_used_at: timestamptz DEFAULT now(),
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

### Client Management System

#### `client_activities` table
```sql
client_activities {
  id: bigint PRIMARY KEY,
  client_id: uuid NOT NULL,
  activity_type: text NOT NULL,
  description: text NOT NULL,
  metadata: jsonb DEFAULT '{}',
  performed_by: uuid,
  performed_by_name: text,
  created_at: timestamptz DEFAULT now()
}
```

#### `client_activity_log` table
```sql
client_activity_log {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id: uuid NOT NULL,
  activity_type: text NOT NULL,
  description: text,
  performed_by: uuid,
  metadata: jsonb DEFAULT '{}',
  created_at: timestamptz DEFAULT now()
}
```

#### `client_documents` table
```sql
client_documents {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id: uuid NOT NULL,
  uploaded_by: uuid NOT NULL,
  document_type: varchar NOT NULL,
  file_name: varchar NOT NULL,
  original_name: varchar NOT NULL,
  file_path: text NOT NULL,
  file_size: bigint NOT NULL,
  mime_type: varchar NOT NULL,
  description: text,
  is_sensitive: boolean DEFAULT false,
  expiry_date: date,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### `client_lifecycle` table
```sql
client_lifecycle {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id: uuid NOT NULL,
  current_stage: text NOT NULL,
  previous_stage: text,
  stage_changed_at: timestamptz DEFAULT now(),
  stage_changed_by: uuid,
  risk_score: integer DEFAULT 0,
  lifetime_value: numeric DEFAULT 0,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### `client_notes` table
```sql
client_notes {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id: uuid NOT NULL,
  note_type: text DEFAULT 'general',
  created_by: uuid NOT NULL,
  is_private: boolean DEFAULT false,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  content: text NOT NULL DEFAULT '',
  reminder_at: timestamptz,
  reminder_message: text,
  reminder_sent: boolean DEFAULT false,
  priority: text DEFAULT 'medium',
  tags: text,
  title: text NOT NULL DEFAULT ''
}
```

### Medical & Progress Tracking

#### `client_medical_updates` table
```sql
client_medical_updates {
  id: integer PRIMARY KEY,
  client_id: uuid NOT NULL,
  instructor_id: uuid NOT NULL,
  previous_conditions: text,
  updated_conditions: text NOT NULL,
  update_reason: text NOT NULL,
  severity_level: text DEFAULT 'minor',
  requires_clearance: boolean DEFAULT false,
  clearance_notes: text,
  effective_date: date DEFAULT CURRENT_DATE,
  verified_by_admin: uuid,
  verification_date: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### `client_progress_assessments` table
```sql
client_progress_assessments {
  id: integer PRIMARY KEY,
  client_id: uuid NOT NULL,
  instructor_id: uuid NOT NULL,
  assessment_date: date DEFAULT CURRENT_DATE,
  assessment_type: text DEFAULT 'monthly',
  fitness_level: text NOT NULL,
  flexibility_score: integer,
  strength_score: integer,
  balance_score: integer,
  endurance_score: integer,
  technique_score: integer,
  goals_achieved: jsonb,
  new_goals: jsonb,
  areas_of_improvement: text,
  recommended_classes: jsonb,
  restrictions_notes: text,
  next_assessment_date: date,
  overall_notes: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

#### `client_progress_photos` table
```sql
client_progress_photos {
  id: integer PRIMARY KEY,
  client_id: uuid NOT NULL,
  instructor_id: uuid NOT NULL,
  photo_type: text NOT NULL,
  file_name: text NOT NULL,
  original_name: text NOT NULL,
  file_url: text NOT NULL,
  file_size: integer NOT NULL,
  mime_type: text NOT NULL,
  description: text,
  body_area: text,
  measurement_data: jsonb,
  taken_date: date DEFAULT CURRENT_DATE,
  session_notes: text,
  is_before_after_pair: boolean DEFAULT false,
  pair_id: integer,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

### Instructor Management

#### `instructor_client_assignments` table
```sql
instructor_client_assignments {
  id: integer PRIMARY KEY,
  instructor_id: uuid NOT NULL,
  client_id: uuid NOT NULL,
  assigned_by: uuid NOT NULL,
  assignment_type: text DEFAULT 'primary',
  start_date: date DEFAULT CURRENT_DATE,
  end_date: date,
  status: text DEFAULT 'active',
  notes: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now()
}
```

### Payment System

#### `payments` table
```sql
payments {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id: uuid NOT NULL,
  subscription_id: uuid NOT NULL,
  amount: numeric NOT NULL,
  payment_date: date NOT NULL,
  payment_method: text DEFAULT 'card',
  status: text DEFAULT 'completed',
  transaction_id: text,
  created_at: timestamptz DEFAULT now()
}
```

#### `manual_credits` table
```sql
manual_credits {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id: uuid NOT NULL,
  admin_id: uuid NOT NULL,
  amount: numeric NOT NULL,
  classes_added: integer DEFAULT 0,
  reason: text NOT NULL,
  description: text,
  created_at: timestamptz DEFAULT now()
}
```

### Waitlist System

#### `waitlist` table
```sql
waitlist {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id: uuid NOT NULL,
  class_id: uuid NOT NULL,
  position: integer NOT NULL,
  created_at: timestamptz DEFAULT now()
}
```

## Key Insights from Your Complete Schema

1. **You have a comprehensive client management system** - not just basic bookings
2. **Medical tracking and progress assessments** - professional fitness studio features
3. **Document management** - client files and sensitive data handling
4. **Instructor-client assignments** - relationship management
5. **Multiple subscription models** - both `subscriptions` and `user_subscriptions`
6. **Comprehensive notification system** - multiple tables for different notification types
7. **Payment processing** - including manual credits and transaction tracking
8. **Client lifecycle management** - stages, risk scores, lifetime value

Your database is **much more sophisticated** than a simple booking system - it's a **complete studio management platform**! 🎯
