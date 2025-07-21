const fetch = require('node-fetch');

async function createSupabaseClientTables() {
  try {
    console.log('🚀 Creating advanced client management tables in Supabase...');

    // Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    console.log('📝 Creating client_notes table...');

    // Create client_notes table using Supabase REST API with PostgreSQL syntax
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS client_notes (
        id SERIAL PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        note_type TEXT CHECK(note_type IN ('general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment')) DEFAULT 'general',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
        is_private BOOLEAN DEFAULT false,
        tags TEXT, -- JSON array of tags
        reminder_at TIMESTAMP WITH TIME ZONE,
        reminder_message TEXT,
        reminder_sent BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Execute the SQL using Supabase REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creating client_notes table:', errorText);
      throw new Error('Failed to create client_notes table: ' + errorText);
    }

    console.log('✅ client_notes table created successfully');

    // Create indexes
    console.log('⚡ Creating indexes...');
    
    const createIndexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id);
      CREATE INDEX IF NOT EXISTS idx_client_notes_created_by ON client_notes(created_by);
      CREATE INDEX IF NOT EXISTS idx_client_notes_type ON client_notes(note_type);
      CREATE INDEX IF NOT EXISTS idx_client_notes_priority ON client_notes(priority);
      CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON client_notes(created_at);
    `;

    const indexResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: createIndexesSQL
      })
    });

    if (!indexResponse.ok) {
      const errorText = await indexResponse.text();
      console.error('❌ Error creating indexes:', errorText);
    } else {
      console.log('✅ Indexes created successfully');
    }

    // Create client_activity_log table
    console.log('📊 Creating client_activity_log table...');
    
    const createActivityLogSQL = `
      CREATE TABLE IF NOT EXISTS client_activity_log (
        id SERIAL PRIMARY KEY,
        client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type TEXT CHECK(activity_type IN (
          'registration', 'login', 'subscription_purchase', 'subscription_renewal', 'subscription_cancellation',
          'class_booking', 'class_cancellation', 'class_attendance', 'class_no_show',
          'payment_made', 'payment_failed', 'profile_update', 'note_added', 'document_uploaded',
          'status_change', 'communication_sent', 'waitlist_joined', 'waitlist_promoted'
        )) NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT, -- JSON data for activity details
        performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const activityLogResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: createActivityLogSQL
      })
    });

    if (!activityLogResponse.ok) {
      const errorText = await activityLogResponse.text();
      console.error('❌ Error creating client_activity_log table:', errorText);
    } else {
      console.log('✅ client_activity_log table created successfully');
    }

    console.log('✅ Advanced client management tables created successfully in Supabase!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('   🗒️  client_notes - Admin notes and observations');
    console.log('   📊  client_activity_log - Comprehensive activity tracking');
    console.log('');
    console.log('🎯 Features enabled:');
    console.log('   ✅ Client notes with categories and priorities');
    console.log('   ✅ Complete activity timeline');

  } catch (error) {
    console.error('❌ Error creating Supabase client tables:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createSupabaseClientTables();
}

module.exports = { createSupabaseClientTables }; 