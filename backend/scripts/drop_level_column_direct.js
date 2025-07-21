require('dotenv').config();

async function dropLevelColumn() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }

  console.log('🗑️ Dropping level column from Supabase classes table...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE classes DROP COLUMN IF EXISTS level;'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to drop level column:', response.status, errorText);
      return;
    }

    console.log('✅ Level column dropped successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

dropLevelColumn(); 