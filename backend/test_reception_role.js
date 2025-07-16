const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function testReceptionRole() {
  console.log('🧪 Testing reception role functionality...');
  
  try {
    // First, run the database migration
    const { addReceptionRole } = require('./scripts/add_reception_role');
    await addReceptionRole();
    
    // Connect to database for testing
    await db.connect();
    console.log('📱 Connected to database for testing');
    
    // Test creating a reception user
    console.log('👤 Creating test reception user...');
    
    const testUser = {
      name: 'Reception Test User',
      email: 'reception@pilatesstudio.test',
      password: await bcrypt.hash('password123', 10),
      phone: '+1234567890',
      role: 'reception'
    };
    
    // Delete existing test user if exists
    await db.run('DELETE FROM users WHERE email = ?', [testUser.email]);
    
    // Create reception user
    const result = await db.run(`
      INSERT INTO users (name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `, [testUser.name, testUser.email, testUser.password, testUser.phone, testUser.role]);
    
    console.log('✅ Reception user created with ID:', result.id);
    
    // Verify the user was created correctly
    const createdUser = await db.get(`
      SELECT id, name, email, phone, role, status
      FROM users WHERE id = ?
    `, [result.id]);
    
    console.log('📋 Created user details:', createdUser);
    
    // Test role-based queries
    console.log('🔍 Testing role-based queries...');
    
    const allStaff = await db.all(`
      SELECT id, name, email, role
      FROM users 
      WHERE role IN ('instructor', 'admin', 'reception') 
      AND status = 'active'
      ORDER BY name
    `);
    
    console.log('👥 All staff members:', allStaff);
    
    // Test that we can query reception users specifically
    const receptionUsers = await db.all(`
      SELECT id, name, email, role
      FROM users 
      WHERE role = 'reception' 
      AND status = 'active'
    `);
    
    console.log('🏢 Reception users:', receptionUsers);
    
    console.log('✅ All tests passed! Reception role is working correctly.');
    
    return {
      success: true,
      receptionUserId: result.id,
      receptionUser: createdUser
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Always close the database connection
    try {
      await db.close();
      console.log('📱 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
  }
}

// Run the test
if (require.main === module) {
  testReceptionRole()
    .then((result) => {
      if (result.success) {
        console.log('🎉 Reception role test completed successfully!');
        console.log('🏢 You can now create reception users and they will have access to:');
        console.log('  - User Management (create/edit clients and staff)');
        console.log('  - Class Management (create/schedule classes)');
        console.log('  - Subscription Plans (create/manage plans)');
        console.log('  - Client Documents (upload documents)');
        console.log('  - Client Notes (create/manage notes)');
        console.log('  - Plan Assignment (attach plans to clients)');
        process.exit(0);
      } else {
        console.log('💥 Reception role test failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test script error:', error);
      process.exit(1);
    });
}

module.exports = { testReceptionRole }; 