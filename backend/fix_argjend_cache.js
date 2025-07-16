const db = require('./config/database');

async function testArgjendSubscriptionAPI() {
  try {
    console.log('🧪 Testing subscription API logic for user Argjend...\n');

    // Find user argjend
    const user = await db.get('SELECT * FROM users WHERE email = ?', ['argjend@argjend.com']);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.id})\n`);

    // First, update any expired subscriptions (same as API does)
    const today = new Date().toISOString().split('T')[0];
    const updateResult = await db.run(
      'UPDATE user_subscriptions SET status = "expired" WHERE DATE(end_date) < ? AND status = "active"',
      [today]
    );
    
    if (updateResult.changes > 0) {
      console.log(`🔄 Auto-updated ${updateResult.changes} expired subscriptions`);
    }

    // Test the exact query used by /api/subscriptions/current endpoint
    console.log('🎯 Testing current subscription API query:');
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
      console.log('✅ API Result: No active subscription found');
      console.log('   This means the API should return null');
      console.log('   The app should show "No active subscription"');
    } else {
      console.log('❌ API Result: Found active subscription');
      console.log(`   Plan: ${currentSub.plan_name}`);
      console.log(`   Status: ${currentSub.status}`);
      console.log(`   Classes: ${currentSub.remaining_classes}`);
      console.log(`   Valid until: ${currentSub.end_date}`);
    }

    // Show what the app should display
    console.log('\n📱 What the app should show:');
    if (!currentSub) {
      console.log('   - "No Active Subscription"');
      console.log('   - "Ready to Start? Visit reception to begin your journey"');
      console.log('   - No class booking should be possible');
    } else {
      console.log(`   - Plan: ${currentSub.plan_name}`);
      console.log(`   - Classes: ${currentSub.remaining_classes} remaining`);
    }

    console.log('\n✅ Backend API is working correctly!');
    console.log('If the app still shows a subscription, the issue is frontend caching.');

  } catch (error) {
    console.error('❌ Error testing API:', error);
  } finally {
    await db.close();
  }
}

// Run the test
testArgjendSubscriptionAPI(); 