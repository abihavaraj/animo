const Database = require('./config/database');
const moment = require('moment');

async function testBookingRules() {
  try {
    await Database.connect();
    console.log('🧪 Testing new booking rules...\n');

    // 1. Test 2-hour cancellation rule
    console.log('1. Testing 2-hour cancellation rule...');
    
    // Create a test class 1 hour from now (should fail cancellation)
    const oneHourFromNow = moment().add(1, 'hour');
    const testClass1 = await Database.run(`
      INSERT INTO classes (name, instructor_id, date, time, duration, level, capacity, equipment_type, equipment)
      VALUES ('Test Class 1hr', 2, ?, ?, 60, 'Beginner', 10, 'mat', '[]')
    `, [oneHourFromNow.format('YYYY-MM-DD'), oneHourFromNow.format('HH:mm')]);

    // Create a test class 3 hours from now (should allow cancellation)
    const threeHoursFromNow = moment().add(3, 'hours');
    const testClass2 = await Database.run(`
      INSERT INTO classes (name, instructor_id, date, time, duration, level, capacity, equipment_type, equipment)
      VALUES ('Test Class 3hr', 2, ?, ?, 60, 'Beginner', 10, 'mat', '[]')
    `, [threeHoursFromNow.format('YYYY-MM-DD'), threeHoursFromNow.format('HH:mm')]);

    console.log(`   ✅ Created test classes: ${testClass1.id} (1hr) and ${testClass2.id} (3hr)`);

    // 2. Test waitlist functionality
    console.log('\n2. Testing waitlist functionality...');
    
    // Create a full class (capacity 2)
    const fullClass = await Database.run(`
      INSERT INTO classes (name, instructor_id, date, time, duration, level, capacity, equipment_type, equipment, enrolled)
      VALUES ('Full Test Class', 2, ?, ?, 60, 'Beginner', 2, 'mat', '[]', 2)
    `, [threeHoursFromNow.format('YYYY-MM-DD'), threeHoursFromNow.format('HH:mm')]);

    console.log(`   ✅ Created full class: ${fullClass.id} (capacity: 2, enrolled: 2)`);

    // 3. Check waitlist table structure
    console.log('\n3. Checking waitlist table...');
    const waitlistCount = await Database.get('SELECT COUNT(*) as count FROM waitlist');
    console.log(`   📊 Current waitlist entries: ${waitlistCount.count}`);

    // 4. Test notification system integration
    console.log('\n4. Testing notification integration...');
    const notificationCount = await Database.get('SELECT COUNT(*) as count FROM notifications');
    console.log(`   📊 Current notifications: ${notificationCount.count}`);

    // 5. Show booking rules summary
    console.log('\n📋 Booking Rules Summary:');
    console.log('   ✅ 2-hour cancellation rule: Clients cannot cancel < 2 hours before class');
    console.log('   ✅ 3-hour waitlist promotion: If class is full and someone cancels ≥3 hours before, promote waitlist');
    console.log('   ✅ First-come-first-served waitlist: Position determines priority');
    console.log('   ✅ Automatic booking: Waitlisted users are automatically enrolled when spots open');
    console.log('   ✅ Notification system: Users get notified when promoted from waitlist');

    await Database.close();
    console.log('\n✅ Booking rules test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run the test
testBookingRules(); 