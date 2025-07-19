const Database = require('./config/database');
const moment = require('moment');

async function cleanupOldWaitlist() {
  try {
    await Database.connect();
    console.log('🧹 Cleaning up old waitlist entries...\n');

    // Get current date
    const today = moment().format('YYYY-MM-DD');
    console.log(`📅 Today's date: ${today}`);

    // Find waitlist entries for past classes
    const oldWaitlistEntries = await Database.all(`
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
      WHERE c.date < ?
      ORDER BY c.date DESC, c.time DESC
    `, [today]);

    console.log(`🔍 Found ${oldWaitlistEntries.length} waitlist entries for past classes:`);

    if (oldWaitlistEntries.length === 0) {
      console.log('✅ No old waitlist entries to clean up!');
      return;
    }

    // Group by class for better reporting
    const classGroups = {};
    oldWaitlistEntries.forEach(entry => {
      const classKey = `${entry.class_name} (${entry.class_date} ${entry.class_time})`;
      if (!classGroups[classKey]) {
        classGroups[classKey] = [];
      }
      classGroups[classKey].push(entry);
    });

    // Display what will be cleaned up
    Object.entries(classGroups).forEach(([className, entries]) => {
      console.log(`\n📋 Class: ${className}`);
      console.log(`   Users on waitlist:`);
      entries.forEach(entry => {
        console.log(`     - ${entry.user_name} (${entry.user_email}) - Position #${entry.position}`);
      });
    });

    // Confirm cleanup
    console.log(`\n🗑️  Will remove ${oldWaitlistEntries.length} waitlist entries for past classes.`);
    
    // Delete old waitlist entries
    const deleteResult = await Database.run(`
      DELETE FROM waitlist 
      WHERE class_id IN (
        SELECT c.id FROM classes c WHERE c.date < ?
      )
    `, [today]);

    console.log(`\n✅ Successfully removed ${deleteResult.changes} waitlist entries!`);

    // Log the cleanup activity
    if (deleteResult.changes > 0) {
      await Database.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by, created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `, [
        1, // Admin user ID
        'system_cleanup',
        `Cleaned up ${deleteResult.changes} old waitlist entries for classes before ${today}`,
        1 // Admin user ID
      ]);
    }

    // Also check for any waitlist entries for cancelled classes
    console.log('\n🔍 Checking for waitlist entries on cancelled classes...');
    
    const cancelledClassWaitlist = await Database.all(`
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
      WHERE c.status = 'cancelled'
      ORDER BY c.date DESC, c.time DESC
    `);

    if (cancelledClassWaitlist.length > 0) {
      console.log(`\n📋 Found ${cancelledClassWaitlist.length} waitlist entries on cancelled classes:`);
      
      cancelledClassWaitlist.forEach(entry => {
        console.log(`   - ${entry.user_name} on "${entry.class_name}" (${entry.class_date} ${entry.class_time})`);
      });

      // Delete waitlist entries for cancelled classes
      const cancelledDeleteResult = await Database.run(`
        DELETE FROM waitlist 
        WHERE class_id IN (
          SELECT c.id FROM classes c WHERE c.status = 'cancelled'
        )
      `);

      console.log(`✅ Removed ${cancelledDeleteResult.changes} waitlist entries from cancelled classes!`);

      // Log the cleanup activity
      if (cancelledDeleteResult.changes > 0) {
        await Database.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [
          1, // Admin user ID
          'system_cleanup',
          `Cleaned up ${cancelledDeleteResult.changes} waitlist entries from cancelled classes`,
          1 // Admin user ID
        ]);
      }
    } else {
      console.log('✅ No waitlist entries found on cancelled classes.');
    }

    console.log('\n🎉 Waitlist cleanup completed successfully!');

  } catch (error) {
    console.error('❌ Error during waitlist cleanup:', error);
    throw error;
  } finally {
    await Database.close();
  }
}

// Run the cleanup
cleanupOldWaitlist().then(() => {
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
}); 