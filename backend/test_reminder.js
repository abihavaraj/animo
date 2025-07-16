const Database = require('./config/database');

async function testReminder() {
  try {
    console.log('🧪 Testing reminder functionality...');
    
    // First, let's check if we have any clients
    const clients = await Database.all('SELECT id, name FROM users WHERE role = "client" LIMIT 1');
    
    if (clients.length === 0) {
      console.log('❌ No clients found. Please create a client first.');
      return;
    }
    
    const client = clients[0];
    console.log(`✅ Using client: ${client.name} (ID: ${client.id})`);
    
    // Create a test note with a reminder for 1 minute from now
    const reminderTime = new Date(Date.now() + 60000); // 1 minute from now
    const reminderTimeISO = reminderTime.toISOString();
    
    console.log(`⏰ Setting reminder for: ${reminderTimeISO}`);
    
    const result = await Database.run(`
      INSERT INTO client_notes (
        client_id, 
        admin_id, 
        note_type, 
        title, 
        content, 
        priority, 
        is_private, 
        tags, 
        reminder_at, 
        reminder_message, 
        reminder_sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      client.id,
      1, // admin_id (assuming admin ID is 1)
      'general',
      'Test Reminder Note',
      'This is a test note to verify reminder functionality works correctly.',
      'medium',
      0, // not private
      JSON.stringify(['test', 'reminder']),
      reminderTimeISO,
      'Test reminder message - please check this note!'
    ]);
    
    console.log(`✅ Test note created with ID: ${result.lastID}`);
    console.log(`⏰ Reminder set for: ${reminderTimeISO}`);
    console.log('🔔 The reminder should appear in reception notifications in about 1 minute.');
    
    // Check if the note was created
    const note = await Database.get('SELECT * FROM client_notes WHERE id = ?', [result.lastID]);
    console.log('📝 Created note:', note);
    
  } catch (error) {
    console.error('❌ Error testing reminder:', error);
  } finally {
    process.exit(0);
  }
}

testReminder(); 