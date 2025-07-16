const Database = require('./config/database');
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteNotificationFlow() {
  try {
    console.log('🧪 Testing complete notification flow...\n');

    // 0. Login as admin to get auth token
    console.log('0. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'adminpass'
    });

    if (!loginResponse.data.success || !loginResponse.data.token) {
      throw new Error('Failed to login: ' + (loginResponse.data.message || 'No token received'));
    }

    const authToken = loginResponse.data.token;
    console.log('   ✅ Logged in successfully');

    // 1. Create a class with notifications enabled
    console.log('1. Creating a class with notifications enabled...');
    
    const classData = {
      name: 'Test Notification Class',
      instructorId: 2, // Sarah Wilson
      date: '2025-05-30',
      time: '19:10', // 10 minutes from now
      duration: 60,
      level: 'Beginner',
      capacity: 10,
      equipmentType: 'mat',
      equipment: ['Mat', 'Blocks'],
      description: 'Test class for notification system',
      enableNotifications: true,
      notificationMinutes: 5
    };

    const createResponse = await axios.post(`${API_BASE}/classes`, classData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (createResponse.data.success) {
      const newClass = createResponse.data.data;
      console.log(`   ✅ Class created: "${newClass.name}" (ID: ${newClass.id})`);

      // 2. Schedule notifications for the class
      console.log('\n2. Scheduling notifications...');
      
      const notificationData = {
        classId: newClass.id,
        type: 'reminder'
      };

      const scheduleResponse = await axios.post(`${API_BASE}/notifications/schedule`, notificationData, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (scheduleResponse.data.success) {
        console.log(`   ✅ Notifications scheduled for ${scheduleResponse.data.data.usersNotified} users`);
        console.log(`   📅 Scheduled time: ${scheduleResponse.data.data.scheduledTime}`);
      } else {
        console.log(`   ⚠️ No users to notify: ${scheduleResponse.data.message}`);
      }

      // 3. Check pending notifications
      console.log('\n3. Checking pending notifications...');
      
      await Database.connect();
      const pendingNotifications = await Database.all(`
        SELECT 
          n.*,
          c.name as class_name,
          u.name as user_name
        FROM notifications n
        LEFT JOIN classes c ON n.class_id = c.id
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.sent = 0 AND n.class_id = ?
        ORDER BY n.scheduled_time ASC
      `, [newClass.id]);
      
      console.log(`   📋 Pending notifications for this class: ${pendingNotifications.length}`);
      pendingNotifications.forEach(n => {
        console.log(`   - ${n.type} for ${n.user_name} at ${new Date(n.scheduled_time).toLocaleString()}`);
      });

      // 4. Check class notification settings
      const classSettings = await Database.get(`
        SELECT * FROM class_notification_settings WHERE class_id = ?
      `, [newClass.id]);
      
      if (classSettings) {
        console.log(`\n4. Class notification settings:`);
        console.log(`   ✅ Notifications enabled: ${classSettings.enable_notifications ? 'Yes' : 'No'}`);
        console.log(`   ⏰ Reminder time: ${classSettings.notification_minutes} minutes before`);
      } else {
        console.log(`\n4. ❌ No notification settings found for class`);
      }

      await Database.close();

      console.log('\n✅ Complete notification flow test completed!');
      console.log('\n📝 Summary:');
      console.log(`   - Class created with ID: ${newClass.id}`);
      console.log(`   - Notification settings saved`);
      console.log(`   - Notifications scheduled (if users are enrolled)`);
      console.log(`   - Scheduler will process notifications when the time comes`);
      
    } else {
      console.log(`   ❌ Failed to create class: ${createResponse.data.message}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (Database) {
      await Database.close();
    }
  }
}

// Run the test
testCompleteNotificationFlow(); 