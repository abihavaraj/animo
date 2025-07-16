const db = require('./config/database');

async function checkArgjendUser() {
  try {
    console.log('🔍 Checking user "argjend" subscription status...\n');

    // Find user argjend
    const user = await db.get('SELECT * FROM users WHERE name LIKE ? OR email LIKE ?', ['%argjend%', '%argjend%']);
    
    if (!user) {
      console.log('❌ User "argjend" not found');
      console.log('All users in database:');
      const allUsers = await db.all('SELECT id, name, email, role FROM users');
      allUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email}) - ID: ${user.id} - Role: ${user.role}\n`);
    
    // Check all subscriptions for this user
    console.log('📋 All subscriptions for this user:');
    const allSubscriptions = await db.all(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_classes,
        sp.equipment_access,
        sp.monthly_price,
        DATE('now') as today,
        CASE 
          WHEN DATE(us.end_date) < DATE('now') AND us.status = 'active' THEN 'expired_but_showing_active'
          ELSE us.status
        END as actual_status
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC
    `, [user.id]);
    
    if (allSubscriptions.length === 0) {
      console.log('   No subscriptions found for this user');
    } else {
      allSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.plan_name}`);
        console.log(`      ID: ${sub.id}`);
        console.log(`      Status: ${sub.status} (Actual: ${sub.actual_status})`);
        console.log(`      Classes: ${sub.remaining_classes}/${sub.monthly_classes}`);
        console.log(`      Period: ${sub.start_date} to ${sub.end_date}`);
        console.log(`      Created: ${sub.created_at}`);
        console.log(`      Updated: ${sub.updated_at}`);
        
        // Check if this is past end date
        const endDate = new Date(sub.end_date);
        const today = new Date();
        const isExpired = endDate < today;
        
        if (isExpired && sub.status === 'active') {
          console.log(`      ⚠️  WARNING: This subscription is past its end date but still marked as active!`);
        }
        
        console.log('');
      });
    }
    
    // Check current active subscription (what the app would see)
    console.log('🎯 Current active subscription (API endpoint result):');
    const currentSub = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price,
        sp.monthly_classes,
        sp.category,
        sp.features,
        sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
        AND DATE(us.end_date) >= DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [user.id]);
    
    if (!currentSub) {
      console.log('   ✅ No current active subscription found (this is correct if all were cancelled)\n');
    } else {
      console.log(`   ❌ FOUND ACTIVE SUBSCRIPTION: ${currentSub.plan_name}`);
      console.log(`      Status: ${currentSub.status}`);
      console.log(`      Classes: ${currentSub.remaining_classes}`);
      console.log(`      Valid until: ${currentSub.end_date}\n`);
    }
    
    // Check recent payments/credits
    console.log('💳 Recent payments and credits:');
    const payments = await db.all(`
      SELECT 
        p.*,
        'payment' as type
      FROM payments p
      WHERE p.user_id = ?
      
      UNION ALL
      
      SELECT 
        mc.id,
        mc.user_id,
        NULL as subscription_id,
        mc.amount,
        mc.created_at as payment_date,
        mc.reason as payment_method,
        'completed' as status,
        'credit' as type
      FROM manual_credits mc
      WHERE mc.user_id = ?
      
      ORDER BY payment_date DESC
      LIMIT 10
    `, [user.id, user.id]);
    
    if (payments.length === 0) {
      console.log('   No recent payments or credits found');
    } else {
      payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.type.toUpperCase()}: $${payment.amount} (${payment.payment_method}) - ${payment.payment_date}`);
      });
    }
    
    console.log('\n🔧 SUGGESTED ACTIONS:');
    
    if (currentSub) {
      console.log('1. Cancel the active subscription:');
      console.log(`   UPDATE user_subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ${currentSub.id};`);
      console.log('');
      console.log('2. Or check if this subscription should actually be active and the end date is correct.');
    } else {
      console.log('✅ Database looks correct - no active subscriptions found.');
      console.log('The issue might be:');
      console.log('- Frontend caching (try force refresh in app)');
      console.log('- Redux store not updating (restart app)');
      console.log('- Different user account being checked');
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await db.close();
  }
}

// Run the check
checkArgjendUser(); 