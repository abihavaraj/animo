const Database = require('./config/database');

async function expireNow() {
  try {
    console.log('🔄 Expiring old subscriptions...');
    
    const result = await Database.run(`
      UPDATE user_subscriptions 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
      WHERE status = 'active' AND DATE(end_date) <= DATE('now')
    `);
    
    console.log(`✅ Expired ${result.changes} subscriptions`);
    
    // Show remaining active subscriptions
    const remaining = await Database.all(`
      SELECT us.id, u.name, sp.name as plan_name, us.end_date, us.remaining_classes
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id  
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
    `);
    
    console.log(`📊 Remaining active subscriptions: ${remaining.length}`);
    remaining.forEach(sub => {
      console.log(`  - ${sub.name}: ${sub.plan_name} (ends ${sub.end_date}, ${sub.remaining_classes} classes)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await Database.close();
  }
}

expireNow(); 