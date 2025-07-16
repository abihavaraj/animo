const Database = require('./config/database');
const { Expo } = require('expo-server-sdk');

async function testPushNotifications() {
  try {
    console.log('🧪 Testing push notification system...\n');

    await Database.connect();

    // 1. Add a test push token to a user
    console.log('1. Adding test push token to user...');
    
    const testPushToken = 'ExponentPushToken[test-token-123]'; // This is a fake token for testing
    
    await Database.run(`
      UPDATE users SET push_token = ? WHERE id = (
        SELECT id FROM users WHERE role = 'client' LIMIT 1
      )
    `, [testPushToken]);
    
    const userWithToken = await Database.get(`
      SELECT * FROM users WHERE push_token = ?
    `, [testPushToken]);
    
    if (userWithToken) {
      console.log(`   ✅ Added push token to user: ${userWithToken.name}`);
    } else {
      console.log('   ❌ Failed to add push token');
      return;
    }

    // 2. Create a notification for immediate testing
    console.log('\n2. Creating test notification...');
    
    const testClassId = 1; // Use an existing class
    const testMessage = '🧪 PUSH TEST: Your Pilates class starts in 5 minutes! This is a real push notification test.';
    const scheduledTime = new Date().toISOString(); // Send immediately
    
    await Database.run(`
      INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
      VALUES (?, ?, 'reminder', ?, ?)
    `, [testClassId, userWithToken.id, testMessage, scheduledTime]);
    
    console.log('   ✅ Test notification created for immediate sending');

    // 3. Check if Expo push token is valid
    console.log('\n3. Checking push token validity...');
    
    const expo = new Expo();
    const isValidToken = Expo.isExpoPushToken(testPushToken);
    
    console.log(`   📱 Push token: ${testPushToken}`);
    console.log(`   ✅ Is valid Expo token: ${isValidToken}`);
    
    if (!isValidToken) {
      console.log('   ⚠️ This is a fake token for testing - real tokens start with ExponentPushToken[...]');
    }

    // 4. Show pending notifications
    console.log('\n4. Checking pending notifications...');
    
    const pendingNotifications = await Database.all(`
      SELECT 
        n.*,
        c.name as class_name,
        u.name as user_name,
        u.push_token
      FROM notifications n
      LEFT JOIN classes c ON n.class_id = c.id
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.sent = 0 AND u.push_token IS NOT NULL
      ORDER BY n.scheduled_time ASC
      LIMIT 5
    `);
    
    console.log(`   📋 Pending notifications with push tokens: ${pendingNotifications.length}`);
    pendingNotifications.forEach(n => {
      console.log(`   - ${n.type} for ${n.user_name} (${n.push_token ? 'Has token' : 'No token'})`);
    });

    await Database.close();

    console.log('\n✅ Push notification test setup completed!');
    console.log('\n📝 What happens next:');
    console.log('   1. The notification scheduler will process the test notification');
    console.log('   2. If you have a real push token, you\'ll receive a notification');
    console.log('   3. Check the server console for push notification sending logs');
    console.log('\n🔧 To get real notifications:');
    console.log('   1. Run the app on a physical device');
    console.log('   2. Log in and grant notification permissions');
    console.log('   3. The app will register your real push token');
    console.log('   4. Create a class with notifications enabled');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run the test
testPushNotifications(); 