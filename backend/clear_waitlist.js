const Database = require('./config/database');

async function clearWaitlist() {
  try {
    await Database.connect();
    const result = await Database.run('DELETE FROM waitlist');
    console.log(`Cleared ${result.changes} waitlist entries`);
    await Database.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

clearWaitlist(); 