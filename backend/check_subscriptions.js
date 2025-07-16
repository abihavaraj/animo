const Database = require('./config/database');

async function checkSubscriptions() {
  try {
    console.log('🔍 Checking current subscriptions...');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Today: ${today}`);
    
    const subscriptions = await Database.all(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_classes,
        u.name as user_name,
        u.email as user_email,
        DATE(us.end_date) as end_date_formatted,
        DATE('now') as today_formatted,
        DATE(us.end_date) >= DATE('now') as is_active_by_date,
        julianday('now') - julianday(us.end_date) as days_expired
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 10
    `);
    
    if (subscriptions.length === 0) {
      console.log('✅ No active subscriptions found');
      return;
    }
    
    console.log(`\n📊 Found ${subscriptions.length} active subscriptions:\n`);
    
    subscriptions.forEach(sub => {
      const daysExpired = Math.round(sub.days_expired);
      const status = sub.is_active_by_date ? '✅ VALID' : '❌ EXPIRED';
      
      console.log(`ID: ${sub.id}`);
      console.log(`  User: ${sub.user_name} (${sub.user_email})`);
      console.log(`  Plan: ${sub.plan_name}`);
      console.log(`  Classes: ${sub.remaining_classes}/${sub.monthly_classes}`);
      console.log(`  Start: ${sub.start_date}`);
      console.log(`  End: ${sub.end_date}`);
      console.log(`  Status: ${sub.status}`);
      console.log(`  ${status} (${daysExpired > 0 ? `expired ${daysExpired} days ago` : `expires in ${Math.abs(daysExpired)} days`})`);
      console.log(`  Should be returned by API: ${sub.is_active_by_date ? 'YES' : 'NO'}`);
      console.log('');
    });
    
    // Check which ones should be expired
    const expiredSubs = subscriptions.filter(sub => !sub.is_active_by_date);
    if (expiredSubs.length > 0) {
      console.log(`⚠️  ${expiredSubs.length} subscriptions should be marked as expired!`);
    }
    
  } catch (error) {
    console.error('❌ Error checking subscriptions:', error);
  } finally {
    await Database.close();
  }
}

checkSubscriptions(); 