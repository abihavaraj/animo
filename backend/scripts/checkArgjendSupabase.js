const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const checkArgjendUser = async () => {
  try {
    console.log('🔍 Checking argjend@argjend.com user in Supabase...\n');

    // Check if user exists in auth.users
    console.log('1. Checking Supabase Auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError.message);
      return;
    }

    const argjendAuthUser = authUsers.users.find(user => user.email === 'argjend@argjend.com');
    
    if (argjendAuthUser) {
      console.log('✅ Found argjend@argjend.com in Supabase Auth:');
      console.log('   ID:', argjendAuthUser.id);
      console.log('   Email:', argjendAuthUser.email);
      console.log('   Email Confirmed:', argjendAuthUser.email_confirmed_at ? 'Yes' : 'No');
      console.log('   Created:', argjendAuthUser.created_at);
      console.log('   Last Sign In:', argjendAuthUser.last_sign_in_at || 'Never');
    } else {
      console.log('❌ argjend@argjend.com NOT found in Supabase Auth');
    }

    // Check if user exists in users table
    console.log('\n2. Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'argjend@argjend.com');

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message);
      return;
    }

    if (users && users.length > 0) {
      const user = users[0];
      console.log('✅ Found argjend@argjend.com in users table:');
      console.log('   ID:', user.id);
      console.log('   Name:', user.name);
      console.log('   Role:', user.role);
      console.log('   Status:', user.status);
      console.log('   Created:', user.created_at);
    } else {
      console.log('❌ argjend@argjend.com NOT found in users table');
    }

    // Test authentication
    console.log('\n3. Testing authentication...');
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'argjend@argjend.com',
      password: 'password123'
    });

    if (signInError) {
      console.log('❌ Authentication failed:', signInError.message);
      
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('\n🔧 Possible solutions:');
        console.log('1. Check if the password is correct');
        console.log('2. The user might need to be recreated in Supabase Auth');
        console.log('3. Try creating the user again with the correct password');
      }
    } else {
      console.log('✅ Authentication successful!');
      console.log('   User ID:', authData.user.id);
      console.log('   Session:', authData.session ? 'Active' : 'No session');
    }

    // List all available users for reference
    console.log('\n4. All available users in Auth:');
    authUsers.users.forEach(user => {
      console.log(`   - ${user.email} (${user.email_confirmed_at ? 'confirmed' : 'unconfirmed'})`);
    });

  } catch (error) {
    console.error('❌ Error checking user:', error);
  }
};

// Run the script
checkArgjendUser(); 