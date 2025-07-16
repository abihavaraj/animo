const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const createTables = async () => {
  try {
    await db.connect();
    
    // Users table
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT CHECK(role IN ('client', 'instructor', 'admin', 'reception')) NOT NULL DEFAULT 'client',
        emergency_contact TEXT,
        medical_conditions TEXT,
        join_date DATE DEFAULT CURRENT_DATE,
        status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
        credit_balance DECIMAL(10,2) DEFAULT 0,
        remaining_classes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subscription Plans table
    await db.run(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        monthly_classes INTEGER NOT NULL,
        monthly_price DECIMAL(10,2) NOT NULL,
        equipment_access TEXT CHECK(equipment_access IN ('mat', 'reformer', 'both')) NOT NULL,
        description TEXT,
        category TEXT CHECK(category IN ('basic', 'standard', 'premium', 'unlimited')) NOT NULL,
        features TEXT, -- JSON array of features
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User Subscriptions table
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        remaining_classes INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status TEXT CHECK(status IN ('active', 'expired', 'cancelled', 'paused')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id) ON DELETE CASCADE
      )
    `);

    // Classes table
    await db.run(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        instructor_id INTEGER NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        duration INTEGER NOT NULL, -- in minutes
        level TEXT CHECK(level IN ('Beginner', 'Intermediate', 'Advanced')) NOT NULL,
        capacity INTEGER NOT NULL,
        enrolled INTEGER DEFAULT 0,
        equipment TEXT, -- JSON array of equipment
        equipment_type TEXT CHECK(equipment_type IN ('mat', 'reformer', 'both')) NOT NULL,
        description TEXT,
        status TEXT CHECK(status IN ('active', 'cancelled', 'full')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Bookings table
    await db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
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

    // Waitlist table
    await db.run(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE,
        UNIQUE(user_id, class_id)
      )
    `);

    // Payments table (for tracking subscription payments)
    await db.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subscription_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method TEXT DEFAULT 'card',
        status TEXT CHECK(status IN ('completed', 'pending', 'failed')) DEFAULT 'completed',
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (subscription_id) REFERENCES user_subscriptions (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_classes_instructor ON classes(instructor_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_bookings_class_id ON bookings(class_id)');

    console.log('✅ Database tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating database tables:', error);
  } finally {
    await db.close();
  }
};

// Run the initialization
if (require.main === module) {
  createTables();
}

module.exports = createTables; 