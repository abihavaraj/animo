# Complete Supabase Database Schema

**WARNING: This schema is for context only and is not meant to be run. Table order and constraints may not be valid for execution.**

## ALL TABLES (Complete Schema Export)

### Core Tables

#### `users` table
```sql
users {
  id: uuid PRIMARY KEY,
  name: text NOT NULL,
  email: text NOT NULL UNIQUE,
  phone: text,
  role: text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'instructor', 'admin', 'reception')),
  emergency_contact: text,
  medical_conditions: text,
  join_date: date DEFAULT CURRENT_DATE,
  status: text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  credit_balance: numeric DEFAULT 0,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  auth_id: uuid,
  push_token: text,
  enable_notifications: boolean DEFAULT true,
  default_reminder_minutes: integer DEFAULT 15,
  enable_email_notifications: boolean DEFAULT true,
  referral_source: text CHECK (referral_source IS NULL OR referral_source = '' OR length(referral_source) > 0),
  language_preference: varchar DEFAULT 'en',
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
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
  equipment_type: text NOT NULL CHECK (equipment_type IN ('mat', 'reformer', 'both')),
  description: text,
  status: text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'full', 'completed')),
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  category: text DEFAULT 'group' CHECK (category IN ('personal', 'group')),
  room: text,
  notes: text,
  visibility: text DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  CONSTRAINT classes_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES public.users(id)
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
  status: text DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
  checked_in: boolean DEFAULT false,
  check_in_time: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  cancelled_by: text,
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT bookings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
}
```

### Subscription Management

#### `subscription_plans` table
```sql
subscription_plans {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name: text NOT NULL UNIQUE,
  description: text,
  monthly_price: numeric NOT NULL,
  monthly_classes: integer NOT NULL,
  equipment_access: text DEFAULT 'mat' CHECK (equipment_access IN ('mat', 'reformer', 'both')),
  category: text DEFAULT 'group' CHECK (category IN ('group', 'personal', 'personal_duo', 'personal_trio')),
  features: text[] DEFAULT '{}',
  is_active: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  duration: integer NOT NULL DEFAULT 1,
  duration_unit: varchar NOT NULL DEFAULT 'months' CHECK (duration_unit IN ('days', 'months', 'years'))
}
```

#### `user_subscriptions` table
```sql
user_subscriptions {
  id: bigint PRIMARY KEY DEFAULT nextval('user_subscriptions_id_seq'),
  user_id: uuid NOT NULL,
  plan_id: uuid NOT NULL,
  start_date: date NOT NULL,
  end_date: date NOT NULL,
  remaining_classes: integer NOT NULL DEFAULT 0,
  status: text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'paused', 'terminated')),
  notes: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT fk_user_subscriptions_user_id FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT fk_user_subscriptions_plan_id FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
}
```

#### `subscriptions` table
```sql
subscriptions {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid,
  plan_id: uuid,
  status: text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  start_date: timestamptz DEFAULT now(),
  end_date: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id)
}
```

### Notification System

#### `notification_settings` table
```sql
notification_settings {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid UNIQUE,
  enable_notifications: boolean DEFAULT true,
  default_reminder_minutes: integer DEFAULT 30,
  enable_push_notifications: boolean DEFAULT true,
  enable_email_notifications: boolean DEFAULT true,
  class_reminders: boolean DEFAULT true,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  class_full_notifications: boolean DEFAULT true,
  new_enrollment_notifications: boolean DEFAULT true,
  class_cancellation_notifications: boolean DEFAULT true,
  general_reminders: boolean DEFAULT true,
  CONSTRAINT notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
}
```

#### `notifications` table
```sql
notifications {
  id: bigint PRIMARY KEY DEFAULT nextval('notifications_id_seq'),
  user_id: uuid,
  type: text NOT NULL,
  title: text NOT NULL,
  message: text NOT NULL,
  scheduled_for: timestamptz NOT NULL,
  metadata: jsonb DEFAULT '{}',
  is_read: boolean DEFAULT false,
  read_at: timestamptz,
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
}
```

#### `class_notification_settings` table
```sql
class_notification_settings {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id: uuid UNIQUE,
  enable_notifications: boolean DEFAULT true,
  notification_minutes: integer DEFAULT 30,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT class_notification_settings_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
}
```

#### `push_tokens` table
```sql
push_tokens {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid NOT NULL,
  token: text NOT NULL UNIQUE,
  device_type: text NOT NULL,
  device_id: text,
  device_name: text,
  is_active: boolean DEFAULT true,
  last_used_at: timestamptz DEFAULT now(),
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
}
```

### Client Management System

#### `client_activities` table
```sql
client_activities {
  id: bigint PRIMARY KEY DEFAULT nextval('client_activities_id_seq'),
  client_id: uuid NOT NULL,
  activity_type: text NOT NULL,
  description: text NOT NULL,
  metadata: jsonb DEFAULT '{}',
  performed_by: uuid,
  performed_by_name: text,
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT client_activities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT client_activities_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id)
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
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT client_activity_log_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT client_activity_log_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id)
}
```

#### `client_documents` table
```sql
client_documents {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id: uuid NOT NULL,
  uploaded_by: uuid NOT NULL,
  document_type: varchar NOT NULL CHECK (document_type IN ('photo', 'contract', 'medical_form', 'id_copy', 'waiver', 'receipt', 'other')),
  file_name: varchar NOT NULL,
  original_name: varchar NOT NULL,
  file_path: text NOT NULL,
  file_size: bigint NOT NULL,
  mime_type: varchar NOT NULL,
  description: text,
  is_sensitive: boolean DEFAULT false,
  expiry_date: date,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT client_documents_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT client_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
}
```

#### `client_lifecycle` table
```sql
client_lifecycle {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id: uuid NOT NULL,
  current_stage: text NOT NULL CHECK (current_stage IN ('prospect', 'new_client', 'active_client', 'at_risk', 'inactive', 'churned')),
  previous_stage: text,
  stage_changed_at: timestamptz DEFAULT now(),
  stage_changed_by: uuid,
  risk_score: integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  lifetime_value: numeric DEFAULT 0,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT client_lifecycle_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT client_lifecycle_stage_changed_by_fkey FOREIGN KEY (stage_changed_by) REFERENCES public.users(id)
}
```

#### `client_notes` table
```sql
client_notes {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id: uuid NOT NULL,
  note_type: text DEFAULT 'general' CHECK (note_type IN ('general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment')),
  created_by: uuid NOT NULL,
  is_private: boolean DEFAULT false,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  content: text NOT NULL DEFAULT '',
  reminder_at: timestamptz,
  reminder_message: text,
  reminder_sent: boolean DEFAULT false,
  priority: text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  tags: text,
  title: text NOT NULL DEFAULT '',
  CONSTRAINT client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.users(id),
  CONSTRAINT client_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
}
```

### Medical & Progress Tracking

#### `client_medical_updates` table
```sql
client_medical_updates {
  id: integer PRIMARY KEY DEFAULT nextval('client_medical_updates_id_seq'),
  client_id: uuid NOT NULL,
  instructor_id: uuid NOT NULL,
  previous_conditions: text,
  updated_conditions: text NOT NULL,
  update_reason: text NOT NULL,
  severity_level: text DEFAULT 'minor' CHECK (severity_level IN ('minor', 'moderate', 'significant', 'major')),
  requires_clearance: boolean DEFAULT false,
  clearance_notes: text,
  effective_date: date DEFAULT CURRENT_DATE,
  verified_by_admin: uuid,
  verification_date: timestamptz,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT client_medical_updates_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id),
  CONSTRAINT client_medical_updates_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id),
  CONSTRAINT client_medical_updates_verified_by_admin_fkey FOREIGN KEY (verified_by_admin) REFERENCES auth.users(id)
}
```

#### `client_progress_assessments` table
```sql
client_progress_assessments {
  id: integer PRIMARY KEY DEFAULT nextval('client_progress_assessments_id_seq'),
  client_id: uuid NOT NULL,
  instructor_id: uuid NOT NULL,
  assessment_date: date DEFAULT CURRENT_DATE,
  assessment_type: text DEFAULT 'monthly' CHECK (assessment_type IN ('initial', 'monthly', 'quarterly', 'annual', 'injury_recovery', 'goal_review')),
  fitness_level: text NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  flexibility_score: integer CHECK (flexibility_score >= 1 AND flexibility_score <= 10),
  strength_score: integer CHECK (strength_score >= 1 AND strength_score <= 10),
  balance_score: integer CHECK (balance_score >= 1 AND balance_score <= 10),
  endurance_score: integer CHECK (endurance_score >= 1 AND endurance_score <= 10),
  technique_score: integer CHECK (technique_score >= 1 AND technique_score <= 10),
  goals_achieved: jsonb,
  new_goals: jsonb,
  areas_of_improvement: text,
  recommended_classes: jsonb,
  restrictions_notes: text,
  next_assessment_date: date,
  overall_notes: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT client_progress_assessments_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id),
  CONSTRAINT client_progress_assessments_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id)
}
```

#### `client_progress_photos` table
```sql
client_progress_photos {
  id: integer PRIMARY KEY DEFAULT nextval('client_progress_photos_id_seq'),
  client_id: uuid NOT NULL,
  instructor_id: uuid NOT NULL,
  photo_type: text NOT NULL CHECK (photo_type IN ('before', 'after', 'progress', 'assessment')),
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
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT client_progress_photos_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id),
  CONSTRAINT client_progress_photos_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id)
}
```

### Instructor Management

#### `instructor_client_assignments` table
```sql
instructor_client_assignments {
  id: integer PRIMARY KEY DEFAULT nextval('instructor_client_assignments_id_seq'),
  instructor_id: uuid NOT NULL,
  client_id: uuid NOT NULL,
  assigned_by: uuid NOT NULL,
  assignment_type: text DEFAULT 'primary' CHECK (assignment_type IN ('primary', 'secondary', 'temporary', 'consultation')),
  start_date: date DEFAULT CURRENT_DATE,
  end_date: date,
  status: text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'transferred')),
  notes: text,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT instructor_client_assignments_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES auth.users(id),
  CONSTRAINT instructor_client_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id),
  CONSTRAINT instructor_client_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id)
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
  status: text DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  transaction_id: text,
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
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
  reason: text NOT NULL CHECK (reason IN ('payment', 'refund', 'promotional', 'subscription_purchase', 'manual_adjustment')),
  description: text,
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT manual_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT manual_credits_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id)
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
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT waitlist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT waitlist_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id)
}
```

### Activity Logging & Staff Management

#### `activity_logs` table
```sql
activity_logs {
  id: bigint PRIMARY KEY DEFAULT nextval('activity_logs_id_seq'),
  user_id: uuid NOT NULL,
  user_name: text NOT NULL,
  user_role: text NOT NULL,
  action_type: text NOT NULL CHECK (action_type IN ('class_created', 'client_assigned', 'client_unassigned', 'class_cancelled', 'subscription_assigned', 'payment_received')),
  action_description: text NOT NULL,
  target_id: text,
  target_type: text CHECK (target_type IN ('class', 'booking', 'client', 'subscription', 'payment')),
  target_name: text,
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
}
```

#### `staff_activities` table
```sql
staff_activities {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id: uuid NOT NULL,
  staff_name: text NOT NULL,
  staff_role: text NOT NULL CHECK (staff_role IN ('reception', 'instructor', 'admin')),
  activity_type: text NOT NULL,
  activity_description: text NOT NULL,
  client_id: uuid,
  client_name: text,
  metadata: jsonb DEFAULT '{}',
  created_at: timestamptz DEFAULT now(),
  CONSTRAINT fk_staff_activities_staff_id FOREIGN KEY (staff_id) REFERENCES public.users(id),
  CONSTRAINT fk_staff_activities_client_id FOREIGN KEY (client_id) REFERENCES public.users(id)
}
```

### Announcements & Communication

#### `announcements` table
```sql
announcements {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title: text NOT NULL,
  message: text NOT NULL,
  type: text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent')),
  is_active: boolean DEFAULT true,
  start_date: timestamptz DEFAULT now(),
  end_date: timestamptz,
  created_by: uuid NOT NULL,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
}
```

### Reception Tools

#### `reception_sticky_notes` table
```sql
reception_sticky_notes {
  id: uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id: uuid NOT NULL,
  content: text NOT NULL,
  color: varchar DEFAULT '#FFD700',
  position_x: integer DEFAULT 100,
  position_y: integer DEFAULT 100,
  width: integer DEFAULT 250,
  height: integer DEFAULT 200,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  deleted_at: timestamptz,
  CONSTRAINT fk_reception_sticky_notes_user FOREIGN KEY (user_id) REFERENCES public.users(id)
}
```

### Theme Management

#### `themes` table
```sql
themes {
  id: uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name: text NOT NULL UNIQUE,
  display_name: text NOT NULL,
  description: text,
  is_active: boolean DEFAULT false,
  start_date: timestamptz,
  end_date: timestamptz,
  colors: jsonb NOT NULL,
  created_by: uuid NOT NULL,
  created_at: timestamptz DEFAULT now(),
  updated_at: timestamptz DEFAULT now(),
  CONSTRAINT themes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
}
```

## Key Insights from Your Complete Schema

1. **Comprehensive Client Management System** - Not just basic bookings, but full lifecycle management
2. **Medical Tracking & Progress Assessments** - Professional fitness studio features with detailed scoring
3. **Document Management** - Client files, sensitive data handling, and document categorization
4. **Instructor-Client Assignments** - Relationship management with assignment types and status tracking
5. **Dual Subscription Models** - Both `subscriptions` and `user_subscriptions` for flexibility
6. **Advanced Notification System** - Multiple tables for different notification types and settings
7. **Complete Payment Processing** - Including manual credits, transaction tracking, and status management
8. **Client Lifecycle Management** - Stages, risk scores, lifetime value tracking
9. **Activity Logging & Audit Trail** - Comprehensive logging for both general activities and staff-specific actions
10. **Staff Management Tools** - Reception sticky notes, staff activity tracking
11. **Announcement System** - Communication tools with priority levels and date ranges
12. **Theme Management** - Dynamic theming system with date-based activation
13. **Enhanced Data Validation** - Extensive CHECK constraints for data integrity
14. **Foreign Key Relationships** - Proper referential integrity across all tables
15. **Language Support** - Built-in language preference for internationalization

### New Tables Added:
- `activity_logs` - System-wide activity tracking
- `announcements` - Communication system
- `reception_sticky_notes` - Reception tools
- `staff_activities` - Staff-specific activity logging
- `themes` - Dynamic theming system

Your database is **enterprise-level sophisticated** - it's a **complete studio management platform** with professional features! 🎯
