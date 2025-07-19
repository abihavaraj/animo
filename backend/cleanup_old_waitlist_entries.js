const Database = require('./config/database');

async function cleanupOldWaitlistEntries() {
  try {
    await Database.connect();
    console.log('🧹 Cleaning up old waitlist entries for past classes...');

    // Only delete waitlist entries for classes that have already happened
    const result = await Database.run(`
      DELETE FROM waitlist 
      WHERE class_id IN (
        SELECT id FROM classes WHERE date < DATE('now')
      )
    `);

    console.log(`✅ Cleaned up ${result.changes} old waitlist entries for past classes`);
    
    // Also clean up waitlist entries for cancelled classes
    const cancelledResult = await Database.run(`
      DELETE FROM waitlist 
      WHERE class_id IN (
        SELECT id FROM classes WHERE status = 'cancelled'
      )
    `);

    if (cancelledResult.changes > 0) {
      console.log(`✅ Cleaned up ${cancelledResult.changes} waitlist entries for cancelled classes`);
    }

    await Database.close();
    console.log('🎉 Cleanup completed - waitlist system remains active for future classes');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanupOldWaitlistEntries(); 