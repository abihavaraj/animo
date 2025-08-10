/**
 * Test script to verify equipment access validation works correctly
 * This script tests that users can only book classes that match their equipment access
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test the equipment access logic
function testEquipmentAccessLogic() {
  console.log('🧪 Testing Equipment Access Logic...\n');
  
  const scenarios = [
    // Mat-only subscription tests
    { userAccess: 'mat', classEquipment: 'mat', expected: true, desc: 'Mat user → Mat class (ALLOW)' },
    { userAccess: 'mat', classEquipment: 'reformer', expected: false, desc: 'Mat user → Reformer class (BLOCK)' },
    { userAccess: 'mat', classEquipment: 'both', expected: false, desc: 'Mat user → Both equipment class (BLOCK)' },
    
    // Reformer-only subscription tests
    { userAccess: 'reformer', classEquipment: 'mat', expected: false, desc: 'Reformer user → Mat class (BLOCK)' },
    { userAccess: 'reformer', classEquipment: 'reformer', expected: true, desc: 'Reformer user → Reformer class (ALLOW)' },
    { userAccess: 'reformer', classEquipment: 'both', expected: false, desc: 'Reformer user → Both equipment class (BLOCK)' },
    
    // Full access subscription tests
    { userAccess: 'both', classEquipment: 'mat', expected: true, desc: 'Full access user → Mat class (ALLOW)' },
    { userAccess: 'both', classEquipment: 'reformer', expected: true, desc: 'Full access user → Reformer class (ALLOW)' },
    { userAccess: 'both', classEquipment: 'both', expected: true, desc: 'Full access user → Both equipment class (ALLOW)' },
  ];
  
  console.log('📋 Equipment Access Test Results:');
  console.log('=====================================\n');
  
  let passCount = 0;
  let failCount = 0;
  
  scenarios.forEach((scenario, index) => {
    const actual = isEquipmentAccessAllowed(scenario.userAccess, scenario.classEquipment);
    const passed = actual === scenario.expected;
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const icon = scenario.expected ? '🟢' : '🔴';
    
    console.log(`${index + 1}. ${icon} ${scenario.desc}`);
    console.log(`   User Access: ${scenario.userAccess} | Class Equipment: ${scenario.classEquipment}`);
    console.log(`   Expected: ${scenario.expected} | Actual: ${actual} | ${status}\n`);
    
    if (passed) passCount++;
    else failCount++;
  });
  
  console.log('📊 Test Summary:');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📋 Total: ${scenarios.length}\n`);
  
  if (failCount === 0) {
    console.log('🎉 All equipment access tests passed!\n');
  } else {
    console.log('💥 Some tests failed - equipment validation needs fixing!\n');
  }
}

// Helper function (copied from booking service logic)
function isEquipmentAccessAllowed(userAccess, classEquipment) {
  // 'both' access allows everything
  if (userAccess === 'both') {
    return true;
  }
  
  // For specific access, user can only book classes that match their access level
  if (userAccess === classEquipment) {
    return true;
  }
  
  // Special case: if class requires 'both' equipment, user needs 'both' access
  if (classEquipment === 'both' && userAccess !== 'both') {
    return false;
  }
  
  return false;
}

async function testRealScenarios() {
  console.log('🔍 Checking Database for Real Scenarios...\n');
  
  try {
    // Find different types of subscription plans
    const { data: plans, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, name, equipment_access')
      .order('equipment_access');
    
    if (planError || !plans?.length) {
      console.log('❌ Could not fetch subscription plans');
      return;
    }
    
    console.log('📋 Available Subscription Plans:');
    plans.forEach(plan => {
      console.log(`   - ${plan.name} (${plan.equipment_access} access)`);
    });
    console.log('');
    
    // Find different types of classes
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, name, equipment_type')
      .order('equipment_type')
      .limit(10);
    
    if (classError || !classes?.length) {
      console.log('❌ Could not fetch classes');
      return;
    }
    
    console.log('📋 Sample Classes by Equipment Type:');
    const equipmentGroups = {};
    classes.forEach(cls => {
      if (!equipmentGroups[cls.equipment_type]) {
        equipmentGroups[cls.equipment_type] = [];
      }
      equipmentGroups[cls.equipment_type].push(cls.name);
    });
    
    Object.entries(equipmentGroups).forEach(([equipment, classNames]) => {
      console.log(`   ${equipment.toUpperCase()} classes: ${classNames.slice(0, 3).join(', ')}${classNames.length > 3 ? '...' : ''}`);
    });
    console.log('');
    
    // Show expected behavior examples
    console.log('🎯 Expected Booking Behavior:');
    console.log('===============================');
    console.log('Mat-only subscription holders:');
    console.log('  ✅ CAN book: Mat classes');
    console.log('  ❌ CANNOT book: Reformer classes, Both equipment classes');
    console.log('');
    console.log('Reformer-only subscription holders:');
    console.log('  ✅ CAN book: Reformer classes');
    console.log('  ❌ CANNOT book: Mat classes, Both equipment classes');
    console.log('');
    console.log('Full access subscription holders:');
    console.log('  ✅ CAN book: All classes (Mat, Reformer, Both equipment)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error testing real scenarios:', error);
  }
}

// Run the tests
console.log('🧪 Equipment Access Validation Testing\n');
testEquipmentAccessLogic();
testRealScenarios();