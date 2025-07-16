const Database = require('./config/database');

async function checkWaitlist() {
  try {
    await Database.connect();
    
    // Check if waitlist table exists
    const tables = await Database.all(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='waitlist'
    `);
    
    if (tables.length > 0) {
      console.log('✅ Waitlist table exists');
      
      // Check structure
      const structure = await Database.all(`PRAGMA table_info(waitlist)`);
      console.log('📋 Table structure:');
      structure.forEach(col => {
        console.log(`  - ${col.name}: ${col.type}`);
      });
      
      // Check current data
      const waitlistEntries = await Database.all('SELECT COUNT(*) as count FROM waitlist');
      console.log(`📊 Current waitlist entries: ${waitlistEntries[0].count}`);
      
    } else {
      console.log('❌ Waitlist table does not exist');
    }
    
    await Database.close();
  } catch (error) {
    console.error('Error:', error);
    if (Database) {
      await Database.close();
    }
  }
}

checkWaitlist(); 