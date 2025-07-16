const Database = require('./config/database');

// Simulate the middleware and API call
async function testExpiredSubscriptionAPI() {
  try {
    console.log('🧪 Testing expired subscription API behavior...');
    
    // Step 1: Check if there are any active subscriptions with past end dates
    const expiredActiveSubscriptions = await Database.all(`
      SELECT 
        us.id,
        us.user_id,
        us.status,
        us.end_date,
        us.remaining_classes,
        sp.name as plan_name,
        u.name as user_name,
        DATE('now') as today,
        DATE(us.end_date) < DATE('now') as is_expired
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE us.status = 'active'
      ORDER BY us.created_at DESC
    `);
    
    console.log(`📊 Found ${expiredActiveSubscriptions.length} active subscriptions`);
    
    const actuallyExpired = expiredActiveSubscriptions.filter(sub => sub.is_expired);
    
    if (actuallyExpired.length > 0) {
      console.log(`⚠️  ${actuallyExpired.length} subscriptions should be expired:`);
      actuallyExpired.forEach(sub => {
        console.log(`  - ${sub.user_name}: ${sub.plan_name} (ended ${sub.end_date})`);
      });
      
      // Step 2: Apply the middleware logic (expire old subscriptions)
      console.log('\n🔄 Applying expiration logic...');
      const result = await Database.run(`
        UPDATE user_subscriptions 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
        WHERE status = 'active' AND DATE(end_date) < DATE('now')
      `);
      
      console.log(`✅ Expired ${result.changes} subscriptions`);
    } else {
      console.log('✅ No subscriptions need to be expired');
    }
    
    // Step 3: Test the current subscription query for all users
    const users = await Database.all('SELECT id, name FROM users WHERE role = "client" LIMIT 5');
    
    console.log('\n📱 Testing current subscription API for users:');
    
    for (const user of users) {
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
        const daysLeft = Math.floor((new Date(currentSub.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  ✅ ${user.name}: ${currentSub.plan_name} (${currentSub.remaining_classes} classes, ${daysLeft} days left)`);
      } else {
        console.log(`  ❌ ${user.name}: No current subscription`);
      }
    }
    
    console.log('\n🎉 Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await Database.close();
  }
}

testExpiredSubscriptionAPI(); 