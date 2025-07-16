const Database = require('./config/database');

async function checkDaypassPlans() {
  try {
    await Database.connect();
    console.log('🔍 Checking for daypass plans...\n');
    
    const daypassPlans = await Database.all(`
      SELECT id, name, duration_months, monthly_classes, monthly_price, is_active
      FROM subscription_plans 
      WHERE name LIKE '%daypass%' OR name LIKE '%Day Pass%' OR name LIKE '%1 day%' OR name LIKE '%1-day%'
      ORDER BY id
    `);
    
    if (daypassPlans.length > 0) {
      console.log(`Found ${daypassPlans.length} daypass plans:`);
      daypassPlans.forEach(plan => {
        console.log(`  ID: ${plan.id}`);
        console.log(`  Name: ${plan.name}`);
        console.log(`  Duration: ${plan.duration_months} months`);
        console.log(`  Classes: ${plan.monthly_classes}`);
        console.log(`  Price: $${plan.monthly_price}`);
        console.log(`  Active: ${plan.is_active ? 'Yes' : 'No'}`);
        console.log('  ---');
      });
    } else {
      console.log('No daypass plans found');
    }
    
    await Database.close();
    
  } catch (error) {
    console.error('Error:', error);
    if (Database) {
      await Database.close();
    }
  }
}

checkDaypassPlans(); 