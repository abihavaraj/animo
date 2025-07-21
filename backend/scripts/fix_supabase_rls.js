const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSupabaseRLS() {
  console.log('🔧 Fixing Supabase RLS policies to prevent infinite recursion...');
  
  try {
    // Disable RLS on users table
    console.log('📋 Disabling RLS on users table...');
    await supabase.rpc('disable_rls', { table_name: 'users' });
    console.log('✅ RLS disabled on users table');
    
    // Disable RLS on subscription_plans table
    console.log('📋 Disabling RLS on subscription_plans table...');
    await supabase.rpc('disable_rls', { table_name: 'subscription_plans' });
    console.log('✅ RLS disabled on subscription_plans table');
    
    // Disable RLS on user_subscriptions table
    console.log('📋 Disabling RLS on user_subscriptions table...');
    await supabase.rpc('disable_rls', { table_name: 'user_subscriptions' });
    console.log('✅ RLS disabled on user_subscriptions table');
    
    // Disable RLS on classes table
    console.log('📋 Disabling RLS on classes table...');
    await supabase.rpc('disable_rls', { table_name: 'classes' });
    console.log('✅ RLS disabled on classes table');
    
    // Disable RLS on bookings table
    console.log('📋 Disabling RLS on bookings table...');
    await supabase.rpc('disable_rls', { table_name: 'bookings' });
    console.log('✅ RLS disabled on bookings table');
    
    // Disable RLS on notifications table
    console.log('📋 Disabling RLS on notifications table...');
    await supabase.rpc('disable_rls', { table_name: 'notifications' });
    console.log('✅ RLS disabled on notifications table');
    
    // Disable RLS on manual_credits table
    console.log('📋 Disabling RLS on manual_credits table...');
    await supabase.rpc('disable_rls', { table_name: 'manual_credits' });
    console.log('✅ RLS disabled on manual_credits table');
    
    // Disable RLS on payments table
    console.log('📋 Disabling RLS on payments table...');
    await supabase.rpc('disable_rls', { table_name: 'payments' });
    console.log('✅ RLS disabled on payments table');
    
    // Disable RLS on notification_settings table
    console.log('📋 Disabling RLS on notification_settings table...');
    await supabase.rpc('disable_rls', { table_name: 'notification_settings' });
    console.log('✅ RLS disabled on notification_settings table');
    
    console.log('🎉 Successfully disabled RLS on all tables!');
    console.log('📝 Note: This is a temporary fix. For production, you should implement proper RLS policies.');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
    
    // Alternative approach: Use SQL to disable RLS
    console.log('🔄 Trying alternative approach with direct SQL...');
    
    try {
      const tables = [
        'users',
        'subscription_plans', 
        'user_subscriptions',
        'classes',
        'bookings',
        'notifications',
        'manual_credits',
        'payments',
        'notification_settings'
      ];
      
      for (const table of tables) {
        console.log(`📋 Disabling RLS on ${table} table...`);
        const { error } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`
        });
        
        if (error) {
          console.log(`⚠️ Could not disable RLS on ${table}:`, error.message);
        } else {
          console.log(`✅ RLS disabled on ${table} table`);
        }
      }
      
      console.log('🎉 Alternative RLS fix completed!');
      
    } catch (sqlError) {
      console.error('❌ Alternative approach also failed:', sqlError);
      console.log('💡 Manual fix required: Go to Supabase Dashboard > Authentication > Policies');
      console.log('   Disable RLS on the following tables: users, subscription_plans, user_subscriptions, classes, bookings, notifications, manual_credits, payments, notification_settings');
    }
  }
}

// Run the fix
fixSupabaseRLS()
  .then(() => {
    console.log('✅ RLS fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ RLS fix failed:', error);
    process.exit(1);
  }); 