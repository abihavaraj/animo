const Database = require('../config/database');

async function updateExpiredSubscriptions() {
  try {
    console.log('🔄️ Running expired subscription update script...');
    
    const today = new Date().toISOString().split('T')[0];
    
    const result = await Database.run(`
      UPDATE user_subscriptions
      SET status = 'expired'
      WHERE end_date <= ? AND status = 'active'
    `, [today]);
    
    if (result.changes > 0) {
      console.log(`✅ Found and updated ${result.changes} expired subscriptions.`);
    } else {
      console.log('✅ No expired subscriptions found.');
    }
    
  } catch (error) {
    console.error('❌ Error updating expired subscriptions:', error);
  } finally {
    // Close the database connection if this script is run standalone
    if (require.main === module) {
      Database.close();
    }
  }
}

// Run the script if it's executed directly
if (require.main === module) {
  updateExpiredSubscriptions();
}

module.exports = updateExpiredSubscriptions;
