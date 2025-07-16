const db = require('../config/database');

async function fixUsersSchema() {
  console.log('🔧 Fixing users table schema to support credit system...');
  
  try {
    await db.connect();
    
    // Check if columns exist first
    console.log('📝 Checking existing table structure...');
    const pragma = await db.all('PRAGMA table_info(users)');
    const existingColumns = pragma.map(col => col.name);
    
    console.log('📋 Existing columns:', existingColumns);
    
    // Add credit_balance column if it doesn't exist
    if (!existingColumns.includes('credit_balance')) {
      console.log('💰 Adding credit_balance column...');
      await db.run('ALTER TABLE users ADD COLUMN credit_balance DECIMAL(10,2) DEFAULT 0');
    } else {
      console.log('✅ credit_balance column already exists');
    }
    
    // Add remaining_classes column if it doesn't exist
    if (!existingColumns.includes('remaining_classes')) {
      console.log('🎓 Adding remaining_classes column...');
      await db.run('ALTER TABLE users ADD COLUMN remaining_classes INTEGER DEFAULT 0');
    } else {
      console.log('✅ remaining_classes column already exists');
    }
    
    // Update existing users' credit_balance based on manual_credits, but set remaining_classes to 0
    console.log('🔄 Updating existing users credit calculations...');
    const users = await db.all('SELECT id FROM users WHERE role = "client"');
    
    for (const user of users) {
      // Calculate total credits from manual_credits
      const creditTotal = await db.get(`
        SELECT COALESCE(SUM(amount), 0) as total_credits
        FROM manual_credits 
        WHERE user_id = ?
      `, [user.id]);
      
      const totalCredits = creditTotal?.total_credits || 0;
      
      // Update user record with credits but 0 classes (credits don't auto-convert)
      await db.run(`
        UPDATE users 
        SET credit_balance = ?, remaining_classes = 0
        WHERE id = ?
      `, [totalCredits, user.id]);
      
      if (totalCredits > 0) {
        console.log(`💳 Updated user ${user.id}: $${totalCredits} credits, 0 classes (credits don't auto-convert)`);
      }
    }
    
    console.log('✅ Users table schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing users schema:', error);
    throw error;
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  fixUsersSchema().catch(console.error);
}

module.exports = fixUsersSchema; 