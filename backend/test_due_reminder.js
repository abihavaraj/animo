const Database = require('./config/database');

async function testDueReminder() {
  try {
    console.log('🧪 Testing due reminder functionality...');
    
    // First, let's check if we have any clients
    const clients = await Database.all('SELECT id, name FROM users WHERE role = "client" LIMIT 1');
    
    if (clients.length === 0) {
      console.log('❌ No clients found. Please create a client first.');
      return;
    }
    
    const client = clients[0];
    console.log(`✅ Using client: ${client.name} (ID: ${client.id})`);
    
    // Create a test note with a reminder that's already due (1 hour ago)
    const reminderTime = new Date(Date.now() - 3600000); // 1 hour ago
    const reminderTimeISO = reminderTime.toISOString();
    
    console.log(`⏰ Setting reminder for: ${reminderTimeISO} (already due)`);
    
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
      'Due Reminder Test',
      'This is a test note with a reminder that is already due.',
      'high',
      0, // not private
      JSON.stringify(['test', 'due', 'reminder']),
      reminderTimeISO,
      'This reminder should appear immediately in reception notifications!'
    ]);
    
    console.log(`✅ Test note created with ID: ${result.lastID}`);
    console.log(`⏰ Reminder set for: ${reminderTimeISO} (already due)`);
    console.log('🔔 This reminder should appear in reception notifications immediately.');
    
    // Check if the note was created
    const note = await Database.get('SELECT * FROM client_notes WHERE id = ?', [result.lastID]);
    console.log('📝 Created note:', note);
    
    // Test the recent notifications endpoint
    console.log('🔔 Testing recent notifications endpoint...');
    const notifications = await Database.all(`
      SELECT 
        cn.id,
        cn.title,
        cn.reminder_at,
        cn.reminder_message,
        u.name as client_name,
        u.id as client_id
      FROM client_notes cn
      JOIN users u ON cn.client_id = u.id
      WHERE cn.reminder_at IS NOT NULL
        AND cn.reminder_sent = 0
        AND cn.reminder_at <= datetime('now')
      ORDER BY cn.reminder_at ASC
      LIMIT 5
    `);
    
    console.log(`🔔 Found ${notifications.length} due reminders:`);
    notifications.forEach((reminder, index) => {
      console.log(`  ${index + 1}. ${reminder.title} - ${reminder.client_name} (${reminder.reminder_at})`);
    });
    
  } catch (error) {
    console.error('❌ Error testing due reminder:', error);
  } finally {
    process.exit(0);
  }
}

testDueReminder(); 