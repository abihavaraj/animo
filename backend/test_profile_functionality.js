const Database = require('./config/database');
const { logActivity } = require('./routes/clientActivity');

async function testProfileFunctionality() {
  try {
    await Database.connect();
    console.log('🧪 Testing all client profile functionality...\n');

    // 1. Get a test client user
    console.log('1. Finding test client...');
    const testClient = await Database.get(`
      SELECT * FROM users WHERE role = 'client' LIMIT 1
    `);
    
    if (!testClient) {
      console.log('❌ No client users found. Please create a client user first.');
      return { success: false, error: 'No client users found' };
    }
    
    console.log(`✅ Found test client: ${testClient.name} (${testClient.email})`);

    // 2. Test Activity Timeline functionality
    console.log('\n2. Testing Activity Timeline...');
    
    // Add some test activities
    await logActivity(
      testClient.id,
      'subscription_extended',
      'Subscription extended by reception for profile testing',
      { days: 30, reason: 'client request' },
      null,
      '127.0.0.1',
      'test-script'
    );
    
    await logActivity(
      testClient.id,
      'class_booking',
      'Class booking activity for profile testing',
      { class_name: 'Power Mat', class_date: '2025-01-10' },
      null,
      '127.0.0.1',
      'test-script'
    );
    
    const activities = await Database.all(`
      SELECT COUNT(*) as count FROM client_activity_log WHERE client_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Activity Timeline: ${activities[0].count} activities recorded`);

    // 3. Test Notes functionality
    console.log('\n3. Testing Notes management...');
    
    // Add a test note
    const noteResult = await Database.run(`
      INSERT INTO client_notes (
        client_id, admin_id, note_type, title, content, priority, is_private
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      testClient.id,
      1, // Admin user ID
      'general',
      'Profile Test Note',
      'This is a test note created during profile functionality testing.',
      'medium',
      0
    ]);

    const notes = await Database.all(`
      SELECT COUNT(*) as count FROM client_notes WHERE client_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Notes management: ${notes[0].count} notes, added test note ID ${noteResult.id}`);

    // 4. Test Documents functionality (table existence)
    console.log('\n4. Testing Documents management...');
    
    const documents = await Database.all(`
      SELECT COUNT(*) as count FROM client_documents WHERE client_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Documents management: ${documents[0].count} documents (table functional)`);

    // 5. Test Lifecycle functionality
    console.log('\n5. Testing Lifecycle management...');
    
    // Create or update lifecycle entry
    await Database.run(`
      INSERT OR REPLACE INTO client_lifecycle (
        client_id, current_stage, risk_score, notes
      ) VALUES (?, ?, ?, ?)
    `, [
      testClient.id,
      'active',
      25,
      'Updated during profile functionality testing'
    ]);

    const lifecycle = await Database.get(`
      SELECT * FROM client_lifecycle WHERE client_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Lifecycle management: Stage=${lifecycle.current_stage}, Risk=${lifecycle.risk_score}%`);

    // 6. Test Bookings tab data
    console.log('\n6. Testing Bookings data...');
    
    const bookings = await Database.all(`
      SELECT COUNT(*) as count FROM bookings WHERE user_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Bookings tab: ${bookings[0].count} bookings`);

    // 7. Test Payments tab data
    console.log('\n7. Testing Payments data...');
    
    const payments = await Database.all(`
      SELECT COUNT(*) as count FROM payments WHERE user_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Payments tab: ${payments[0].count} payments`);

    // 8. Test Subscriptions/Plans tab data
    console.log('\n8. Testing Subscriptions data...');
    
    const subscriptions = await Database.all(`
      SELECT COUNT(*) as count FROM user_subscriptions WHERE user_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Subscriptions tab: ${subscriptions[0].count} subscriptions`);

    // 9. Test Overview tab data compilation
    console.log('\n9. Testing Overview tab data...');
    
    // Get stats that would appear on overview
    const totalSpent = await Database.get(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM payments WHERE user_id = ? AND status = 'completed'
    `, [testClient.id]);
    
    const totalBookings = await Database.get(`
      SELECT COUNT(*) as count FROM bookings WHERE user_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Overview tab: $${totalSpent.total} spent, ${totalBookings.count} total bookings`);

    // 10. Verify all advanced client management tables are working
    console.log('\n10. Final advanced features verification...');
    
    const tableChecks = [
      { name: 'client_activity_log', count: activities[0].count },
      { name: 'client_notes', count: notes[0].count },
      { name: 'client_documents', count: documents[0].count },
      { name: 'client_lifecycle', hasData: !!lifecycle }
    ];
    
    tableChecks.forEach(check => {
      if (check.count !== undefined) {
        console.log(`   ✅ ${check.name}: ${check.count} records`);
      } else {
        console.log(`   ✅ ${check.name}: ${check.hasData ? 'has data' : 'no data'}`);
      }
    });

    console.log('\n🎉 All client profile functionality tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Activity Timeline: Working with ${activities[0].count} activities`);
    console.log(`   • Notes Management: Working with ${notes[0].count} notes`);
    console.log(`   • Documents Management: Table ready (${documents[0].count} documents)`);
    console.log(`   • Lifecycle Management: Working (${lifecycle.current_stage} stage, ${lifecycle.risk_score}% risk)`);
    console.log(`   • Bookings Tab: ${bookings[0].count} bookings`);
    console.log(`   • Payments Tab: ${payments[0].count} payments`);
    console.log(`   • Subscriptions Tab: ${subscriptions[0].count} subscriptions`);
    console.log(`   • Overview Tab: All data compiled successfully`);
    
    return {
      success: true,
      summary: {
        clientId: testClient.id,
        clientName: testClient.name,
        activities: activities[0].count,
        notes: notes[0].count,
        documents: documents[0].count,
        lifecycle: lifecycle,
        bookings: bookings[0].count,
        payments: payments[0].count,
        subscriptions: subscriptions[0].count,
        totalSpent: totalSpent.total
      }
    };

  } catch (error) {
    console.error('❌ Profile functionality test failed:', error);
    return { success: false, error: error.message };
  } finally {
    await Database.close();
  }
}

// Run the test
testProfileFunctionality().then(result => {
  console.log('\n📊 Final Test Results:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 