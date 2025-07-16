const Database = require('./config/database');

async function testNotificationSystem() {
  try {
    await Database.connect();
    console.log('🧪 Testing notification system...\n');

    // 1. Check if tables exist
    console.log('1. Checking notification tables...');
    const tables = await Database.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name LIKE '%notification%'
    `);
    console.log('   Notification tables:', tables.map(t => t.name));

    // 2. Get a sample class
    console.log('\n2. Finding sample class...');
    const sampleClass = await Database.get(`
      SELECT c.*, u.name as instructor_name
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      ORDER BY c.date DESC, c.time DESC
      LIMIT 1
    `);
    
    if (!sampleClass) {
      console.log('   ❌ No classes found. Please create a class first.');
      return;
    }
    
    console.log(`   ✅ Found class: "${sampleClass.name}" on ${sampleClass.date} at ${sampleClass.time}`);

    // 3. Get sample user
    console.log('\n3. Finding sample user...');
    const sampleUser = await Database.get(`
      SELECT * FROM users WHERE role = 'client' LIMIT 1
    `);
    
    if (!sampleUser) {
      console.log('   ❌ No client users found. Please create a client user first.');
      return;
    }
    
    console.log(`   ✅ Found user: ${sampleUser.name} (${sampleUser.email})`);

    // 4. Skip booking creation for now - just test notification scheduling
    console.log('\n4. Skipping booking creation for this test...');
    console.log('   ✅ Will test notification scheduling directly');

    // 5. Create notification settings for the class
    console.log('\n5. Setting up class notification settings...');
    await Database.run(`
      INSERT OR REPLACE INTO class_notification_settings 
      (class_id, enable_notifications, notification_minutes)
      VALUES (?, 1, 2)
    `, [sampleClass.id]);
    console.log('   ✅ Class notification settings created (2 minutes before)');

    // 6. Schedule a test notification (2 minutes from now)
    console.log('\n6. Scheduling test notification...');
    const notificationTime = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const message = `🧪 TEST: Your ${sampleClass.name} class with ${sampleClass.instructor_name} starts in 2 minutes!`;
    
    await Database.run(`
      INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
      VALUES (?, ?, 'reminder', ?, ?)
    `, [sampleClass.id, sampleUser.id, message, notificationTime.toISOString()]);
    
    console.log(`   ✅ Test notification scheduled for: ${notificationTime.toLocaleString()}`);
    console.log(`   📱 Message: ${message}`);

    // 7. Show pending notifications
    console.log('\n7. Checking pending notifications...');
    const pendingNotifications = await Database.all(`
      SELECT 
        n.*,
        c.name as class_name,
        u.name as user_name
      FROM notifications n
      LEFT JOIN classes c ON n.class_id = c.id
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.sent = 0
      ORDER BY n.scheduled_time ASC
    `);
    
    console.log(`   📋 Pending notifications: ${pendingNotifications.length}`);
    pendingNotifications.forEach(n => {
      console.log(`   - ${n.type} for ${n.user_name} at ${new Date(n.scheduled_time).toLocaleString()}`);
    });

    console.log('\n✅ Notification system test completed!');
    console.log('\n🕐 Wait 2 minutes and check the server console for the notification output.');
    console.log('📝 The notification scheduler runs every minute and will send the notification when the time comes.');

    await Database.close();

  } catch (error) {
    console.error('❌ Test failed:', error);
    await Database.close();
  }
}

// Run the test
testNotificationSystem(); 