const Database = require('./config/database');
const moment = require('moment');

async function checkWaitlistStatus() {
  try {
    await Database.connect();
    console.log('🔍 Checking waitlist status...\n');

    // Get current date
    const today = moment().format('YYYY-MM-DD');
    console.log(`📅 Today's date: ${today}`);

    // Check all waitlist entries with class and user details
    const allWaitlistEntries = await Database.all(`
      SELECT 
        w.*,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        c.status as class_status,
        c.capacity,
        c.enrolled,
        u.name as user_name,
        u.email as user_email,
        CASE 
          WHEN c.date < ? THEN 'PAST'
          WHEN c.date = ? THEN 'TODAY'
          ELSE 'FUTURE'
        END as date_status
      FROM waitlist w
      JOIN classes c ON w.class_id = c.id
      JOIN users u ON w.user_id = u.id
      ORDER BY c.date ASC, c.time ASC, w.position ASC
    `, [today, today]);

    console.log(`📋 Total waitlist entries: ${allWaitlistEntries.length}`);

    if (allWaitlistEntries.length === 0) {
      console.log('✅ No waitlist entries found.');
      return;
    }

    // Group by date status
    const pastEntries = allWaitlistEntries.filter(e => e.date_status === 'PAST');
    const todayEntries = allWaitlistEntries.filter(e => e.date_status === 'TODAY');
    const futureEntries = allWaitlistEntries.filter(e => e.date_status === 'FUTURE');

    console.log(`\n📊 Waitlist Summary:`);
    console.log(`   Past classes: ${pastEntries.length} entries`);
    console.log(`   Today's classes: ${todayEntries.length} entries`);
    console.log(`   Future classes: ${futureEntries.length} entries`);

    // Show past entries (these should be cleaned up)
    if (pastEntries.length > 0) {
      console.log(`\n🚨 PAST CLASSES (should be cleaned up):`);
      const pastByClass = {};
      pastEntries.forEach(entry => {
        const classKey = `${entry.class_name} (${entry.class_date} ${entry.class_time})`;
        if (!pastByClass[classKey]) {
          pastByClass[classKey] = [];
        }
        pastByClass[classKey].push(entry);
      });

      Object.entries(pastByClass).forEach(([className, entries]) => {
        console.log(`\n   📋 ${className}`);
        console.log(`      Status: ${entries[0].class_status}, Capacity: ${entries[0].capacity}, Enrolled: ${entries[0].enrolled}`);
        entries.forEach(entry => {
          console.log(`      - ${entry.user_name} (${entry.user_email}) - Position #${entry.position}`);
        });
      });
    }

    // Show today's entries
    if (todayEntries.length > 0) {
      console.log(`\n📅 TODAY'S CLASSES:`);
      const todayByClass = {};
      todayEntries.forEach(entry => {
        const classKey = `${entry.class_name} (${entry.class_date} ${entry.class_time})`;
        if (!todayByClass[classKey]) {
          todayByClass[classKey] = [];
        }
        todayByClass[classKey].push(entry);
      });

      Object.entries(todayByClass).forEach(([className, entries]) => {
        console.log(`\n   📋 ${className}`);
        console.log(`      Status: ${entries[0].class_status}, Capacity: ${entries[0].capacity}, Enrolled: ${entries[0].enrolled}`);
        entries.forEach(entry => {
          console.log(`      - ${entry.user_name} (${entry.user_email}) - Position #${entry.position}`);
        });
      });
    }

    // Show future entries
    if (futureEntries.length > 0) {
      console.log(`\n🔮 FUTURE CLASSES:`);
      const futureByClass = {};
      futureEntries.forEach(entry => {
        const classKey = `${entry.class_name} (${entry.class_date} ${entry.class_time})`;
        if (!futureByClass[classKey]) {
          futureByClass[classKey] = [];
        }
        futureByClass[classKey].push(entry);
      });

      Object.entries(futureByClass).forEach(([className, entries]) => {
        console.log(`\n   📋 ${className}`);
        console.log(`      Status: ${entries[0].class_status}, Capacity: ${entries[0].capacity}, Enrolled: ${entries[0].enrolled}`);
        entries.forEach(entry => {
          console.log(`      - ${entry.user_name} (${entry.user_email}) - Position #${entry.position}`);
        });
      });
    }

    // Check for cancelled classes with waitlist entries
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
      console.log(`\n❌ CANCELLED CLASSES WITH WAITLIST ENTRIES:`);
      const cancelledByClass = {};
      cancelledClassWaitlist.forEach(entry => {
        const classKey = `${entry.class_name} (${entry.class_date} ${entry.class_time})`;
        if (!cancelledByClass[classKey]) {
          cancelledByClass[classKey] = [];
        }
        cancelledByClass[classKey].push(entry);
      });

      Object.entries(cancelledByClass).forEach(([className, entries]) => {
        console.log(`\n   📋 ${className}`);
        entries.forEach(entry => {
          console.log(`      - ${entry.user_name} (${entry.user_email}) - Position #${entry.position}`);
        });
      });
    }

    // Check for specific user (Klara Musabelliu)
    console.log(`\n🔍 Checking for specific user issues...`);
    const klaraEntries = allWaitlistEntries.filter(entry => 
      entry.user_name.toLowerCase().includes('klara') || 
      entry.user_email.toLowerCase().includes('klara')
    );

    if (klaraEntries.length > 0) {
      console.log(`\n👤 Found ${klaraEntries.length} waitlist entries for Klara:`);
      klaraEntries.forEach(entry => {
        console.log(`   - ${entry.class_name} on ${entry.class_date} at ${entry.class_time} (${entry.date_status}) - Position #${entry.position}`);
      });
    } else {
      console.log(`\n👤 No waitlist entries found for Klara.`);
    }

    // Check for any users with multiple waitlist entries
    const userWaitlistCounts = {};
    allWaitlistEntries.forEach(entry => {
      const userKey = `${entry.user_name} (${entry.user_email})`;
      userWaitlistCounts[userKey] = (userWaitlistCounts[userKey] || 0) + 1;
    });

    const usersWithMultipleEntries = Object.entries(userWaitlistCounts)
      .filter(([user, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    if (usersWithMultipleEntries.length > 0) {
      console.log(`\n⚠️  USERS WITH MULTIPLE WAITLIST ENTRIES:`);
      usersWithMultipleEntries.forEach(([user, count]) => {
        console.log(`   - ${user}: ${count} entries`);
      });
    }

    console.log(`\n✅ Waitlist status check completed!`);

  } catch (error) {
    console.error('❌ Error checking waitlist status:', error);
    throw error;
  } finally {
    await Database.close();
  }
}

// Run the check
checkWaitlistStatus().then(() => {
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
}); 