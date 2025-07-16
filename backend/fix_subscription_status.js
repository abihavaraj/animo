const Database = require('./config/database');
const moment = require('moment');

async function fixSubscriptionStatus() {
  try {
    await Database.connect();
    console.log('🔧 Starting subscription status fix...\n');

    // Step 1: Update expired subscriptions
    console.log('1️⃣ Updating expired subscriptions...');
    const today = moment().format('YYYY-MM-DD');
    
    const expiredResult = await Database.run(`
      UPDATE user_subscriptions 
      SET status = 'expired' 
      WHERE DATE(end_date) < ? AND status = 'active'
    `, [today]);

    console.log(`   ✅ Updated ${expiredResult.changes} expired subscriptions\n`);

    // Step 2: Check for daypass plans with incorrect duration
    console.log('2️⃣ Checking for daypass plans with incorrect duration...');
    const daypassPlans = await Database.all(`
      SELECT id, name, duration_months 
      FROM subscription_plans 
      WHERE (name LIKE '%daypass%' OR name LIKE '%Day Pass%' OR name LIKE '%1 day%' OR name LIKE '%1-day%')
      AND duration_months != 0.033
    `);

    if (daypassPlans.length > 0) {
      console.log(`   Found ${daypassPlans.length} daypass plans with incorrect duration:`);
      
      for (const plan of daypassPlans) {
        console.log(`   - ${plan.name}: ${plan.duration_months} months (should be 0.033)`);
        
        // Update the plan duration
        await Database.run(`
          UPDATE subscription_plans 
          SET duration_months = 0.033 
          WHERE id = ?
        `, [plan.id]);
        
        console.log(`     ✅ Fixed duration for "${plan.name}"`);
      }
    } else {
      console.log('   ✅ No daypass plans found with incorrect duration');
    }

    // Step 3: Check for subscriptions that should be 1-day but are showing as 1-month
    console.log('\n3️⃣ Checking for subscriptions with daypass plans that have wrong end dates...');
    const daypassSubscriptions = await Database.all(`
      SELECT 
        us.id, 
        us.user_id, 
        us.start_date, 
        us.end_date, 
        us.status,
        sp.name as plan_name,
        sp.duration_months,
        u.name as user_name,
        u.email as user_email,
        julianday(us.end_date) - julianday(us.start_date) as actual_days
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE (sp.name LIKE '%daypass%' OR sp.name LIKE '%Day Pass%' OR sp.name LIKE '%1 day%' OR sp.name LIKE '%1-day%')
      AND us.status = 'active'
      AND (julianday(us.end_date) - julianday(us.start_date)) > 2
    `);

    if (daypassSubscriptions.length > 0) {
      console.log(`   Found ${daypassSubscriptions.length} daypass subscriptions with wrong end dates:`);
      
      for (const sub of daypassSubscriptions) {
        const correctEndDate = moment(sub.start_date).add(1, 'day').format('YYYY-MM-DD');
        console.log(`   - ${sub.user_name} (${sub.user_email}): ${sub.plan_name}`);
        console.log(`     Current: ${sub.start_date} to ${sub.end_date} (${Math.round(sub.actual_days)} days)`);
        console.log(`     Should be: ${sub.start_date} to ${correctEndDate} (1 day)`);
        
        // Fix the end date
        await Database.run(`
          UPDATE user_subscriptions 
          SET end_date = ? 
          WHERE id = ?
        `, [correctEndDate, sub.id]);
        
        console.log(`     ✅ Fixed end date for ${sub.user_name}'s subscription`);
      }
    } else {
      console.log('   ✅ No daypass subscriptions found with incorrect end dates');
    }

    // Step 4: Show current subscription status summary
    console.log('\n4️⃣ Current subscription status summary:');
    const statusSummary = await Database.all(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN DATE(end_date) < DATE('now') THEN 1 END) as past_end_date,
        COUNT(CASE WHEN DATE(end_date) >= DATE('now') THEN 1 END) as future_end_date
      FROM user_subscriptions 
      GROUP BY status
      ORDER BY status
    `);

    statusSummary.forEach(row => {
      console.log(`   ${row.status.toUpperCase()}: ${row.count} total`);
      if (row.past_end_date > 0) {
        console.log(`     - ${row.past_end_date} with end date in the past`);
      }
      if (row.future_end_date > 0) {
        console.log(`     - ${row.future_end_date} with end date in the future`);
      }
    });

    // Step 5: Show problematic subscriptions that still need attention
    console.log('\n5️⃣ Checking for remaining problematic subscriptions...');
    const problematicSubs = await Database.all(`
      SELECT 
        us.id,
        us.status,
        us.start_date,
        us.end_date,
        sp.name as plan_name,
        u.name as user_name,
        u.email as user_email,
        DATE(us.end_date) < DATE('now') as is_past_due
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE us.status = 'active' AND DATE(us.end_date) < DATE('now')
    `);

    if (problematicSubs.length > 0) {
      console.log(`   ⚠️ Found ${problematicSubs.length} subscriptions that are still marked as active but past their end date:`);
      problematicSubs.forEach(sub => {
        console.log(`   - ${sub.user_name}: ${sub.plan_name} (ended ${sub.end_date})`);
      });
    } else {
      console.log('   ✅ No problematic subscriptions found');
    }

    await Database.close();
    console.log('\n✅ Subscription status fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing subscription status:', error);
    if (Database) {
      await Database.close();
    }
    process.exit(1);
  }
}

// Run the fix
fixSubscriptionStatus(); 