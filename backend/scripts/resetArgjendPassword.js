const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const resetArgjendPassword = async () => {
  try {
    console.log('🔧 Resetting password for argjend@argjend.com...\n');

    const newPassword = 'password123';
    const userId = '0c6754c3-1c84-438a-8b56-f8a6a3f44fcc';

    // Update the user's password in Supabase Auth
    console.log('1. Updating password in Supabase Auth...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Error updating password:', updateError.message);
      return;
    }

    console.log('✅ Password updated successfully in Supabase Auth');
    console.log('   User ID:', updateData.user.id);
    console.log('   Email:', updateData.user.email);

    // Test the new password
    console.log('\n2. Testing authentication with new password...');
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'argjend@argjend.com',
      password: newPassword
    });

    if (signInError) {
      console.error('❌ Authentication still failed:', signInError.message);
    } else {
      console.log('✅ Authentication successful with new password!');
      console.log('   User ID:', authData.user.id);
      console.log('   Session:', authData.session ? 'Active' : 'No session');
    }

    console.log('\n🎉 Password reset completed!');
    console.log('📋 Login credentials:');
    console.log('   Email: argjend@argjend.com');
    console.log('   Password: password123');

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
};

// Run the script
resetArgjendPassword(); 