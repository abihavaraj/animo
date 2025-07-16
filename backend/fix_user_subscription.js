const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pilates_studio.db'));

async function fixUserSubscription() {
  try {
    console.log('🔧 Fixing user subscription...');

    // Find Jennifer Smith (user who was having booking issues)
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get('jennifer@example.com');
    
    if (!user) {
      console.error('❌ User jennifer@example.com not found');
      return;
    }

    console.log(`👤 Found user: ${user.name} (ID: ${user.id})`);

    // Cancel any existing active subscriptions
    const existingSubscriptions = db.prepare(`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ? AND status = 'active'
    `).all(user.id);

    for (const sub of existingSubscriptions) {
      db.prepare(`
        UPDATE user_subscriptions 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(sub.id);
      console.log(`🗑️ Cancelled existing subscription ${sub.id}`);
    }

    // Get a good subscription plan (Full Access Premium)
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE name LIKE "%Full Access%" LIMIT 1').get();
    
    if (!plan) {
      console.error('❌ No suitable subscription plan found');
      return;
    }

    console.log(`📋 Using plan: ${plan.name} (${plan.monthly_classes} classes, $${plan.monthly_price})`);

    // Create new active subscription with plenty of classes
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

    const newSubscription = db.prepare(`
      INSERT INTO user_subscriptions (
        user_id, plan_id, remaining_classes, start_date, end_date, status
      ) VALUES (?, ?, ?, ?, ?, 'active')
    `).run(user.id, plan.id, 15, startDate, endDate); // Give them 15 classes

    console.log(`✅ Created new subscription ${newSubscription.lastInsertRowid} with 15 classes`);

    // Create payment record
    db.prepare(`
      INSERT INTO payments (
        user_id, subscription_id, amount, payment_date, payment_method, status
      ) VALUES (?, ?, ?, ?, 'card', 'completed')
    `).run(user.id, newSubscription.lastInsertRowid, plan.monthly_price, startDate);

    console.log(`💳 Payment record created`);

    // Verify the subscription
    const verifySubscription = db.prepare(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.id = ?
    `).get(newSubscription.lastInsertRowid);

    console.log('🎉 Subscription created successfully:');
    console.log(`   Plan: ${verifySubscription.plan_name}`);
    console.log(`   Classes: ${verifySubscription.remaining_classes}/${verifySubscription.monthly_classes || plan.monthly_classes}`);
    console.log(`   Equipment: ${verifySubscription.equipment_access}`);
    console.log(`   Status: ${verifySubscription.status}`);
    console.log(`   Valid until: ${verifySubscription.end_date}`);

  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
  } finally {
    db.close();
  }
}

// Run the script
fixUserSubscription(); 