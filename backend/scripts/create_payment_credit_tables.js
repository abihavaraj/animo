const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const createPaymentCreditTables = async () => {
  try {
    await db.connect();
    
    // Add credit columns to users table if they don't exist
    console.log('🔄 Adding credit balance columns to users table...');
    try {
      await db.run(`
        ALTER TABLE users ADD COLUMN credit_balance DECIMAL(10,2) DEFAULT 0
      `);
      console.log('✅ Added credit_balance column to users table');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ credit_balance column already exists');
      } else {
        console.error('❌ Error adding credit_balance column:', error.message);
      }
    }

    try {
      await db.run(`
        ALTER TABLE users ADD COLUMN remaining_classes INTEGER DEFAULT 0
      `);
      console.log('✅ Added remaining_classes column to users table');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ remaining_classes column already exists');
      } else {
        console.error('❌ Error adding remaining_classes column:', error.message);
      }
    }

    // Payment Settings table
    console.log('🔄 Creating payment_settings table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS payment_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        payment_method TEXT CHECK(payment_method IN ('cash', 'credit_card', 'both')) NOT NULL DEFAULT 'cash',
        auto_renewal BOOLEAN DEFAULT 0,
        requires_admin_approval BOOLEAN DEFAULT 1,
        payment_notes TEXT,
        credit_limit DECIMAL(10,2),
        preferred_payment_day INTEGER CHECK(preferred_payment_day BETWEEN 1 AND 31),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Payment settings table created successfully!');

    // Manual Credits table
    console.log('🔄 Creating manual_credits table...');
    await db.run(`
      CREATE TABLE IF NOT EXISTS manual_credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        classes_added INTEGER NOT NULL DEFAULT 0,
        reason TEXT CHECK(reason IN ('cash_payment', 'refund', 'promotional', 'adjustment', 'compensation', 'subscription_purchase')) NOT NULL DEFAULT 'cash_payment',
        description TEXT,
        receipt_number TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Manual credits table created successfully!');

    // Create indexes for better performance
    console.log('🔄 Creating indexes...');
    await db.run('CREATE INDEX IF NOT EXISTS idx_payment_settings_user_id ON payment_settings(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_manual_credits_user_id ON manual_credits(user_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_manual_credits_admin_id ON manual_credits(admin_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_manual_credits_created_at ON manual_credits(created_at)');
    console.log('✅ Indexes created successfully!');

    // Update existing users to have zero credit balance if not set
    console.log('🔄 Updating existing users with default credit balance...');
    await db.run(`
      UPDATE users 
      SET credit_balance = 0, remaining_classes = 0 
      WHERE credit_balance IS NULL OR remaining_classes IS NULL
    `);
    console.log('✅ Updated existing users with default credit balance!');

    console.log('🎉 Payment and credit system setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating payment and credit tables:', error);
    throw error;
  } finally {
    await db.close();
  }
};

// Run the migration
if (require.main === module) {
  createPaymentCreditTables()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createPaymentCreditTables; 