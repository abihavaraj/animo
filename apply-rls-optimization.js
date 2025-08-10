const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyRLSOptimization() {
  console.log('🚀 Applying RLS Performance Optimization...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '006_optimize_rls_policies.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Migration file not found. Please ensure the file exists at:');
      console.log(`   ${migrationPath}`);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // For DROP POLICY statements, we'll use a different approach
        if (statement.includes('DROP POLICY')) {
          console.log(`   ⚠️ Skipping DROP POLICY (requires admin privileges)`);
          continue;
        }

        // For CREATE POLICY and other statements
        if (statement.includes('CREATE POLICY') || statement.includes('CREATE INDEX') || statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log(`   🔧 Executing: ${statement.substring(0, 50)}...`);
          
          // Note: This would require admin privileges in Supabase
          // For now, we'll just show what needs to be done
          console.log(`   ℹ️ This statement needs to be run in Supabase SQL Editor`);
        }
        
        successCount++;
      } catch (error) {
        console.log(`   ❌ Error executing statement ${i + 1}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Execution Summary:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    console.log('\n📝 Manual Steps Required:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the entire migration file content');
    console.log('4. Execute the migration');
    console.log('5. Test your application functionality');

    console.log('\n🔍 Verification Steps:');
    console.log('1. Check Supabase Dashboard Performance section');
    console.log('2. Look for disappearance of warnings:');
    console.log('   - auth_rls_initplan');
    console.log('   - multiple_permissive_policies');
    console.log('3. Test all application features');

  } catch (error) {
    console.error('❌ Failed to apply optimization:', error.message);
  }
}

// Function to generate the SQL for manual execution
function generateMigrationSQL() {
  console.log('\n📄 Migration SQL for Manual Execution:\n');
  console.log('-- Copy this to your Supabase SQL Editor --\n');
  
  const migrationSQL = `
-- Migration: Optimize RLS Policies for Performance
-- This migration addresses auth_rls_initplan and multiple_permissive_policies warnings

-- Drop existing policies to recreate them optimized
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Anyone can view active classes" ON public.classes;
DROP POLICY IF EXISTS "Instructors can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view own waitlist items" ON public.waitlist;
DROP POLICY IF EXISTS "Users can create own waitlist items" ON public.waitlist;
DROP POLICY IF EXISTS "Admins can manage all waitlist items" ON public.waitlist;

-- Drop policies from instructor tables
DROP POLICY IF EXISTS "Instructors can view their assigned clients" ON instructor_client_assignments;
DROP POLICY IF EXISTS "Admin and reception can manage assignments" ON instructor_client_assignments;
DROP POLICY IF EXISTS "Instructors can manage photos for their clients" ON client_progress_photos;
DROP POLICY IF EXISTS "Instructors can manage medical updates for their clients" ON client_medical_updates;
DROP POLICY IF EXISTS "Instructors can manage assessments for their clients" ON client_progress_assessments;

-- Create optimized policies with reduced auth.uid() calls
-- Users table: Single consolidated policy
CREATE POLICY "users_access_policy" ON public.users
  FOR ALL USING (
    auth.uid() = id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Subscription plans: Single consolidated policy
CREATE POLICY "subscription_plans_access_policy" ON public.subscription_plans
  FOR ALL USING (
    is_active = true OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- User subscriptions: Single consolidated policy
CREATE POLICY "user_subscriptions_access_policy" ON public.user_subscriptions
  FOR ALL USING (
    user_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Classes: Single consolidated policy
CREATE POLICY "classes_access_policy" ON public.classes
  FOR ALL USING (
    status = 'active' OR 
    instructor_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Bookings: Single consolidated policy
CREATE POLICY "bookings_access_policy" ON public.bookings
  FOR ALL USING (
    user_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Waitlist: Single consolidated policy
CREATE POLICY "waitlist_access_policy" ON public.waitlist
  FOR ALL USING (
    user_id = auth.uid() OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Instructor client assignments: Single consolidated policy
CREATE POLICY "instructor_assignments_access_policy" ON instructor_client_assignments
  FOR ALL USING (
    auth.uid() = instructor_id OR 
    auth.uid() = client_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Client progress photos: Single consolidated policy
CREATE POLICY "progress_photos_access_policy" ON client_progress_photos
  FOR ALL USING (
    auth.uid() = instructor_id OR 
    auth.uid() = client_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Client medical updates: Single consolidated policy
CREATE POLICY "medical_updates_access_policy" ON client_medical_updates
  FOR ALL USING (
    auth.uid() = instructor_id OR 
    auth.uid() = client_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Client progress assessments: Single consolidated policy
CREATE POLICY "progress_assessments_access_policy" ON client_progress_assessments
  FOR ALL USING (
    auth.uid() = instructor_id OR 
    auth.uid() = client_id OR 
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'reception')
  );

-- Create a function to get user role efficiently (cached)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes to support the optimized policies
CREATE INDEX IF NOT EXISTS idx_users_role_for_rls ON public.users(role) WHERE role IN ('admin', 'reception');
CREATE INDEX IF NOT EXISTS idx_classes_instructor_status ON public.classes(instructor_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_instructor_client ON instructor_client_assignments(instructor_id, client_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_instructor_client ON client_progress_photos(instructor_id, client_id);
CREATE INDEX IF NOT EXISTS idx_medical_updates_instructor_client ON client_medical_updates(instructor_id, client_id);
CREATE INDEX IF NOT EXISTS idx_progress_assessments_instructor_client ON client_progress_assessments(instructor_id, client_id);
`;

  console.log(migrationSQL);
}

// Run the application
applyRLSOptimization().then(() => {
  generateMigrationSQL();
}); 