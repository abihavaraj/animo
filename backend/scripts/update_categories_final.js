const Database = require('../config/database');

async function updateCategoriesFinal() {
  try {
    await Database.connect();
    console.log('🔄 Updating subscription plan categories to final set...');

    // 1. Create a backup of existing data
    console.log('📋 Backing up existing subscription plans...');
    const existingPlans = await Database.all('SELECT * FROM subscription_plans');
    console.log(`   Found ${existingPlans.length} existing plans`);

    // 2. Drop the old table
    console.log('🗑️ Dropping old subscription_plans table...');
    await Database.run('DROP TABLE subscription_plans');

    // 3. Create new table with only the 4 required categories
    console.log('🆕 Creating new subscription_plans table with final categories...');
    await Database.run(`
      CREATE TABLE subscription_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        monthly_classes INTEGER NOT NULL,
        monthly_price DECIMAL(10,2) NOT NULL,
        duration_months INTEGER NOT NULL DEFAULT 1,
        equipment_access TEXT CHECK(equipment_access IN ('mat', 'reformer', 'both')) NOT NULL,
        description TEXT,
        category TEXT CHECK(category IN ('group', 'personal', 'personal_duo', 'personal_trio')) NOT NULL,
        features TEXT, -- JSON array of features
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Restore existing data, mapping old categories to new ones
    if (existingPlans.length > 0) {
      console.log('📥 Restoring and mapping existing subscription plans...');
      
      const categoryMapping = {
        'trial': 'group',
        'basic': 'group', 
        'standard': 'group',
        'premium': 'personal',
        'unlimited': 'group',
        'personal': 'personal',
        'special': 'group',
        'group': 'group',
        'personal_duo': 'personal_duo',
        'personal_trio': 'personal_trio'
      };

      for (const plan of existingPlans) {
        const newCategory = categoryMapping[plan.category] || 'group';
        
        try {
          await Database.run(`
            INSERT INTO subscription_plans (id, name, monthly_classes, monthly_price, duration_months, equipment_access, description, category, features, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            plan.id,
            plan.name,
            plan.monthly_classes,
            plan.monthly_price,
            plan.duration_months || 1,
            plan.equipment_access,
            plan.description,
            newCategory,
            plan.features,
            plan.is_active,
            plan.created_at,
            plan.updated_at
          ]);
          
          console.log(`   ✅ Restored: ${plan.name} (${plan.category} → ${newCategory})`);
        } catch (error) {
          console.log(`   ❌ Failed to restore plan: ${plan.name} - ${error.message}`);
        }
      }
    }

    console.log('✅ Categories updated successfully!');
    console.log('📋 Final supported categories:');
    console.log('   - group: Group classes packages');
    console.log('   - personal: One-on-one training packages');
    console.log('   - personal_duo: Personal training for 2 people');
    console.log('   - personal_trio: Personal training for 3 people');

    await Database.close();
  } catch (error) {
    console.error('❌ Error updating categories:', error);
    if (Database) {
      await Database.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  updateCategoriesFinal();
}

module.exports = updateCategoriesFinal; 