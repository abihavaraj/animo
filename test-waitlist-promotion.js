/**
 * Test script for debugging waitlist promotion issues
 * Run this in the browser console or as a Node.js script
 */

// Test function to debug waitlist promotion
async function testWaitlistPromotion(classId) {
  console.log(`🧪 Testing waitlist promotion for class ${classId}`);
  
  try {
    // Import the booking service (adjust path as needed)
    const { bookingService } = require('./src/services/bookingService');
    
    // Run the debug method
    await bookingService.debugWaitlistPromotion(classId);
    
    console.log(`✅ Debug test completed for class ${classId}`);
  } catch (error) {
    console.error(`❌ Error during debug test:`, error);
  }
}

// Test function to manually trigger waitlist promotion
async function manualPromoteFromWaitlist(classId) {
  console.log(`🔧 Manually promoting from waitlist for class ${classId}`);
  
  try {
    const { bookingService } = require('./src/services/bookingService');
    const result = await bookingService.promoteFromWaitlist(classId);
    
    console.log(`🎯 Manual promotion result: ${result ? 'SUCCESS' : 'FAILED'}`);
    return result;
  } catch (error) {
    console.error(`❌ Error during manual promotion:`, error);
    return false;
  }
}

// Test function to check waitlist status
async function checkWaitlistStatus(classId) {
  console.log(`📋 Checking waitlist status for class ${classId}`);
  
  try {
    const { supabase } = require('./src/config/supabase.config');
    
    // Check waitlist entries
    const { data: waitlist, error } = await supabase
      .from('waitlist')
      .select(`
        id,
        user_id,
        position,
        created_at,
        users(name, email)
      `)
      .eq('class_id', classId)
      .order('position', { ascending: true });
    
    console.log(`📊 Waitlist status:`, {
      count: waitlist?.length || 0,
      entries: waitlist,
      error
    });
    
    return waitlist;
  } catch (error) {
    console.error(`❌ Error checking waitlist:`, error);
    return null;
  }
}

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testWaitlistPromotion,
    manualPromoteFromWaitlist,
    checkWaitlistStatus
  };
}

// Usage examples:
console.log(`
🧪 WAITLIST PROMOTION DEBUG SCRIPT

⚠️ ISSUES FOUND AND FIXED:
1. ❌ cancelClientBooking() - Admin/reception cancellations weren't triggering waitlist promotion
2. ❌ unassignClientFromClass() - Instructor cancellations weren't triggering waitlist promotion
3. ✅ cancelBooking() - Client self-cancellations were working correctly

Usage in browser console:
1. testWaitlistPromotion(123) - Full debug test for class ID 123
2. manualPromoteFromWaitlist(123) - Manually trigger promotion
3. checkWaitlistStatus(123) - Check current waitlist status

Look for these log messages:
🎯 [CANCEL] - Client self-cancellation process logs
🎯 [ADMIN_CANCEL] - Admin/reception cancellation logs  
🎯 [INSTRUCTOR_CANCEL] - Instructor cancellation logs
🚀 [WAITLIST] - Waitlist promotion start
📊 [WAITLIST] - Waitlist count check  
📭 [WAITLIST] - No users on waitlist
✅ [WAITLIST] - Time validation passed (2+ hours)
⏰ [WAITLIST] - Time validation failed (< 2 hours)
💰 [WAITLIST] - Credit deduction process
✅ SUCCESS - Operations completed
❌ FAILED - Operations failed
`);