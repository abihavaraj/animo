const db = require('../config/database');

async function fixBookingsSchema() {
  console.log('🔧 Fixing bookings table schema to support credit-based bookings...');
  
  try {
    await db.connect();
    
    // SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
    console.log('📝 Creating backup of bookings table...');
    
    // Create a backup table with existing data
    await db.run(`
      CREATE TABLE bookings_backup AS 
      SELECT * FROM bookings
    `);
    
    // Drop the original table
    await db.run('DROP TABLE bookings');
    
    // Recreate the table with nullable subscription_id
    console.log('🏗️ Recreating bookings table with nullable subscription_id...');
    await db.run(`
      CREATE TABLE bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        subscription_id INTEGER, -- Now nullable for credit-based bookings
        booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'confirmed',
        checked_in BOOLEAN DEFAULT 0,
        check_in_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES user_subscriptions (id) ON DELETE CASCADE,
        UNIQUE(user_id, class_id)
      )
    `);
    
    // Restore data from backup
    console.log('📦 Restoring existing booking data...');
    await db.run(`
      INSERT INTO bookings (id, user_id, class_id, subscription_id, booking_date, status, checked_in, check_in_time, created_at, updated_at)
      SELECT id, user_id, class_id, subscription_id, booking_date, status, checked_in, check_in_time, created_at, updated_at
      FROM bookings_backup
    `);
    
    // Drop backup table
    await db.run('DROP TABLE bookings_backup');
    
    // Recreate indexes
    console.log('🔍 Recreating indexes...');
    await db.run('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_bookings_class_id ON bookings(class_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_bookings_subscription_id ON bookings(subscription_id)');
    
    console.log('✅ Bookings table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing bookings schema:', error);
    throw error;
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  fixBookingsSchema().catch(console.error);
}

module.exports = fixBookingsSchema; 