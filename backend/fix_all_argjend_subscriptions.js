const db = require('./config/database');

async function fixAllArgjendSubscriptions() {
  try {
    console.log('🔧 Fixing ALL of Argjend\'s subscriptions to remove completely from app...\n');

    // Find user argjend
    const user = await db.get('SELECT * FROM users WHERE email = ?', ['argjend@argjend.com']);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ Found user: ${user.name} (ID: ${user.id})\n`);

    // Find ALL cancelled subscriptions with remaining classes
    const cancelledSubs = await db.all(`
      SELECT 
        us.*,
        sp.name as plan_name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND us.status = 'cancelled' 
        AND us.remaining_classes > 0
      ORDER BY us.created_at DESC
    `, [user.id]);

    if (cancelledSubs.length === 0) {
      console.log('✅ No cancelled subscriptions with remaining classes found.');
    } else {
      console.log(`🎯 Found ${cancelledSubs.length} cancelled subscription(s) with remaining classes:`);
      
      for (let i = 0; i < cancelledSubs.length; i++) {
        const sub = cancelledSubs[i];
        console.log(`   ${i + 1}. ${sub.plan_name} - ${sub.remaining_classes} classes (ID: ${sub.id})`);
      }
      
      console.log('\n🔧 Setting remaining classes to 0 for all cancelled subscriptions...');
      
      // Update all cancelled subscriptions to have 0 remaining classes
      const updateResult = await db.run(`
        UPDATE user_subscriptions 
        SET remaining_classes = 0, updated_at = CURRENT_TIMESTAMP 
        WHERE user_id = ? AND status = 'cancelled' AND remaining_classes > 0
      `, [user.id]);

      console.log(`✅ Updated ${updateResult.changes} subscription(s)`);
      
      // Log the change
      if (updateResult.changes > 0) {
        await db.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by
          ) VALUES (?, ?, ?, ?)
        `, [
          user.id,
          'subscription_cancellation',
          `Set remaining classes to 0 for ${updateResult.changes} cancelled subscription(s) to completely remove from app`,
          1 // Admin user ID
        ]);
      }
    }

    // Also check for any active subscriptions that should be expired
    console.log('\n🔍 Checking for expired active subscriptions...');
    const today = new Date().toISOString().split('T')[0];
    const expiredResult = await db.run(`
      UPDATE user_subscriptions 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ? AND status = 'active' AND DATE(end_date) < ?
    `, [user.id, today]);

    if (expiredResult.changes > 0) {
      console.log(`🔄 Expired ${expiredResult.changes} subscription(s)`);
    } else {
      console.log('✅ No expired active subscriptions found');
    }

    // Final test - check what API will return now
    console.log('\n🧪 Final test - checking what API will return:');
    const finalTest = await db.get(`
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

    if (!finalTest) {
      console.log('✅ PERFECT! API will return no subscription now.');
      console.log('📱 App should show "No Active Subscription" after refresh.');
      console.log('\n🔄 Next steps for user:');
      console.log('1. Pull-to-refresh in the app (swipe down on subscription screen)');
      console.log('2. Or restart the app completely');
      console.log('3. The subscription should disappear');
    } else {
      console.log('❌ Still finding subscription:');
      console.log(`   Plan: ${finalTest.plan_name}`);
      console.log(`   Status: ${finalTest.status}`);
      console.log(`   Classes: ${finalTest.remaining_classes}`);
      console.log(`   End date: ${finalTest.end_date}`);
    }

  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
  } finally {
    await db.close();
  }
}

// Run the fix
fixAllArgjendSubscriptions(); 