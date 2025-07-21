const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const createTestUsers = async () => {
  try {
    console.log('🌱 Creating test users in Supabase...');

    // Test users to create
    const testUsers = [
      {
        email: 'admin@pilatesstudio.com',
        password: 'password123',
        user_metadata: {
          name: 'Admin User',
          role: 'admin',
          phone: '+1-555-0001'
        }
      },
      {
        email: 'reception@pilatesstudio.com',
        password: 'password123',
        user_metadata: {
          name: 'Reception User',
          role: 'reception',
          phone: '+1-555-0002'
        }
      },
      {
        email: 'instructor@pilatesstudio.com',
        password: 'password123',
        user_metadata: {
          name: 'Sarah Wilson',
          role: 'instructor',
          phone: '+1-555-0101'
        }
      },
      {
        email: 'client@pilatesstudio.com',
        password: 'password123',
        user_metadata: {
          name: 'Jennifer Smith',
          role: 'client',
          phone: '+1-555-0201',
          emergency_contact: 'Jennifer\'s Sister: +1-555-0301',
          medical_conditions: 'Lower back issues'
        }
      },
      {
        email: 'test@example.com',
        password: 'password123',
        user_metadata: {
          name: 'Test User',
          role: 'client',
          phone: '+1-555-9999'
        }
      }
    ];

    for (const user of testUsers) {
      try {
        console.log(`Creating user: ${user.email}`);
        
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: user.user_metadata
        });

        if (authError) {
          console.error(`❌ Error creating user ${user.email}:`, authError.message);
          continue;
        }

        console.log(`✅ Created user: ${user.email} (ID: ${authData.user.id})`);

        // Insert user data into users table
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: user.user_metadata.name,
            email: user.email,
            role: user.user_metadata.role,
            phone: user.user_metadata.phone,
            emergency_contact: user.user_metadata.emergency_contact || null,
            medical_conditions: user.user_metadata.medical_conditions || null,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`❌ Error inserting user data for ${user.email}:`, insertError.message);
        } else {
          console.log(`✅ Inserted user data for: ${user.email}`);
        }

      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error.message);
      }
    }

    console.log('🎉 Test users creation completed!');
    console.log('\n📋 Test Users Created:');
    console.log('- admin@pilatesstudio.com (password: password123)');
    console.log('- reception@pilatesstudio.com (password: password123)');
    console.log('- instructor@pilatesstudio.com (password: password123)');
    console.log('- client@pilatesstudio.com (password: password123)');
    console.log('- test@example.com (password: password123)');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  }
};

// Run the script
createTestUsers(); 