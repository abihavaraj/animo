const db = require('../config/database');

async function removeLevelColumnFromSupabase() {
  console.log('🗑️ Removing level column from Supabase classes table...');
  
  try {
    if (!db.useSupabase) {
      console.log('❌ This script is only for Supabase. Set useSupabase to true in config.');
      return;
    }

    // Drop level column
    console.log('📝 Dropping level column...');
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: `ALTER TABLE classes DROP COLUMN IF EXISTS level;`
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to drop level column:', response.status, errorText);
      return;
    }

    console.log('✅ Level column dropped successfully!');
    
  } catch (error) {
    console.error('❌ Error removing level column:', error);
  }
}

// Run the migration
removeLevelColumnFromSupabase()
  .then(() => {
    console.log('🎉 Level column removal completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }); 