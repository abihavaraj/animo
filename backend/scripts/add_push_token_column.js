const Database = require('../config/database');

async function addPushTokenColumn() {
  try {
    await Database.connect();

    console.log('📱 Adding push_token column to users table...');

    // Add push_token column to users table
    await Database.run(`
      ALTER TABLE users ADD COLUMN push_token TEXT
    `);

    console.log('✅ Push token column added successfully');
    
    await Database.close();
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Push token column already exists');
    } else {
      console.error('❌ Error adding push token column:', error);
    }
    await Database.close();
  }
}

// Run if called directly
if (require.main === module) {
  addPushTokenColumn();
}

module.exports = addPushTokenColumn; 