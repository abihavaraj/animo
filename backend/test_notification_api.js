const axios = require('axios');
const Database = require('./config/database');

const API_BASE = 'http://localhost:3000/api';

async function testNotificationAPI() {
  try {
    console.log('🧪 Testing notification API endpoints...\n');

    await Database.connect();

    // 1. Get an existing class
    console.log('1. Finding existing class...');
    const existingClass = await Database.get(`
      SELECT c.*, u.name as instructor_name
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.date >= date('now')
      ORDER BY c.date, c.time
      LIMIT 1
    `);

    if (!existingClass) {
      console.log('   ❌ No future classes found');
      return;
    }

    console.log(`   ✅ Found class: "${existingClass.name}" on ${existingClass.date} at ${existingClass.time}`);

    // 2. Test notification scheduling
    console.log('\n2. Testing notification scheduling...');
    
    const notificationData = {
      classId: existingClass.id,
      type: 'reminder'
    };

    try {
      const scheduleResponse = await axios.post(`${API_BASE}/notifications/schedule`, notificationData);
      
      if (scheduleResponse.data.success) {
        console.log(`   ✅ Notifications scheduled successfully`);
        console.log(`   📊 Users notified: ${scheduleResponse.data.data.usersNotified}`);
        console.log(`   📅 Scheduled time: ${scheduleResponse.data.data.scheduledTime}`);
      } else {
        console.log(`   ⚠️ ${scheduleResponse.data.message}`);
      }
    } catch (error) {
      console.log(`   ❌ Schedule failed: ${error.response?.data?.message || error.message}`);
    }

    // 3. Test notification settings API
    console.log('\n3. Testing notification settings API...');
    
    try {
      const settingsResponse = await axios.get(`${API_BASE}/notifications/settings`);
      
      if (settingsResponse.data.success) {
        console.log(`   ✅ Settings retrieved successfully`);
        console.log(`   ⚙️ Default settings:`, settingsResponse.data.data);
      }
    } catch (error) {
      console.log(`   ❌ Settings failed: ${error.response?.data?.message || error.message}`);
    }

    // 4. Test notification stats
    console.log('\n4. Testing notification statistics...');
    
    try {
      const statsResponse = await axios.get(`${API_BASE}/notifications/stats?classId=${existingClass.id}`);
      
      if (statsResponse.data.success) {
        console.log(`   ✅ Stats retrieved successfully`);
        console.log(`   📊 Stats:`, statsResponse.data.data);
      }
    } catch (error) {
      console.log(`   ❌ Stats failed: ${error.response?.data?.message || error.message}`);
    }

    // 5. Check database for scheduled notifications
    console.log('\n5. Checking database for notifications...');
    
    const notifications = await Database.all(`
      SELECT 
        n.*,
        c.name as class_name,
        u.name as user_name
      FROM notifications n
      LEFT JOIN classes c ON n.class_id = c.id
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.class_id = ?
      ORDER BY n.scheduled_time DESC
      LIMIT 5
    `, [existingClass.id]);

    console.log(`   📋 Found ${notifications.length} notifications for this class:`);
    notifications.forEach(n => {
      const status = n.sent ? '✅ Sent' : '⏳ Pending';
      console.log(`   - ${status} ${n.type} for ${n.user_name} at ${new Date(n.scheduled_time).toLocaleString()}`);
    });

    await Database.close();

    console.log('\n✅ Notification API test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (Database) {
      await Database.close();
    }
  }
}

// Run the test
testNotificationAPI(); 