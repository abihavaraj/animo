const Database = require('../config/database');

async function updateNotificationTypes() {
  try {
    await Database.connect();
    console.log('🔄 Updating notification types...');

    // Since SQLite doesn't support ALTER TABLE to modify CHECK constraints,
    // we need to recreate the table with the new constraint
    
    // 1. Create a backup of existing data
    console.log('📋 Backing up existing notifications...');
    const existingNotifications = await Database.all('SELECT * FROM notifications');
    console.log(`   Found ${existingNotifications.length} existing notifications`);

    // 2. Drop the old table
    console.log('🗑️ Dropping old notifications table...');
    await Database.run('DROP TABLE notifications');

    // 3. Create new table with updated constraint
    console.log('🆕 Creating new notifications table...');
    await Database.run(`
      CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('reminder', 'cancellation', 'update', 'waitlist_promotion')),
        message TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        sent BOOLEAN DEFAULT 0,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 4. Restore existing data
    if (existingNotifications.length > 0) {
      console.log('📥 Restoring existing notifications...');
      for (const notification of existingNotifications) {
        await Database.run(`
          INSERT INTO notifications (id, class_id, user_id, type, message, scheduled_time, sent, sent_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          notification.id,
          notification.class_id,
          notification.user_id,
          notification.type,
          notification.message,
          notification.scheduled_time,
          notification.sent,
          notification.sent_at,
          notification.created_at
        ]);
      }
      console.log(`   ✅ Restored ${existingNotifications.length} notifications`);
    }

    console.log('✅ Notification types updated successfully!');
    console.log('📋 Supported notification types:');
    console.log('   - reminder: Class reminder notifications');
    console.log('   - cancellation: Class cancellation notifications');
    console.log('   - update: Class update notifications');
    console.log('   - waitlist_promotion: Waitlist promotion notifications');

    await Database.close();
  } catch (error) {
    console.error('❌ Error updating notification types:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  updateNotificationTypes();
}

module.exports = updateNotificationTypes; 