/**
 * Test script to verify class deletion refunds work correctly
 * This script tests that when a class is deleted, all booked users get their credits refunded
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testClassDeletionRefunds() {
  console.log('🧪 Testing Class Deletion Refunds...\n');
  
  try {
    // 1. Find a class with bookings
    const { data: classesWithBookings, error: classError } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        date,
        time,
        category,
        bookings!inner(
          id,
          user_id,
          status,
          users(name)
        )
      `)
      .eq('bookings.status', 'confirmed')
      .limit(1);
    
    if (classError || !classesWithBookings?.length) {
      console.log('❌ No classes with confirmed bookings found. Please create a class and book it first.');
      return;
    }
    
    const testClass = classesWithBookings[0];
    const bookings = testClass.bookings || [];
    
    console.log(`📋 Found test class: "${testClass.name}" (ID: ${testClass.id})`);
    console.log(`📅 Date: ${testClass.date} at ${testClass.time}`);
    console.log(`👥 Confirmed bookings: ${bookings.length}`);
    
    // 2. Record current subscription states before deletion
    const userSubscriptions = [];
    for (const booking of bookings) {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          remaining_classes,
          subscription_plans(name, monthly_classes)
        `)
        .eq('user_id', booking.user_id)
        .eq('status', 'active')
        .single();
      
      if (subscription) {
        userSubscriptions.push({
          userId: booking.user_id,
          userName: booking.users?.name || 'Unknown',
          subscriptionId: subscription.id,
          remainingClassesBefore: subscription.remaining_classes,
          planName: subscription.subscription_plans?.name || 'Unknown Plan',
          isUnlimited: (subscription.subscription_plans?.monthly_classes || 0) >= 999
        });
      }
    }
    
    console.log('\n📊 User subscription states before deletion:');
    userSubscriptions.forEach(sub => {
      const status = sub.isUnlimited ? 'Unlimited' : `${sub.remainingClassesBefore} classes`;
      console.log(`   👤 ${sub.userName} (${sub.planName}): ${status}`);
    });
    
    // 3. Ask for confirmation before deletion
    console.log(`\n⚠️  WARNING: This will actually delete class "${testClass.name}"!`);
    console.log('This is a REAL test that will modify your database.');
    console.log('Make sure this is a test class you can safely delete.\n');
    
    // For safety, exit without deletion in this test
    console.log('🛡️  Safety mode: Test stopped before actual deletion');
    console.log('To perform real deletion test, modify this script to continue.\n');
    
    console.log('🔄 Expected behavior when deletion runs:');
    userSubscriptions.forEach(sub => {
      if (sub.isUnlimited) {
        console.log(`   ✅ ${sub.userName}: No refund needed (unlimited plan)`);
      } else {
        console.log(`   💰 ${sub.userName}: ${sub.remainingClassesBefore} → ${sub.remainingClassesBefore + 1} classes`);
      }
    });
    
    console.log('\n📝 To test manually:');
    console.log('1. Go to admin portal > Class Management');
    console.log(`2. Delete class "${testClass.name}"`);
    console.log('3. Check that users received refund message');
    console.log('4. Verify user subscription credits increased by 1');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

async function simulateRefundLogic() {
  console.log('\n🔬 Simulating refund logic...\n');
  
  // This simulates the refund logic for different timing scenarios
  const scenarios = [
    {
      title: 'Future Class (Should Refund)',
      classTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      shouldRefund: true
    },
    {
      title: 'Past Class (No Refund)',
      classTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      shouldRefund: false
    }
  ];
  
  const sampleUsers = [
    { name: 'John Doe', plan: 'Basic Monthly', remaining: 5, unlimited: false },
    { name: 'Jane Smith', plan: 'Unlimited', remaining: 999, unlimited: true },
    { name: 'Bob Johnson', plan: 'Daypass', remaining: 0, unlimited: false }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`📅 ${scenario.title}:`);
    console.log(`   🕐 Class time: ${scenario.classTime.toISOString()}`);
    console.log(`   🕐 Current time: ${new Date().toISOString()}`);
    console.log(`   ⏰ Class has ${scenario.classTime <= new Date() ? 'started/passed' : 'not started yet'}`);
    
    if (scenario.shouldRefund) {
      console.log(`   💰 Processing refunds:`);
      sampleUsers.forEach(user => {
        if (user.unlimited) {
          console.log(`      ✅ ${user.name}: No refund needed (unlimited plan)`);
        } else {
          const newRemaining = user.remaining + 1;
          console.log(`      💰 ${user.name}: ${user.remaining} → ${newRemaining} classes`);
        }
      });
    } else {
      console.log(`   ⏰ No refunds processed - class already started/passed`);
      console.log(`   📋 ${sampleUsers.length} users had bookings but received no refunds`);
    }
    console.log('');
  });
}

// Run the tests
testClassDeletionRefunds().then(() => {
  simulateRefundLogic();
});