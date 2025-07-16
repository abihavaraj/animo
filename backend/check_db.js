const Database = require('./config/database');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database structure...');
    
    // Check if client_notes table exists
    const tables = await Database.all('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('📋 Available tables:', tables.map(t => t.name));
    
    // Check if client_notes table exists
    const clientNotesExists = tables.some(t => t.name === 'client_notes');
    console.log('📝 client_notes table exists:', clientNotesExists);
    
    if (clientNotesExists) {
      // Get table structure
      const structure = await Database.all('PRAGMA table_info(client_notes)');
      console.log('📋 client_notes table structure:', structure);
      
      // Check if there are any existing notes
      const notes = await Database.all('SELECT COUNT(*) as count FROM client_notes');
      console.log('📝 Number of existing notes:', notes[0].count);
      
      // Check for any notes with reminders
      const reminders = await Database.all(`
        SELECT id, title, reminder_at, reminder_sent 
        FROM client_notes 
        WHERE reminder_at IS NOT NULL
      `);
      console.log('🔔 Notes with reminders:', reminders);
    } else {
      console.log('❌ client_notes table does not exist!');
      console.log('💡 You need to run the database migration script to create the table.');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase(); 