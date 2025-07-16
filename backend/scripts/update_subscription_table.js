const Database = require('../config/database');

async function updateSubscriptionTable() {
  try {
    await Database.connect();
    console.log('🔄 Updating subscription_plans table...');

    // Since SQLite doesn't support ALTER TABLE to modify CHECK constraints,
    // we need to recreate the table with the new constraint
    
    // 1. Create a backup of existing data
    console.log('📋 Backing up existing subscription plans...');
    const existingPlans = await Database.all('SELECT * FROM subscription_plans');
    console.log(`   Found ${existingPlans.length} existing plans`);

    // 2. Drop the old table
    console.log('🗑️ Dropping old subscription_plans table...');
    await Database.run('DROP TABLE subscription_plans');

    // 3. Create new table with updated constraint
    console.log('🆕 Creating new subscription_plans table...');
    await Database.run(`
      CREATE TABLE subscription_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        monthly_classes INTEGER NOT NULL,
        monthly_price DECIMAL(10,2) NOT NULL,
        equipment_access TEXT CHECK(equipment_access IN ('mat', 'reformer', 'both')) NOT NULL,
        description TEXT,
        category TEXT CHECK(category IN ('trial', 'basic', 'standard', 'premium', 'unlimited', 'personal', 'special')) NOT NULL,
        features TEXT, -- JSON array of features
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Restore existing data
    if (existingPlans.length > 0) {
      console.log('📥 Restoring existing subscription plans...');
      for (const plan of existingPlans) {
        await Database.run(`
          INSERT INTO subscription_plans (id, name, monthly_classes, monthly_price, equipment_access, description, category, features, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          plan.id,
          plan.name,
          plan.monthly_classes,
          plan.monthly_price,
          plan.equipment_access,
          plan.description,
          plan.category,
          plan.features,
          plan.is_active,
          plan.created_at,
          plan.updated_at
        ]);
      }
      console.log(`   ✅ Restored ${existingPlans.length} plans`);
    }

    console.log('✅ Subscription table updated successfully!');
    console.log('📋 Supported categories:');
    console.log('   - trial: Introduction packages for new members');
    console.log('   - basic: Entry-level packages');
    console.log('   - standard: Regular packages');
    console.log('   - premium: Advanced packages');
    console.log('   - unlimited: Unlimited access packages');
    console.log('   - personal: One-on-one training packages');
    console.log('   - special: Family/duo/group packages');

    await Database.close();
  } catch (error) {
    console.error('❌ Error updating subscription table:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  updateSubscriptionTable();
}

module.exports = updateSubscriptionTable; 