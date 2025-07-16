const Database = require('./config/database');

async function checkNotificationsTable() {
  try {
    await Database.connect();
    
    // Get table definition
    const tableDef = await Database.get(`
      SELECT sql FROM sqlite_master WHERE name = 'notifications'
    `);
    
    console.log('📋 Notifications table definition:');
    console.log(tableDef.sql);
    
    await Database.close();
  } catch (error) {
    console.error('Error:', error);
    if (Database) {
      await Database.close();
    }
  }
}

checkNotificationsTable(); 