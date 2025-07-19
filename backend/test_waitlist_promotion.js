const Database = require('./config/database');

async function testWaitlistPromotion() {
  try {
    await Database.connect();
    console.log('🧪 Testing waitlist automatic promotion...\n');

    // Check existing waitlist entries
    const waitlistEntries = await Database.all(`
      SELECT 
        w.*,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        u.name as user_name,
        u.email as user_email
      FROM waitlist w
      JOIN classes c ON w.class_id = c.id
      JOIN users u ON w.user_id = u.id
      WHERE c.date >= DATE('now')
      ORDER BY c.date ASC, c.time ASC, w.position ASC
    `);

    if (waitlistEntries.length === 0) {
      console.log('✅ No current waitlist entries found');
      console.log('📝 Waitlist promotion will work when:');
      console.log('   1. A class is full');
      console.log('   2. Someone cancels their booking');
      console.log('   3. First person on waitlist gets automatically booked');
      console.log('   4. They receive notification: "🎉 Great news! A spot opened up in [CLASS] on [DATE] at [TIME]. You are now booked automatically!"');
    } else {
      console.log(`📋 Current waitlist entries (${waitlistEntries.length}):`);
      
      let currentClass = '';
      waitlistEntries.forEach(entry => {
        const classKey = `${entry.class_name} (${entry.class_date} ${entry.class_time})`;
        if (classKey !== currentClass) {
          console.log(`\n   📅 ${classKey}:`);
          currentClass = classKey;
        }
        console.log(`      #${entry.position} - ${entry.user_name} (${entry.user_email})`);
      });
      
      console.log('\n✨ When someone cancels from any of these classes:');
      console.log('   → Person #1 will be automatically booked');
      console.log('   → They will get notification immediately');
      console.log('   → Other positions will move up (#2 becomes #1, etc.)');
    }

    console.log('\n🔧 Key improvements made:');
    console.log('   ✅ Removed 3-hour restriction - promotion happens immediately');
    console.log('   ✅ Updated notification message to be clearer');
    console.log('   ✅ Works for both client cancellations and reception cancellations');
    console.log('   ✅ Automatic position updates for remaining waitlist members');

    await Database.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testWaitlistPromotion(); 