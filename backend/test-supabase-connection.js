require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('🔗 Testing Supabase connection...');
  
  // Check if environment variables are set
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing Supabase environment variables');
    console.log('Please update your .env file with your Supabase credentials');
    return;
  }

  console.log('📊 Supabase URL:', process.env.SUPABASE_URL);
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test connection by trying to query users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Connection failed:', error.message);
      if (error.code === '42P01') {
        console.log('💡 This means the database schema hasn\'t been created yet.');
        console.log('Please run the SQL schema in your Supabase dashboard.');
      }
      return;
    }

    console.log('✅ Successfully connected to Supabase!');
    console.log('🎉 Database is ready for migration');
    
    return true;
    
  } catch (error) {
    console.log('❌ Connection error:', error.message);
    return false;
  }
}

testSupabaseConnection(); 