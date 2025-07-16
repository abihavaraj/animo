const Database = require('./config/database');

async function addWaitlistTest() {
  try {
    await Database.connect();
    console.log('🔧 Adding comprehensive waitlist test data...\n');
    
    // First, let's see what classes we have
    const classes = await Database.all(`
      SELECT c.*, COUNT(b.id) as current_bookings
      FROM classes c
      LEFT JOIN bookings b ON c.id = b.class_id AND b.status = 'confirmed'
      WHERE c.date >= date('now')
      GROUP BY c.id
      ORDER BY c.date ASC
      LIMIT 5
    `);
    
    console.log('📅 Available future classes:');
    classes.forEach(cls => {
      console.log(`   ${cls.name} - ${cls.current_bookings}/${cls.capacity} enrolled`);
    });
    
    // Make sure we have at least one full class
    let fullClass = classes.find(c => c.current_bookings >= c.capacity);
    
    if (!fullClass) {
      // Make the first class full
      const targetClass = classes[0];
      if (targetClass) {
        await Database.run(`
          UPDATE classes SET enrolled = capacity WHERE id = ?
        `, [targetClass.id]);
        
        console.log(`\n📝 Made "${targetClass.name}" full (${targetClass.capacity}/${targetClass.capacity})`);
        fullClass = { ...targetClass, current_bookings: targetClass.capacity };
      }
    }
    
    if (fullClass) {
      console.log(`\n📋 Adding waitlist entries to "${fullClass.name}"...`);
      
      // Clear existing waitlist for this class
      await Database.run('DELETE FROM waitlist WHERE class_id = ?', [fullClass.id]);
      
      // Get users for waitlist
      const waitlistUsers = await Database.all(`
        SELECT u.* FROM users u
        WHERE u.role = 'client'
        AND u.id NOT IN (
          SELECT b.user_id FROM bookings b 
          WHERE b.class_id = ? AND b.status = 'confirmed'
        )
        LIMIT 4
      `, [fullClass.id]);
      
      console.log(`   Found ${waitlistUsers.length} users for waitlist`);
      
      // Add users to waitlist
      for (let i = 0; i < waitlistUsers.length; i++) {
        const user = waitlistUsers[i];
        await Database.run(`
          INSERT INTO waitlist (user_id, class_id, position)
          VALUES (?, ?, ?)
        `, [user.id, fullClass.id, i + 1]);
        
        console.log(`   ✅ Added ${user.name} to waitlist (position #${i + 1})`);
      }
      
      console.log(`\n🎉 Waitlist setup complete!`);
      console.log(`\n📱 Instructions:`);
      console.log(`   1. Log in as instructor: sarah@pilatesstudio.com / password123`);
      console.log(`   2. Go to Classes tab`);
      console.log(`   3. Find "${fullClass.name}" (should show as full)`);
      console.log(`   4. Click "View Details" or "Manage Class"`);
      console.log(`   5. You should see the waitlist section with ${waitlistUsers.length} people`);
      
    } else {
      console.log('❌ No classes found to add waitlist to');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

addWaitlistTest(); 