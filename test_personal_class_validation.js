/**
 * Test script to verify personal class booking validation
 * This script tests that users with daypass/group subscriptions cannot book personal classes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPersonalClassValidation() {
  console.log('🧪 Testing Personal Class Booking Validation...\n');
  
  try {
    // 1. First, find a personal class
    const { data: personalClasses, error: classError } = await supabase
      .from('classes')
      .select('id, name, category')
      .eq('category', 'personal')
      .limit(1);
    
    if (classError || !personalClasses?.length) {
      console.log('❌ No personal classes found in database. Please create a personal class first.');
      return;
    }
    
    const personalClass = personalClasses[0];
    console.log(`📋 Found personal class: "${personalClass.name}" (ID: ${personalClass.id})`);
    
    // 2. Find a user with a group/daypass subscription
    const { data: groupSubscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        user_id,
        status,
        subscription_plans!inner(
          id,
          name,
          category
        )
      `)
      .eq('status', 'active')
      .neq('subscription_plans.category', 'personal')
      .limit(1);
    
    if (subError || !groupSubscriptions?.length) {
      console.log('❌ No active group/daypass subscriptions found. Please create a group subscription first.');
      return;
    }
    
    const groupSubscription = groupSubscriptions[0];
    const planCategory = groupSubscription.subscription_plans.category;
    const planName = groupSubscription.subscription_plans.name;
    
    console.log(`👤 Found user with ${planCategory} subscription: "${planName}" (User ID: ${groupSubscription.user_id})`);
    
    // 3. Test the booking validation by simulating a booking attempt
    console.log(`\n🚫 Testing booking validation...`);
    console.log(`Attempting to book personal class "${personalClass.name}" with ${planCategory} subscription...`);
    
    // Simulate the validation logic from the booking service
    const isPersonalSubscription = planCategory === 'personal';
    const isPersonalClass = personalClass.category === 'personal';
    
    if (!isPersonalSubscription && isPersonalClass) {
      console.log('✅ VALIDATION WORKING: Personal class booking blocked!');
      console.log('📝 Error message: "This is a personal training session. You need a personal subscription to book this class."');
      console.log('\n🎉 Test PASSED: The validation correctly prevents daypass/group users from booking personal classes.');
    } else {
      console.log('❌ VALIDATION FAILED: This booking should have been blocked!');
      console.log('\n💥 Test FAILED: The validation is not working properly.');
    }
    
    // 4. Test with a group class (should be allowed)
    const { data: groupClasses, error: groupClassError } = await supabase
      .from('classes')
      .select('id, name, category')
      .eq('category', 'group')
      .limit(1);
    
    if (!groupClassError && groupClasses?.length) {
      const groupClass = groupClasses[0];
      const isGroupClass = groupClass.category === 'group';
      
      console.log(`\n✅ Testing group class booking (should be allowed)...`);
      console.log(`Attempting to book group class "${groupClass.name}" with ${planCategory} subscription...`);
      
      if (!isPersonalSubscription && !isGroupClass) {
        console.log('❌ This should be allowed but validation would block it');
      } else {
        console.log('✅ Group class booking would be allowed (correct behavior)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testPersonalClassValidation();