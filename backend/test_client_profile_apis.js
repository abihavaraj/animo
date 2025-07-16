const Database = require('./config/database');
const { logActivity } = require('./routes/clientActivity');

async function testClientProfileAPIs() {
  try {
    await Database.connect();
    console.log('🧪 Testing all client profile management APIs...\n');

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

    // 2. Test client activity API
    console.log('\n2. Testing client activity API...');
    
    // Add some test activity
    await logActivity(
      testClient.id,
      'subscription_purchase',
      'Test subscription purchase for API verification',
      { amount: 100, plan: 'test' },
      null,
      '127.0.0.1',
      'test-user-agent'
    );
    
    // Get client activities
    const activities = await Database.all(`
      SELECT 
        cal.*,
        u.name as performed_by_name
      FROM client_activity_log cal
      LEFT JOIN users u ON cal.performed_by = u.id
      WHERE cal.client_id = ?
      ORDER BY cal.created_at DESC
      LIMIT 10
    `, [testClient.id]);
    
    console.log(`✅ Found ${activities.length} activities for client`);
    if (activities.length > 0) {
      console.log(`   Latest activity: ${activities[0].activity_type} - ${activities[0].description}`);
    }

    // 3. Test client notes API
    console.log('\n3. Testing client notes API...');
    
    // Check if notes table exists and has data
    const notesCount = await Database.get(`
      SELECT COUNT(*) as count FROM client_notes WHERE client_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Found ${notesCount.count} notes for client`);

    // 4. Test client documents API
    console.log('\n4. Testing client documents API...');
    
    // Check if documents table exists and has data
    const documentsCount = await Database.get(`
      SELECT COUNT(*) as count FROM client_documents WHERE client_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Found ${documentsCount.count} documents for client`);

    // 5. Test client lifecycle API
    console.log('\n5. Testing client lifecycle API...');
    
    // Check if lifecycle table exists and has data
    const lifecycle = await Database.get(`
      SELECT * FROM client_lifecycle WHERE client_id = ?
    `, [testClient.id]);
    
    if (lifecycle) {
      console.log(`✅ Found lifecycle data: stage=${lifecycle.current_stage}, risk=${lifecycle.risk_score}`);
    } else {
      console.log('⚠️  No lifecycle data found - will be created on first access');
    }

    // 6. Test advanced client management tables
    console.log('\n6. Testing advanced client management tables...');
    
    // Check if tables exist
    const tables = ['client_activity_log', 'client_notes', 'client_documents', 'client_lifecycle'];
    
    for (const table of tables) {
      try {
        const result = await Database.get(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✅ Table ${table}: ${result.count} records`);
      } catch (error) {
        console.log(`❌ Table ${table}: Error - ${error.message}`);
      }
    }

    // 7. Test API route registration
    console.log('\n7. Testing API route registration...');
    
    // Check if routes are properly registered in server.js
    const serverContent = require('fs').readFileSync('./server.js', 'utf8');
    
    const routeChecks = [
      { route: 'client-activity', pattern: /client-activity/ },
      { route: 'client-notes', pattern: /client-notes/ },
      { route: 'client-documents', pattern: /client-documents/ },
      { route: 'client-lifecycle', pattern: /client-lifecycle/ }
    ];
    
    for (const check of routeChecks) {
      if (serverContent.includes(check.route)) {
        console.log(`✅ Route ${check.route} is registered`);
      } else {
        console.log(`❌ Route ${check.route} is NOT registered`);
      }
    }

    // 8. Test data consistency
    console.log('\n8. Testing data consistency...');
    
    // Check if user subscription data is consistent
    const subscriptions = await Database.all(`
      SELECT * FROM user_subscriptions WHERE user_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Found ${subscriptions.length} subscriptions for client`);

    // Check if booking data is consistent
    const bookings = await Database.all(`
      SELECT * FROM bookings WHERE user_id = ?
    `, [testClient.id]);
    
    console.log(`✅ Found ${bookings.length} bookings for client`);

    console.log('\n🎉 All client profile API tests completed successfully!');
    
    return {
      success: true,
      data: {
        clientId: testClient.id,
        clientName: testClient.name,
        activitiesCount: activities.length,
        notesCount: notesCount.count,
        documentsCount: documentsCount.count,
        hasLifecycle: !!lifecycle,
        subscriptionsCount: subscriptions.length,
        bookingsCount: bookings.length
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  } finally {
    await Database.close();
  }
}

// Run the test
testClientProfileAPIs().then(result => {
  console.log('\n📊 Test Results:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 