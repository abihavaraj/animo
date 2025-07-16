const Database = require('../config/database');

async function initializeUserNotificationSettings() {
  try {
    await Database.connect();
    console.log('🔧 Initializing user notification settings...');

    // Get all users who don't have notification settings
    const usersWithoutSettings = await Database.all(`
      SELECT u.id, u.name, u.email 
      FROM users u 
      LEFT JOIN notification_settings ns ON u.id = ns.user_id 
      WHERE ns.user_id IS NULL
    `);

    console.log(`📋 Found ${usersWithoutSettings.length} users without notification settings`);

    if (usersWithoutSettings.length === 0) {
      console.log('✅ All users already have notification settings');
      await Database.close();
      return;
    }

    // Create default notification settings for each user
    for (const user of usersWithoutSettings) {
      await Database.run(`
        INSERT INTO notification_settings (
          user_id, 
          enable_notifications, 
          default_reminder_minutes,
          enable_push_notifications,
          enable_email_notifications
        ) VALUES (?, 1, 15, 1, 1)
      `, [user.id]);

      console.log(`  ✅ Created settings for ${user.name} (${user.email})`);
    }

    console.log(`🎉 Successfully initialized notification settings for ${usersWithoutSettings.length} users`);
    await Database.close();

  } catch (error) {
    console.error('❌ Error initializing notification settings:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeUserNotificationSettings();
}

module.exports = initializeUserNotificationSettings; 