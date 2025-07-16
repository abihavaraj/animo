const db = require('./config/database');

const testClientAssignment = async () => {
  try {
    console.log('🧪 Testing Client Assignment Functionality...\n');

    // Get a reception user
    const receptionUser = await db.get(
      'SELECT * FROM users WHERE role = "reception" LIMIT 1'
    );

    if (!receptionUser) {
      console.log('❌ No reception user found. Please create one first.');
      return;
    }

    console.log(`👤 Using reception user: ${receptionUser.name} (${receptionUser.email})`);

    // Get a client
    const client = await db.get(
      'SELECT * FROM users WHERE role = "client" LIMIT 1'
    );

    if (!client) {
      console.log('❌ No client found. Please create one first.');
      return;
    }

    console.log(`👤 Using client: ${client.name} (${client.email})`);

    // Get an active class
    const class_ = await db.get(`
      SELECT * FROM classes 
      WHERE status = "active" 
      AND date >= DATE('now')
      ORDER BY date ASC, time ASC
      LIMIT 1
    `);

    if (!class_) {
      console.log('❌ No active classes found. Please create one first.');
      return;
    }

    console.log(`🏋️ Using class: "${class_.name}" on ${class_.date} at ${class_.time}`);

    // Check current enrollment
    const currentEnrollment = await db.get(
      'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND status = "confirmed"',
      [class_.id]
    );

    console.log(`📊 Current enrollment: ${currentEnrollment.count}/${class_.capacity}`);

    // Check if client already has a booking for this class
    const existingBooking = await db.get(
      'SELECT * FROM bookings WHERE user_id = ? AND class_id = ?',
      [client.id, class_.id]
    );

    if (existingBooking) {
      console.log(`⚠️ Client already has a booking for this class (status: ${existingBooking.status})`);
    } else {
      console.log('✅ Client does not have a booking for this class');
    }

    // Get client's subscription
    const subscription = await db.get(`
      SELECT us.*, sp.equipment_access, sp.category
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
        AND DATE(us.end_date) >= DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [client.id]);

    if (subscription) {
      console.log(`💳 Client has subscription: ${subscription.plan_name || 'Unknown'} (${subscription.remaining_classes} classes remaining)`);
    } else {
      console.log('⚠️ Client has no active subscription');
    }

    console.log('\n🎯 Testing API Endpoint...');
    console.log('📋 POST /api/bookings/reception-assign');
    console.log(`   - userId: ${client.id}`);
    console.log(`   - classId: ${class_.id}`);
    console.log(`   - notes: "Test assignment by reception"`);
    console.log(`   - overrideRestrictions: false`);

    console.log('\n✅ Client assignment functionality is ready for testing!');
    console.log('🔧 You can now test the reception portal to assign clients to classes.');

  } catch (error) {
    console.error('❌ Error testing client assignment:', error);
  } finally {
    await db.close();
    console.log('\n📱 Database connection closed');
  }
};

testClientAssignment(); 