const Database = require('./config/database');

async function testBookingNotification() {
  try {
    await Database.connect();
    console.log('🧪 Testing booking notification system...\n');

    // Get a sample user
    const user = await Database.get(`
      SELECT * FROM users WHERE role = 'client' LIMIT 1
    `);
    
    if (!user) {
      console.log('❌ No client users found');
      return;
    }
    
    console.log(`👤 Using user: ${user.name} (${user.email})`);

    // Get an active subscription for the user
    const subscription = await Database.get(`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ? AND status = 'active' 
      ORDER BY created_at DESC LIMIT 1
    `, [user.id]);
    
    if (!subscription) {
      console.log(`❌ No active subscription found for ${user.name}`);
      return;
    }
    
    console.log(`💳 Active subscription found: ${subscription.remaining_classes} classes remaining`);

    // Get the notification test class that user hasn't booked
    const futureClass = await Database.get(`
      SELECT c.*, u.name as instructor_name
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.name = 'Notification Test Class'
      AND c.id NOT IN (
        SELECT class_id FROM bookings WHERE user_id = ? AND status = 'confirmed'
      )
      LIMIT 1
    `, [user.id]);
    
    if (!futureClass) {
      console.log(`❌ No available future classes found for ${user.name}`);
      return;
    }
    
    console.log(`📅 Target class: "${futureClass.name}" on ${futureClass.date} at ${futureClass.time}`);

    // Simulate the booking process (same logic as the API)
    console.log('\n🔄 Simulating booking process...');
    
    await Database.run('BEGIN TRANSACTION');
    
    try {
      // Create booking
      const bookingResult = await Database.run(`
        INSERT INTO bookings (user_id, class_id, subscription_id)
        VALUES (?, ?, ?)
      `, [user.id, futureClass.id, subscription.id]);
      
      console.log(`✅ Booking created with ID: ${bookingResult.id}`);

      // Get user notification settings first (this is the priority)
      const userSettings = await Database.get(`
        SELECT * FROM notification_settings WHERE user_id = ?
      `, [user.id]);
      
      const userEnableNotifications = userSettings?.enable_notifications !== 0;
      const userReminderMinutes = userSettings?.default_reminder_minutes || 15;
      
      console.log(`👤 User notification settings: ${userEnableNotifications ? 'enabled' : 'disabled'}, ${userReminderMinutes} minutes before`);
      
      if (userEnableNotifications) {
        // Get class notification settings as fallback
        const classSettings = await Database.get(`
          SELECT * FROM class_notification_settings WHERE class_id = ?
        `, [futureClass.id]);
        
        const classEnableNotifications = classSettings?.enable_notifications !== 0;
        
        console.log(`⚙️ Class notification settings: ${classEnableNotifications ? 'enabled' : 'disabled'}`);
        
        // Only schedule if both user and class have notifications enabled
        if (classEnableNotifications) {
          const classDateTime = new Date(`${futureClass.date}T${futureClass.time}`);
          const notificationTime = new Date(classDateTime.getTime() - (userReminderMinutes * 60 * 1000));
          
          // Only schedule if notification time is in the future
          if (notificationTime > new Date()) {
            const message = `🧘‍♀️ Reminder: Your ${futureClass.name} class starts in ${userReminderMinutes} minutes!`;
            
            await Database.run(`
              INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
              VALUES (?, ?, 'reminder', ?, ?)
            `, [futureClass.id, user.id, message, notificationTime.toISOString()]);
            
            console.log(`📱 Notification scheduled for: ${notificationTime.toLocaleString()}`);
            console.log(`📝 Message: ${message}`);
            console.log(`✅ Using user's personal reminder time: ${userReminderMinutes} minutes`);
          } else {
            console.log(`⚠️ Class is too soon to schedule notification (${userReminderMinutes} minutes before)`);
          }
        } else {
          console.log(`🔕 Class has notifications disabled`);
        }
      } else {
        console.log(`🔕 User has disabled notifications`);
      }
      
      // Update subscription and class enrollment
      await Database.run(
        'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
        [subscription.id]
      );

      await Database.run(
        'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
        [futureClass.id]
      );

      await Database.run('COMMIT');
      
      console.log('\n✅ Booking simulation completed successfully!');
      
      // Check pending notifications
      const pendingNotifications = await Database.all(`
        SELECT 
          n.*,
          c.name as class_name
        FROM notifications n
        LEFT JOIN classes c ON n.class_id = c.id
        WHERE n.user_id = ? AND n.sent = 0
        ORDER BY n.scheduled_time ASC
      `, [user.id]);
      
      console.log(`\n📋 Pending notifications for ${user.name}: ${pendingNotifications.length}`);
      pendingNotifications.forEach(n => {
        console.log(`  - ${n.type} for "${n.class_name}" at ${new Date(n.scheduled_time).toLocaleString()}`);
      });
      
    } catch (error) {
      await Database.run('ROLLBACK');
      throw error;
    }

    await Database.close();
    console.log('\n🎉 Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await Database.close();
  }
}

// Run the test
testBookingNotification(); 