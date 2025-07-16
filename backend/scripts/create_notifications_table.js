const Database = require('../config/database');

async function createNotificationTables() {
  try {
    await Database.connect();

    // Create notifications table
    await Database.run(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('reminder', 'cancellation', 'update')),
        message TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        sent BOOLEAN DEFAULT 0,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create notification settings table
    await Database.run(`
      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        enable_notifications BOOLEAN DEFAULT 1,
        default_reminder_minutes INTEGER DEFAULT 5,
        enable_push_notifications BOOLEAN DEFAULT 1,
        enable_email_notifications BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create class notification settings table (per class settings)
    await Database.run(`
      CREATE TABLE IF NOT EXISTS class_notification_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER UNIQUE NOT NULL,
        enable_notifications BOOLEAN DEFAULT 1,
        notification_minutes INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await Database.run(`CREATE INDEX IF NOT EXISTS idx_notifications_class_id ON notifications (class_id)`);
    await Database.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`);
    await Database.run(`CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_time ON notifications (scheduled_time)`);
    await Database.run(`CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications (sent)`);

    console.log('✅ Notification tables created successfully');
    
    await Database.close();
  } catch (error) {
    console.error('❌ Error creating notification tables:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createNotificationTables();
}

module.exports = createNotificationTables; 