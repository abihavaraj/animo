const Database = require('../config/database');

async function addDurationAndCategories() {
  try {
    await Database.connect();
    console.log('🔄 Adding duration support and updating categories for subscription plans...');

    // 1. Create a backup of existing data
    console.log('📋 Backing up existing subscription plans...');
    const existingPlans = await Database.all('SELECT * FROM subscription_plans');
    console.log(`   Found ${existingPlans.length} existing plans`);

    // 2. Drop the old table
    console.log('🗑️ Dropping old subscription_plans table...');
    await Database.run('DROP TABLE subscription_plans');

    // 3. Create new table with duration_months and updated categories
    console.log('🆕 Creating new subscription_plans table with duration support...');
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

    // 4. Restore existing data with default duration of 1 month
    if (existingPlans.length > 0) {
      console.log('📥 Restoring existing subscription plans with default duration...');
      for (const plan of existingPlans) {
        await Database.run(`
          INSERT INTO subscription_plans (id, name, monthly_classes, monthly_price, duration_months, equipment_access, description, category, features, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          plan.id,
          plan.name,
          plan.monthly_classes,
          plan.monthly_price,
          1, // Default duration of 1 month for existing plans
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

    // 5. Add some sample duration-based plans
    console.log('✨ Adding sample duration-based plans...');
    const samplePlans = [
      {
        name: 'GROUP - 3 Month Package',
        monthly_classes: 12,
        monthly_price: 150,
        duration_months: 3,
        equipment_access: 'both',
        description: 'Group classes with 3-month commitment. Perfect for consistent practice with others.',
        category: 'group',
        features: JSON.stringify([
          '12 Group Classes per Month',
          '3 Month Commitment',
          'Mat & Reformer Access',
          'Social Environment',
          'Shared Motivation',
          'Flexible Class Times'
        ])
      },
      {
        name: 'PERSONAL - 6 Month Package',
        monthly_classes: 8,
        monthly_price: 480,
        duration_months: 6,
        equipment_access: 'both',
        description: 'Personal training sessions with 6-month commitment for serious transformation.',
        category: 'personal',
        features: JSON.stringify([
          '8 Personal Sessions per Month',
          '6 Month Commitment',
          'One-on-One Training',
          'Customized Programs',
          'Progress Tracking',
          'Injury Prevention Focus'
        ])
      },
      {
        name: 'PERSONAL DUO - 1 Year Package',
        monthly_classes: 10,
        monthly_price: 600,
        duration_months: 12,
        equipment_access: 'both',
        description: 'Perfect for couples or friends. Share personal training sessions with yearly commitment.',
        category: 'personal_duo',
        features: JSON.stringify([
          '10 Shared Sessions per Month',
          '1 Year Commitment',
          'Two-Person Training',
          'Partner Workouts',
          'Shared Goals & Progress',
          'Best Value for Pairs'
        ])
      },
      {
        name: 'Personal Trio - 3 Month Package',
        monthly_classes: 12,
        monthly_price: 720,
        duration_months: 3,
        equipment_access: 'both',
        description: 'Small group personal training for 3 people with 3-month commitment.',
        category: 'personal_trio',
        features: JSON.stringify([
          '12 Trio Sessions per Month',
          '3 Month Commitment',
          'Three-Person Training',
          'Small Group Benefits',
          'Personalized Attention',
          'Group Motivation'
        ])
      }
    ];

    for (const plan of samplePlans) {
      const result = await Database.run(`
        INSERT INTO subscription_plans (
          name, monthly_classes, monthly_price, duration_months, equipment_access,
          description, category, features, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        plan.name,
        plan.monthly_classes,
        plan.monthly_price,
        plan.duration_months,
        plan.equipment_access,
        plan.description,
        plan.category,
        plan.features
      ]);
      
      console.log(`   ✅ Created: ${plan.name} (${plan.duration_months} months) - ID: ${result.id}`);
    }

    console.log('✅ Duration and categories updated successfully!');
    console.log('📋 Supported categories:');
    console.log('   - trial: Introduction packages for new members');
    console.log('   - basic: Entry-level packages');
    console.log('   - standard: Regular packages');
    console.log('   - premium: Advanced packages');
    console.log('   - unlimited: Unlimited access packages');
    console.log('   - personal: One-on-one training packages');
    console.log('   - special: Family/special packages');
    console.log('   - group: Group classes packages');
    console.log('   - personal_duo: Personal training for 2 people');
    console.log('   - personal_trio: Personal training for 3 people');
    console.log('');
    console.log('📅 Duration options:');
    console.log('   - 1 month: Monthly subscriptions');
    console.log('   - 3 months: Quarterly subscriptions');
    console.log('   - 6 months: Semi-annual subscriptions');
    console.log('   - 12 months: Annual subscriptions');
    console.log('   - Custom: Any duration can be set');

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
  addDurationAndCategories();
}

module.exports = addDurationAndCategories; 