const fetch = require('node-fetch');

async function createSupabaseClientTables() {
  try {
    console.log('🚀 Creating client_notes table in Supabase...');

    // Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    console.log('📝 Creating client_notes table...');

    // First, let's check if the table already exists
    const checkTableResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_notes?select=id&limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (checkTableResponse.ok) {
      console.log('✅ client_notes table already exists');
      return;
    }

    console.log('❌ client_notes table does not exist');
    console.log('');
    console.log('🔧 Manual Setup Required:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the following SQL:');
    console.log('');
    console.log(`
CREATE TABLE client_notes (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_type TEXT CHECK(note_type IN ('general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment')) DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  is_private BOOLEAN DEFAULT false,
  tags TEXT,
  reminder_at TIMESTAMP WITH TIME ZONE,
  reminder_message TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX idx_client_notes_created_by ON client_notes(created_by);
CREATE INDEX idx_client_notes_type ON client_notes(note_type);
CREATE INDEX idx_client_notes_priority ON client_notes(priority);
CREATE INDEX idx_client_notes_created_at ON client_notes(created_at);
    `);
    console.log('');
    console.log('4. After running the SQL, restart your backend server');
    console.log('');

  } catch (error) {
    console.error('❌ Error checking client_notes table:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createSupabaseClientTables();
}

module.exports = { createSupabaseClientTables }; 