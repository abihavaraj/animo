const Database = require('./config/database');

async function checkSubscriptionPlans() {
  try {
    await Database.connect();
    
    // Get table structure
    console.log('📋 Subscription Plans table structure:');
    const structure = await Database.all('PRAGMA table_info(subscription_plans)');
    structure.forEach(col => {
      console.log(`   - ${col.name}: ${col.type}`);
    });
    
    console.log('\n📊 Current subscription plans:');
    const plans = await Database.all('SELECT * FROM subscription_plans ORDER BY id');
    
    if (plans.length > 0) {
      plans.forEach((plan, index) => {
        console.log(`\n   ${index + 1}. ${plan.name}`);
        console.log(`      💰 Price: $${plan.monthly_price}/month`);
        console.log(`      📚 Classes: ${plan.monthly_classes}/month`);
        console.log(`      🏋️ Equipment: ${plan.equipment_access}`);
        console.log(`      📂 Category: ${plan.category}`);
        console.log(`      ✅ Active: ${plan.is_active ? 'Yes' : 'No'}`);
        if (plan.features) {
          console.log(`      🎯 Features: ${plan.features}`);
        }
      });
    } else {
      console.log('   No subscription plans found');
    }
    
    await Database.close();
  } catch (error) {
    console.error('Error:', error);
    if (Database) {
      await Database.close();
    }
  }
}

checkSubscriptionPlans(); 