const db = require('./config/database');

async function fixArgjendSubscription() {
  try {
    console.log('🔧 Fixing Argjend\'s subscription to remove completely from app...\n');

    // Find user argjend
    const user = await db.get('SELECT * FROM users WHERE email = ?', ['argjend@argjend.com']);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.id})\n`);

    // Check current "active" subscription (what app sees)
    const currentSub = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
        AND DATE(us.end_date) >= DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [user.id]);

    if (!currentSub) {
      console.log('✅ No current subscription found. App should already show no subscription.');
      return;
    }

    console.log(`🎯 Found current subscription: ${currentSub.plan_name}`);
    console.log(`   Status: ${currentSub.status}`);
    console.log(`   Remaining Classes: ${currentSub.remaining_classes}`);
    console.log(`   ID: ${currentSub.id}\n`);

    // The issue is cancelled subscription still has remaining classes
    // Set remaining classes to 0 to remove it completely from app
    console.log('🔧 Setting remaining classes to 0 to remove from app...');
    
    const updateResult = await db.run(`
      UPDATE user_subscriptions 
      SET remaining_classes = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [currentSub.id]);

    if (updateResult.changes > 0) {
      console.log('✅ Successfully updated subscription');
      
      // Log the change
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        user.id,
        'subscription_cancellation',
        `Remaining classes set to 0 to completely remove cancelled subscription from app. Was: ${currentSub.remaining_classes} classes`,
        1 // Admin user ID
      ]);

      console.log('📱 App should now show "No Active Subscription"');
      
      // Test the result
      const testSub = await db.get(`
        SELECT 
          us.*,
          sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? 
          AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
          AND DATE(us.end_date) >= DATE('now')
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.id]);

      if (!testSub) {
        console.log('✅ FIXED! No subscription will be returned by API now.');
        console.log('📱 User should pull-to-refresh or restart app to see changes.');
      } else {
        console.log('❌ Still showing subscription - something went wrong');
      }
      
    } else {
      console.log('❌ Failed to update subscription');
    }

  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
  } finally {
    await db.close();
  }
}

// Run the fix
fixArgjendSubscription(); 