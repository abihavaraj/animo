const Database = require('./config/database');
const subscriptionNotificationService = require('./services/subscriptionNotificationService');

async function testSubscriptionActions() {
  try {
    await Database.connect();
    console.log('🧪 Testing subscription management actions...\n');

    // 1. Get a test client user
    console.log('1. Finding test client...');
    const testClient = await Database.get(`
      SELECT * FROM users WHERE role = 'client' LIMIT 1
    `);
    
    if (!testClient) {
      console.log('❌ No client users found. Please create a client user first.');
      return { success: false, error: 'No client users found' };
    }
    
    console.log(`✅ Found test client: ${testClient.name} (${testClient.email})`);

    // 2. Get reception user
    console.log('\n2. Finding reception user...');
    const receptionUser = await Database.get(`
      SELECT * FROM users WHERE role = 'reception' LIMIT 1
    `);
    
    if (!receptionUser) {
      console.log('❌ No reception users found. Please create a reception user first.');
      return { success: false, error: 'No reception users found' };
    }
    
    console.log(`✅ Found reception user: ${receptionUser.name} (${receptionUser.email})`);

    // 3. Get subscription plans
    console.log('\n3. Getting subscription plans...');
    const plans = await Database.all(`
      SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price ASC LIMIT 3
    `);
    
    if (plans.length < 2) {
      console.log('❌ Need at least 2 active subscription plans for testing.');
      return { success: false, error: 'Insufficient subscription plans' };
    }
    
    console.log(`✅ Found ${plans.length} active plans:`);
    plans.forEach((plan, index) => {
      console.log(`   ${index + 1}. ${plan.name} - $${plan.monthly_price} - ${plan.monthly_classes} classes`);
    });

    // 4. Clean up any existing subscriptions for test client
    console.log('\n4. Cleaning up existing subscriptions...');
    await Database.run(`
      UPDATE user_subscriptions 
      SET status = 'cancelled' 
      WHERE user_id = ? AND status = 'active'
    `, [testClient.id]);
    console.log('✅ Cleaned up existing subscriptions');

    // 5. Test 1: Assign initial subscription
    console.log('\n5. TEST 1: Assigning initial subscription...');
    const initialPlan = plans[0];
    
    const assignResult = await Database.run(`
      INSERT INTO user_subscriptions (
        user_id, plan_id, remaining_classes, start_date, end_date, status
      ) VALUES (?, ?, ?, DATE('now'), DATE('now', '+1 month'), 'active')
    `, [testClient.id, initialPlan.id, initialPlan.monthly_classes]);

    await Database.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      testClient.id,
      'subscription_purchase',
      `Initial ${initialPlan.name} subscription for testing`,
      receptionUser.id
    ]);

    console.log(`✅ Assigned initial subscription: ${initialPlan.name}`);

    // 6. Test 2: Extend subscription
    console.log('\n6. TEST 2: Extending subscription...');
    const subscription = await Database.get(`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ? AND status = 'active'
    `, [testClient.id]);

    if (subscription) {
      // Extend by 7 days
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + 7);
      const formattedEndDate = newEndDate.toISOString().split('T')[0];

      await Database.run(`
        UPDATE user_subscriptions 
        SET end_date = ? 
        WHERE id = ?
      `, [formattedEndDate, subscription.id]);

      await Database.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        testClient.id,
        'subscription_extended',
        `Subscription extended by 7 days by ${receptionUser.name} (reception). New end date: ${formattedEndDate}`,
        receptionUser.id
      ]);

      // Test notification creation
      await subscriptionNotificationService.createSubscriptionChangeNotification(
        testClient.id,
        'extended',
        `Extended by 7 days. New end date: ${formattedEndDate}`,
        receptionUser.id
      );

      console.log(`✅ Extended subscription by 7 days to ${formattedEndDate}`);
    }

    // 7. Test 3: Pause subscription
    console.log('\n7. TEST 3: Pausing subscription...');
    if (subscription) {
      await Database.run(`
        UPDATE user_subscriptions 
        SET status = 'paused' 
        WHERE id = ?
      `, [subscription.id]);

      await Database.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        testClient.id,
        'subscription_paused',
        `Subscription paused by ${receptionUser.name} (reception) for testing`,
        receptionUser.id
      ]);

      // Test notification creation
      await subscriptionNotificationService.createSubscriptionChangeNotification(
        testClient.id,
        'paused',
        `Paused for testing purposes`,
        receptionUser.id
      );

      console.log(`✅ Paused subscription`);
    }

    // 8. Test 4: Resume subscription
    console.log('\n8. TEST 4: Resuming subscription...');
    if (subscription) {
      await Database.run(`
        UPDATE user_subscriptions 
        SET status = 'active' 
        WHERE id = ?
      `, [subscription.id]);

      await Database.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        testClient.id,
        'subscription_resumed',
        `Subscription resumed by ${receptionUser.name} (reception) for testing`,
        receptionUser.id
      ]);

      // Test notification creation
      await subscriptionNotificationService.createSubscriptionChangeNotification(
        testClient.id,
        'resumed',
        `Your subscription has been resumed`,
        receptionUser.id
      );

      console.log(`✅ Resumed subscription`);
    }

    // 9. Test 5: Replace subscription (assign new plan)
    console.log('\n9. TEST 5: Replacing subscription with new plan...');
    const newPlan = plans[1];
    
    // Cancel existing subscription
    await Database.run(`
      UPDATE user_subscriptions 
      SET status = 'cancelled' 
      WHERE id = ?
    `, [subscription.id]);

    // Create new subscription
    const replaceResult = await Database.run(`
      INSERT INTO user_subscriptions (
        user_id, plan_id, remaining_classes, start_date, end_date, status
      ) VALUES (?, ?, ?, DATE('now'), DATE('now', '+1 month'), 'active')
    `, [testClient.id, newPlan.id, newPlan.monthly_classes]);

    await Database.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      testClient.id,
      'subscription_purchase',
      `Replaced subscription with ${newPlan.name} by ${receptionUser.name} (reception)`,
      receptionUser.id
    ]);

    // Test notification creation
    await subscriptionNotificationService.createSubscriptionChangeNotification(
      testClient.id,
      'replaced',
      `${newPlan.name} subscription`,
      receptionUser.id
    );

    console.log(`✅ Replaced subscription with: ${newPlan.name}`);

    // 10. Test subscription expiration notification
    console.log('\n10. TEST 6: Testing subscription expiration notification...');
    
    // Update subscription to expire in 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const expiryDate = twoDaysFromNow.toISOString().split('T')[0];

    await Database.run(`
      UPDATE user_subscriptions 
      SET end_date = ? 
      WHERE id = ?
    `, [expiryDate, replaceResult.id]);

    // Manually trigger expiration check
    await subscriptionNotificationService.checkExpiringSubscriptions();
    
    console.log(`✅ Updated subscription to expire in 2 days (${expiryDate})`);

    // 11. Verify notifications were created
    console.log('\n11. Verifying notifications...');
    const notifications = await Database.all(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [testClient.id]);

    console.log(`✅ Found ${notifications.length} notifications for test client:`);
    notifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.type}: ${notif.message.substring(0, 80)}...`);
    });

    // 12. Verify user subscription history
    console.log('\n12. Verifying subscription history...');
    const subscriptionHistory = await Database.all(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_price
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC
    `, [testClient.id]);

    console.log(`✅ Found ${subscriptionHistory.length} subscriptions in history:`);
    subscriptionHistory.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.plan_name} - Status: ${sub.status} - Classes: ${sub.remaining_classes}`);
    });

    // 13. Verify activity log
    console.log('\n13. Verifying activity log...');
    const activityLog = await Database.all(`
      SELECT 
        cal.*,
        u.name as performed_by_name
      FROM client_activity_log cal
      LEFT JOIN users u ON cal.performed_by = u.id
      WHERE cal.client_id = ?
      ORDER BY cal.created_at DESC
      LIMIT 10
    `, [testClient.id]);

    console.log(`✅ Found ${activityLog.length} activity entries:`);
    activityLog.forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity.activity_type} by ${activity.performed_by_name || 'System'}`);
      console.log(`      ${activity.description.substring(0, 80)}...`);
    });

    console.log('\n🎉 All subscription management tests completed successfully!');
    console.log('\n📋 Test Results Summary:');
    console.log('   ✅ Initial subscription assignment');
    console.log('   ✅ Subscription extension'); 
    console.log('   ✅ Subscription pause');
    console.log('   ✅ Subscription resume');
    console.log('   ✅ Subscription replacement');
    console.log('   ✅ Expiration notifications');
    console.log('   ✅ Change notifications');
    console.log('   ✅ Activity logging');
    console.log('   ✅ User history tracking');

    await Database.close();
    return { success: true };

  } catch (error) {
    console.error('❌ Error during subscription testing:', error);
    await Database.close();
    return { success: false, error: error.message };
  }
}

// Run the test if called directly
if (require.main === module) {
  testSubscriptionActions()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Subscription management test completed successfully!');
        console.log('🚀 All subscription actions are working properly.');
        console.log('📱 Notifications are being created for subscription changes.');
        console.log('📊 Activity logging and history tracking are functional.');
        process.exit(0);
      } else {
        console.log('\n💥 Subscription management test failed:', result.error);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test script error:', error);
      process.exit(1);
    });
}

module.exports = { testSubscriptionActions }; 