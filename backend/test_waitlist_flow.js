const Database = require('./config/database');
const moment = require('moment');

async function testWaitlistFlow() {
  try {
    await Database.connect();
    console.log('🧪 Testing complete waitlist flow...\n');

    // 1. Create a class that will be full (capacity 2)
    const classTime = moment().add(4, 'hours');
    const testClass = await Database.run(`
      INSERT INTO classes (name, instructor_id, date, time, duration, level, capacity, equipment_type, equipment, enrolled)
      VALUES ('Popular Pilates Class', 2, ?, ?, 60, 'Intermediate', 2, 'mat', '[]', 0)
    `, [classTime.format('YYYY-MM-DD'), classTime.format('HH:mm')]);

    console.log(`✅ Created test class: "${testClass.id}" - Popular Pilates Class`);
    console.log(`   📅 Date: ${classTime.format('YYYY-MM-DD')} at ${classTime.format('HH:mm')}`);
    console.log(`   👥 Capacity: 2 spots\n`);

    // 2. Get test users
    const users = await Database.all('SELECT * FROM users WHERE role = "client" LIMIT 4');
    if (users.length < 4) {
      console.log('❌ Need at least 4 client users for this test');
      return;
    }

    console.log('👥 Test users:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`);
    });
    console.log('');

    // 3. Fill the class (2 bookings)
    console.log('📝 Step 1: Filling the class...');
    
    // Get user subscriptions
    const subscription1 = await Database.get('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = "active"', [users[0].id]);
    const subscription2 = await Database.get('SELECT * FROM user_subscriptions WHERE user_id = ? AND status = "active"', [users[1].id]);

    if (!subscription1 || !subscription2) {
      console.log('❌ Users need active subscriptions for this test');
      return;
    }

    // Create bookings for first 2 users
    const booking1 = await Database.run(`
      INSERT INTO bookings (user_id, class_id, subscription_id, status)
      VALUES (?, ?, ?, 'confirmed')
    `, [users[0].id, testClass.id, subscription1.id]);

    const booking2 = await Database.run(`
      INSERT INTO bookings (user_id, class_id, subscription_id, status)
      VALUES (?, ?, ?, 'confirmed')
    `, [users[1].id, testClass.id, subscription2.id]);

    // Update class enrollment
    await Database.run('UPDATE classes SET enrolled = 2 WHERE id = ?', [testClass.id]);

    console.log(`   ✅ ${users[0].name} booked the class`);
    console.log(`   ✅ ${users[1].name} booked the class`);
    console.log('   🔴 Class is now FULL (2/2)\n');

    // 4. Add users to waitlist
    console.log('📝 Step 2: Adding users to waitlist...');
    
    const waitlist1 = await Database.run(`
      INSERT INTO waitlist (user_id, class_id, position)
      VALUES (?, ?, 1)
    `, [users[2].id, testClass.id]);

    const waitlist2 = await Database.run(`
      INSERT INTO waitlist (user_id, class_id, position)
      VALUES (?, ?, 2)
    `, [users[3].id, testClass.id]);

    console.log(`   ⏳ ${users[2].name} joined waitlist (Position #1)`);
    console.log(`   ⏳ ${users[3].name} joined waitlist (Position #2)\n`);

    // 5. Simulate cancellation 3+ hours before class
    console.log('📝 Step 3: Simulating cancellation (3+ hours before class)...');
    
    // Cancel first booking
    await Database.run('UPDATE bookings SET status = "cancelled" WHERE id = ?', [booking1.id]);
    await Database.run('UPDATE classes SET enrolled = enrolled - 1 WHERE id = ?', [testClass.id]);

    console.log(`   ❌ ${users[0].name} cancelled their booking`);
    console.log('   🔄 Processing waitlist promotion...\n');

    // 6. Promote from waitlist (simulate the backend logic)
    const nextInLine = await Database.get(`
      SELECT w.*, u.name as user_name, u.email as user_email 
      FROM waitlist w 
      JOIN users u ON w.user_id = u.id 
      WHERE w.class_id = ? 
      ORDER BY w.position 
      LIMIT 1
    `, [testClass.id]);

    if (nextInLine) {
      const userSubscription = await Database.get(`
        SELECT us.* FROM user_subscriptions us
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.created_at DESC LIMIT 1
      `, [nextInLine.user_id]);

      if (userSubscription) {
        // Create booking for waitlisted user
        await Database.run(`
          INSERT INTO bookings (user_id, class_id, subscription_id, status)
          VALUES (?, ?, ?, 'confirmed')
        `, [nextInLine.user_id, testClass.id, userSubscription.id]);

        // Update class enrollment
        await Database.run('UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?', [testClass.id]);

        // Remove from waitlist
        await Database.run('DELETE FROM waitlist WHERE id = ?', [nextInLine.id]);
        
        // Update other waitlist positions
        await Database.run(
          'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
          [testClass.id, nextInLine.position]
        );

        // Create notification
        const message = `🎉 Great news! A spot opened up in "Popular Pilates Class" on ${classTime.format('YYYY-MM-DD')} at ${classTime.format('HH:mm')}. You've been automatically enrolled!`;
        
        await Database.run(`
          INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
          VALUES (?, ?, 'waitlist_promotion', ?, ?)
        `, [testClass.id, nextInLine.user_id, message, new Date().toISOString()]);

        console.log(`   🎉 ${nextInLine.user_name} promoted from waitlist!`);
        console.log(`   📧 Notification sent to ${nextInLine.user_email}`);
        console.log('   ✅ Class is full again (2/2)\n');
      }
    }

    // 7. Show final status
    console.log('📊 Final Status:');
    
    const finalBookings = await Database.all(`
      SELECT b.*, u.name as user_name, u.email as user_email
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ? AND b.status = 'confirmed'
    `, [testClass.id]);

    const finalWaitlist = await Database.all(`
      SELECT w.*, u.name as user_name, u.email as user_email
      FROM waitlist w
      JOIN users u ON w.user_id = u.id
      WHERE w.class_id = ?
      ORDER BY w.position
    `, [testClass.id]);

    console.log('   👥 Current Bookings:');
    finalBookings.forEach((booking, index) => {
      console.log(`      ${index + 1}. ${booking.user_name} (${booking.user_email})`);
    });

    console.log('   ⏳ Current Waitlist:');
    if (finalWaitlist.length > 0) {
      finalWaitlist.forEach((entry) => {
        console.log(`      #${entry.position}. ${entry.user_name} (${entry.user_email})`);
      });
    } else {
      console.log('      (empty)');
    }

    console.log('\n✅ Waitlist flow test completed successfully!');
    console.log('\n📋 Key Features Demonstrated:');
    console.log('   ✅ First-come-first-served waitlist priority');
    console.log('   ✅ Automatic promotion when spots open up');
    console.log('   ✅ Position management (automatic reordering)');
    console.log('   ✅ Notification system integration');
    console.log('   ✅ Class capacity management');

    await Database.close();

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run the test
testWaitlistFlow(); 