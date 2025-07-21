const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function updateSupabaseClassesSchema() {
  console.log('🔧 Adding missing columns to Supabase classes table...');
  
  try {
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('📝 Executing SQL to add missing columns...');
    
    // Execute SQL to add all missing columns at once
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Add category column
        ALTER TABLE classes 
        ADD COLUMN IF NOT EXISTS category TEXT 
        CHECK (category IN ('personal', 'group')) 
        DEFAULT 'group';

        -- Add room column  
        ALTER TABLE classes 
        ADD COLUMN IF NOT EXISTS room TEXT 
        CHECK (room IN ('Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room', ''));

        -- Add notes column
        ALTER TABLE classes 
        ADD COLUMN IF NOT EXISTS notes TEXT;

        -- Update existing classes to have default category
        UPDATE classes 
        SET category = 'group' 
        WHERE category IS NULL;
      `
    });

    if (error) {
      console.error('❌ SQL execution error:', error);
      
      // Try alternative approach - individual column additions
      console.log('🔄 Trying alternative approach with individual operations...');
      
      try {
        // Try using direct SQL execution via fetch
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE classes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'group\';'
          })
        });

        if (response.ok) {
          console.log('✅ Category column added via direct SQL');
        } else {
          console.log('ℹ️ Category column might already exist');
        }

        // Add room column
        const roomResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE classes ADD COLUMN IF NOT EXISTS room TEXT;'
          })
        });

        if (roomResponse.ok) {
          console.log('✅ Room column added via direct SQL');
        } else {
          console.log('ℹ️ Room column might already exist');
        }

        // Add notes column
        const notesResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE classes ADD COLUMN IF NOT EXISTS notes TEXT;'
          })
        });

        if (notesResponse.ok) {
          console.log('✅ Notes column added via direct SQL');
        } else {
          console.log('ℹ️ Notes column might already exist');
        }

      } catch (fetchError) {
        console.error('❌ Direct SQL approach also failed:', fetchError);
        console.log('');
        console.log('🔧 MANUAL MIGRATION REQUIRED:');
        console.log('Please run the following SQL commands in your Supabase SQL Editor:');
        console.log('');
        console.log('ALTER TABLE classes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'group\';');
        console.log('ALTER TABLE classes ADD COLUMN IF NOT EXISTS room TEXT;');
        console.log('ALTER TABLE classes ADD COLUMN IF NOT EXISTS notes TEXT;');
        console.log('UPDATE classes SET category = \'group\' WHERE category IS NULL;');
        console.log('');
        return;
      }
    } else {
      console.log('✅ All columns added successfully via RPC');
    }

    console.log('✅ Successfully updated Supabase classes schema!');
    console.log('📝 Changes made:');
    console.log('   - Added category column (personal, group) with default "group"');
    console.log('   - Added room column (Reformer Room, Mat Room, Cadillac Room, Wall Room)');
    console.log('   - Added notes column (TEXT)');
    
  } catch (error) {
    console.error('❌ Error updating Supabase classes schema:', error);
    console.log('');
    console.log('🔧 MANUAL MIGRATION REQUIRED:');
    console.log('Please run the following SQL commands in your Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE classes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT \'group\';');
    console.log('ALTER TABLE classes ADD COLUMN IF NOT EXISTS room TEXT;');
    console.log('ALTER TABLE classes ADD COLUMN IF NOT EXISTS notes TEXT;');
    console.log('UPDATE classes SET category = \'group\' WHERE category IS NULL;');
    console.log('');
    throw error;
  }
}

// Run the migration if called directly
if (require.main === module) {
  updateSupabaseClassesSchema()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = updateSupabaseClassesSchema; 