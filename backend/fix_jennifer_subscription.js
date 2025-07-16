const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'pilates_studio.db');
const db = new Database(dbPath);

console.log('🔧 Updating Jennifer\'s subscription...');

try {
  // Find Jennifer Smith
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get('jennifer@example.com');
  
  if (!user) {
    console.error('❌ Jennifer Smith not found');
    process.exit(1);
  }

  console.log(`👤 Found user: ${user.name} (ID: ${user.id})`);

  // Get her current subscription
  const currentSubscription = db.prepare(`
    SELECT us.*, sp.name as plan_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = ? AND us.status = 'active'
    ORDER BY us.created_at DESC
    LIMIT 1
  `).get(user.id);

  if (!currentSubscription) {
    console.error('❌ No active subscription found for Jennifer');
    process.exit(1);
  }

  console.log(`📋 Current subscription: ${currentSubscription.plan_name}`);
  console.log(`📊 Classes remaining: ${currentSubscription.remaining_classes}`);

  // Update her subscription to give her more classes
  const newClassCount = 15; // Give her 15 classes
  
  db.prepare(`
    UPDATE user_subscriptions 
    SET remaining_classes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(newClassCount, currentSubscription.id);

  console.log(`✅ Updated subscription! Jennifer now has ${newClassCount} classes remaining.`);

  // Verify the update
  const updatedSubscription = db.prepare(`
    SELECT us.*, sp.name as plan_name
    FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.id = ?
  `).get(currentSubscription.id);

  console.log('🎉 Verification:');
  console.log(`   Plan: ${updatedSubscription.plan_name}`);
  console.log(`   Classes: ${updatedSubscription.remaining_classes}`);
  console.log(`   Status: ${updatedSubscription.status}`);
  console.log(`   Valid until: ${updatedSubscription.end_date}`);

} catch (error) {
  console.error('❌ Error updating subscription:', error);
} finally {
  db.close();
} 