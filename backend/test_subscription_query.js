const Database = require('./config/database');

async function testSubscriptionQuery() {
  try {
    console.log('🧪 Testing subscription query...');
    
    // First, let's see all subscriptions
    const allSubs = await Database.all(`
      SELECT 
        us.id,
        us.user_id,
        us.status,
        us.start_date,
        us.end_date,
        us.remaining_classes,
        sp.name as plan_name,
        u.name as user_name,
        DATE('now') as today,
        DATE(us.end_date) >= DATE('now') as is_valid
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      ORDER BY us.created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📊 All recent subscriptions:');
    allSubs.forEach(sub => {
      console.log(`ID: ${sub.id}, User: ${sub.user_name}, Plan: ${sub.plan_name}, Status: ${sub.status}, End: ${sub.end_date}, Valid: ${sub.is_valid ? 'YES' : 'NO'}`);
    });
    
    // Now test the current subscription query for each user
    const users = await Database.all('SELECT id, name, email FROM users WHERE role = "client" LIMIT 5');
    
    for (const user of users) {
      console.log(`\n👤 Testing for user: ${user.name} (ID: ${user.id})`);
      
      // Test the current query from the API
      const currentSub = await Database.get(`
        SELECT 
          us.*,
          sp.name as plan_name,
          sp.equipment_access,
          sp.monthly_price,
          sp.monthly_classes,
          sp.category,
          sp.features,
          COALESCE(us.auto_renewal, 1) as auto_renewal
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status = 'active' AND DATE(us.end_date) >= DATE('now')
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.id]);
      
      if (currentSub) {
        console.log(`  ✅ Has current subscription: ${currentSub.plan_name} (ends ${currentSub.end_date})`);
      } else {
        console.log(`  ❌ No current subscription found`);
      }
      
      // Also check if they have any active subscriptions (including expired ones)
      const activeSub = await Database.get(`
        SELECT us.*, sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.id]);
      
      if (activeSub) {
        console.log(`  📋 Has active status subscription: ${activeSub.plan_name} (ends ${activeSub.end_date})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await Database.close();
  }
}

testSubscriptionQuery(); 