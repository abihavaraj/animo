const fetch = require('node-fetch');

async function testActivityTable() {
  try {
    console.log('🔍 Testing client_activity_log table in Supabase...');

    // Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    // First, let's check if the table exists
    const checkTableResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log?select=id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (checkTableResponse.ok) {
      console.log('✅ client_activity_log table exists');
      
      // Test inserting a sample activity
      const testActivityData = {
        client_id: '0c6754c3-1c84-438a-8b56-f8a6a3f44fcc', // Use the user ID from your logs
        activity_type: 'class_booking',
        description: 'Test activity from reception assignment',
        performed_by: 'e374cc3b-de48-4e1b-a5ac-73314469df17', // Reception user ID
        created_at: new Date().toISOString()
      };

      const insertResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(testActivityData)
      });

      if (insertResponse.ok) {
        const insertedActivity = await insertResponse.json();
        console.log('✅ Successfully inserted test activity:', insertedActivity[0]);
        
        // Now test fetching activities
        const fetchResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log?client_id=eq.0c6754c3-1c84-438a-8b56-f8a6a3f44fcc&select=*,performed_by:users!client_activity_log_performed_by_fkey(name)&order=created_at.desc&limit=5`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (fetchResponse.ok) {
          const activities = await fetchResponse.json();
          console.log('✅ Successfully fetched activities:', activities.length, 'activities found');
          console.log('📋 Sample activity:', activities[0]);
        } else {
          const errorText = await fetchResponse.text();
          console.error('❌ Failed to fetch activities:', errorText);
        }
      } else {
        const errorText = await insertResponse.text();
        console.error('❌ Failed to insert test activity:', errorText);
      }
    } else {
      console.log('❌ client_activity_log table does not exist');
      console.log('📝 You need to create the table in Supabase SQL Editor with this SQL:');
      console.log(`
CREATE TABLE client_activity_log (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT CHECK(activity_type IN (
    'registration', 'login', 'subscription_purchase', 'subscription_renewal', 'subscription_cancellation',
    'subscription_extended', 'subscription_paused', 'subscription_resumed',
    'class_booking', 'class_cancellation', 'class_attendance', 'class_no_show',
    'payment_made', 'payment_failed', 'profile_update', 'note_added', 'document_uploaded',
    'status_change', 'communication_sent', 'waitlist_joined', 'waitlist_promoted'
  )) NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
      `);
    }

  } catch (error) {
    console.error('❌ Error testing activity table:', error);
  }
}

// Run the test
testActivityTable(); 