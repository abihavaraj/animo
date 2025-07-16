const Database = require('../config/database');

async function fixSubscriptionConstraints() {
  try {
    await Database.connect();
    console.log('🔧 Fixing subscription database constraints...');

    // Start transaction
    await Database.run('BEGIN TRANSACTION');

    // 1. Fix client_activity_log table constraint to include subscription_extended
    console.log('📝 Fixing client_activity_log constraint...');
    
    // Create temporary table with correct constraint
    await Database.run(`
      CREATE TABLE client_activity_log_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        activity_type TEXT CHECK(activity_type IN (
          'registration', 'login', 'subscription_purchase', 'subscription_renewal', 'subscription_cancellation',
          'subscription_extended', 'subscription_paused', 'subscription_resumed',
          'class_booking', 'class_cancellation', 'class_attendance', 'class_no_show',
          'payment_made', 'payment_failed', 'profile_update', 'note_added', 'document_uploaded',
          'status_change', 'communication_sent', 'waitlist_joined', 'waitlist_promoted'
        )) NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT,
        performed_by INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // Copy existing data
    await Database.run(`
      INSERT INTO client_activity_log_temp 
      SELECT * FROM client_activity_log
    `);

    // Drop old table and rename new one
    await Database.run('DROP TABLE client_activity_log');
    await Database.run('ALTER TABLE client_activity_log_temp RENAME TO client_activity_log');

    // Recreate indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_client_id ON client_activity_log(client_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_type ON client_activity_log(activity_type)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_created_at ON client_activity_log(created_at)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_performed_by ON client_activity_log(performed_by)');

    console.log('✅ client_activity_log constraint fixed');

    // 2. Fix user_subscriptions table constraint to include paused
    console.log('📅 Fixing user_subscriptions constraint...');
    
    // Create temporary table with correct constraint
    await Database.run(`
      CREATE TABLE user_subscriptions_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        remaining_classes INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT CHECK(status IN ('active', 'expired', 'cancelled', 'paused')) DEFAULT 'active',
        auto_renewal INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id) ON DELETE CASCADE
      )
    `);

    // Copy existing data
    await Database.run(`
      INSERT INTO user_subscriptions_temp 
      SELECT 
        id, user_id, plan_id, remaining_classes, start_date, end_date, 
        status, 
        COALESCE(auto_renewal, 1) as auto_renewal,
        created_at, updated_at
      FROM user_subscriptions
    `);

    // Drop old table and rename new one
    await Database.run('DROP TABLE user_subscriptions');
    await Database.run('ALTER TABLE user_subscriptions_temp RENAME TO user_subscriptions');

    // Recreate indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)');

    console.log('✅ user_subscriptions constraint fixed');

    // 3. Update notification types to include subscription notifications
    console.log('📱 Fixing notification types...');
    
    // Check if notifications table exists
    const notificationTable = await Database.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='notifications'
    `);

    if (notificationTable) {
      // Create temporary table with updated constraint
      await Database.run(`
        CREATE TABLE notifications_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          class_id INTEGER,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('reminder', 'cancellation', 'update', 'waitlist_promotion', 'subscription_expiring', 'subscription_changed')),
          message TEXT NOT NULL,
          scheduled_time DATETIME NOT NULL,
          sent BOOLEAN DEFAULT 0,
          sent_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);

      // Copy existing data
      await Database.run(`
        INSERT INTO notifications_temp 
        SELECT * FROM notifications
      `);

      // Drop old table and rename new one
      await Database.run('DROP TABLE notifications');
      await Database.run('ALTER TABLE notifications_temp RENAME TO notifications');

      // Recreate indexes
      await Database.run('CREATE INDEX IF NOT EXISTS idx_notifications_class_id ON notifications (class_id)');
      await Database.run('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)');
      await Database.run('CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_time ON notifications (scheduled_time)');
      await Database.run('CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications (sent)');

      console.log('✅ notifications constraint fixed');
    }

    // Commit transaction
    await Database.run('COMMIT');

    console.log('🎉 All subscription constraints fixed successfully!');
    console.log('');
    console.log('📋 Changes made:');
    console.log('   ✅ client_activity_log: Added subscription_extended, subscription_paused, subscription_resumed');
    console.log('   ✅ user_subscriptions: Added paused status');
    console.log('   ✅ notifications: Added subscription_expiring, subscription_changed types');
    console.log('');
    console.log('🚀 Subscription management should now work without constraint errors!');

    await Database.close();
  } catch (error) {
    console.error('❌ Error fixing subscription constraints:', error);
    await Database.run('ROLLBACK');
    await Database.close();
    process.exit(1);
  }
}

// Run the fix if called directly
if (require.main === module) {
  fixSubscriptionConstraints();
}

module.exports = fixSubscriptionConstraints; 