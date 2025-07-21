const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

// Create Supabase clients
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const checkSupabaseConnection = async () => {
  try {
    console.log('🔍 Checking Supabase connection and users...');
    console.log('URL:', supabaseUrl);
    console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
    console.log('Service Key:', supabaseServiceKey.substring(0, 20) + '...');
    
    // Test 1: Check service connection
    console.log('\n📡 Testing service connection...');
    try {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('❌ Service connection failed:', error.message);
        return;
      }
      
      console.log(`✅ Service connection successful. Found ${users.length} users.`);
      
      // List all users
      console.log('\n👥 Users in Supabase Auth:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
        console.log(`   - Created: ${user.created_at}`);
        console.log(`   - Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        if (user.user_metadata) {
          console.log(`   - Name: ${user.user_metadata.name}`);
          console.log(`   - Role: ${user.user_metadata.role}`);
        }
        console.log('');
      });
      
    } catch (error) {
      console.error('❌ Service connection error:', error.message);
    }
    
    // Test 2: Check if users table exists
    console.log('\n📋 Checking users table...');
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(5);
      
      if (error) {
        console.error('❌ Users table error:', error.message);
        console.log('💡 The users table might not exist. Creating it...');
        
        // Try to create users table
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY REFERENCES auth.users(id),
            name TEXT,
            email TEXT UNIQUE,
            role TEXT DEFAULT 'client',
            phone TEXT,
            emergency_contact TEXT,
            medical_conditions TEXT,
            referral_source TEXT,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `;
        
        const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableQuery });
        
        if (createError) {
          console.error('❌ Failed to create users table:', createError.message);
        } else {
          console.log('✅ Users table created successfully');
        }
      } else {
        console.log(`✅ Users table exists with ${data.length} records`);
        data.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name} (${user.email}) - ${user.role}`);
        });
      }
    } catch (error) {
      console.error('❌ Users table check error:', error.message);
    }
    
    // Test 3: Test client authentication
    console.log('\n🔐 Testing client authentication...');
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: 'admin@pilatesstudio.com',
        password: 'password123'
      });
      
      if (error) {
        console.error('❌ Client auth failed:', error.message);
        
        if (error.message.includes('Invalid login credentials')) {
          console.log('💡 User might not exist or password is wrong');
        } else if (error.message.includes('Email not confirmed')) {
          console.log('💡 User exists but email not confirmed');
        }
      } else {
        console.log('✅ Client auth successful:', data.user.email);
        
        // Sign out immediately
        await supabaseClient.auth.signOut();
        console.log('✅ Signed out successfully');
      }
    } catch (error) {
      console.error('❌ Client auth error:', error.message);
    }
    
    console.log('\n🎉 Supabase check completed!');
    
  } catch (error) {
    console.error('❌ Overall check failed:', error);
  }
};

// Run the check
checkSupabaseConnection(); 