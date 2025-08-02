/**
 * SUBSCRIPTION DATE CALCULATION TEST SCRIPT
 * 
 * This script tests the SimpleDateCalculator to verify that:
 * - 1 day subscription ends on the same day
 * - 1 month subscription ends after exactly 1 month
 * - 3, 6 month subscriptions end after exactly that many months
 * - 1 year subscription ends after exactly 1 year
 */

// SimpleDateCalculator implementation (copied from src/utils/simpleDateCalculator.ts)
class SimpleDateCalculator {
  
  /**
   * Calculate subscription end date - SIMPLE!
   * @param startDate - Start date (defaults to today)
   * @param duration - Simple integer duration (1, 7, 12, etc)
   * @param unit - 'days', 'months', or 'years'
   * @returns End date in YYYY-MM-DD format
   */
  static calculateEndDate(startDate = null, duration = 1, unit = 'months') {
    try {
      // Get start date
      const start = startDate ? new Date(startDate) : new Date();
      
      // Create end date
      const endDate = new Date(start);
      
      // Simple switch - no confusing math!
      switch(unit) {
        case 'days':
          // For days: add (duration - 1) so 1-day subscription = same day
          endDate.setDate(start.getDate() + duration - 1);
          break;
        case 'months':
          // For months: use proper calendar months with smart date handling
          const targetMonth = start.getMonth() + duration;
          const monthTargetYear = start.getFullYear() + Math.floor(targetMonth / 12);
          const finalMonth = targetMonth % 12;
          
          endDate.setFullYear(monthTargetYear);
          endDate.setMonth(finalMonth);
          
          // Handle month-end edge cases (e.g., Jan 31 + 1 month should be Feb 28, not Mar 3)
          if (endDate.getMonth() !== finalMonth) {
            // This happens when target month has fewer days (e.g., Feb 29/30/31 doesn't exist)
            // Set to last day of target month
            endDate.setDate(0); // Go to last day of previous month (which is our target month)
          }
          break;
        case 'years':
          // For years: use proper calendar years with leap year handling
          const targetYear = start.getFullYear() + duration;
          
          // Handle Feb 29 leap year edge case BEFORE setting the year
          if (start.getMonth() === 1 && start.getDate() === 29) {
            // Check if target year is a leap year
            const isTargetLeapYear = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
            if (!isTargetLeapYear) {
              // Target year is not a leap year, so Feb 29 becomes Feb 28
              endDate.setDate(28);
            }
          }
          
          endDate.setFullYear(targetYear);
          break;
        default:
          throw new Error(`Invalid duration unit: ${unit}. Use 'days', 'months', or 'years'`);
      }
      
      // Return as YYYY-MM-DD string
      return this.toStorageFormat(endDate);
      
    } catch (error) {
      console.error('❌ SimpleDateCalculator.calculateEndDate error:', error);
      throw new Error(`Invalid date calculation: ${error.message}`);
    }
  }
  
  /**
   * Convert date to storage format
   * @param date - Input date
   * @returns Date in YYYY-MM-DD format
   */
  static toStorageFormat(date) {
    try {
      const d = new Date(date);
      return d.getFullYear() + '-' + 
             String(d.getMonth() + 1).padStart(2, '0') + '-' + 
             String(d.getDate()).padStart(2, '0');
    } catch (error) {
      console.error('❌ SimpleDateCalculator.toStorageFormat error:', error);
      throw new Error(`Invalid date format: ${error.message}`);
    }
  }
}

console.log('🧪 SUBSCRIPTION DATE CALCULATION TESTS');
console.log('=' .repeat(60));

/**
 * Test helper function
 */
function testSubscriptionDuration(startDate, duration, unit, expectedBehavior) {
  try {
    const start = new Date(startDate);
    const endDate = SimpleDateCalculator.calculateEndDate(start, duration, unit);
    const endDateObj = new Date(endDate);
    
    console.log(`\n📅 Testing: ${duration} ${unit}`);
    console.log(`   Start Date: ${start.toDateString()} (${start.toISOString().split('T')[0]})`);
    console.log(`   End Date:   ${endDateObj.toDateString()} (${endDate})`);
    console.log(`   Expected:   ${expectedBehavior}`);
    
    return {
      duration,
      unit,
      startDate: start.toISOString().split('T')[0],
      endDate,
      endDateObj,
      pass: true
    };
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return {
      duration,
      unit,
      startDate,
      endDate: null,
      error: error.message,
      pass: false
    };
  }
}

/**
 * Verify specific date calculations
 */
function verifyDateCalculation(startDate, duration, unit, expectedEndDate, description) {
  const result = testSubscriptionDuration(startDate, duration, unit, description);
  
  if (result.pass && result.endDate === expectedEndDate) {
    console.log(`   ✅ PASS: Calculated end date matches expected`);
    return true;
  } else if (result.pass) {
    console.log(`   ❌ FAIL: Expected ${expectedEndDate}, got ${result.endDate}`);
    return false;
  } else {
    console.log(`   ❌ FAIL: Calculation error`);
    return false;
  }
}

// Test cases
const testCases = [
  // DAY TESTS
  {
    start: '2025-07-30',
    duration: 1,
    unit: 'days',
    expected: '2025-07-30',
    description: '1 day subscription should end same day'
  },
  {
    start: '2025-07-15',
    duration: 7,
    unit: 'days',
    expected: '2025-07-21',
    description: '7 day subscription should end after 6 days (inclusive)'
  },
  
  // MONTH TESTS
  {
    start: '2025-07-30',
    duration: 1,
    unit: 'months',
    expected: '2025-08-30',
    description: '1 month from July 30 should end August 30'
  },
  {
    start: '2025-01-31',
    duration: 1,
    unit: 'months',
    expected: '2025-02-28',
    description: '1 month from Jan 31 should end Feb 28 (non-leap year)'
  },
  {
    start: '2025-01-15',
    duration: 3,
    unit: 'months',
    expected: '2025-04-15',
    description: '3 months from Jan 15 should end April 15'
  },
  {
    start: '2025-01-01',
    duration: 6,
    unit: 'months',
    expected: '2025-07-01',
    description: '6 months from Jan 1 should end July 1'
  },
  {
    start: '2025-12-15',
    duration: 6,
    unit: 'months',
    expected: '2026-06-15',
    description: '6 months from Dec 15 should end June 15 next year'
  },
  
  // YEAR TESTS
  {
    start: '2025-07-30',
    duration: 1,
    unit: 'years',
    expected: '2026-07-30',
    description: '1 year from July 30, 2025 should end July 30, 2026'
  },
  {
    start: '2024-02-29',
    duration: 1,
    unit: 'years',
    expected: '2025-02-28',
    description: '1 year from Feb 29 (leap year) should end Feb 28 (non-leap year)'
  }
];

// Run all tests
console.log('\n🔬 RUNNING ALL TEST CASES');
console.log('=' .repeat(60));

let passCount = 0;
let totalTests = testCases.length;

testCases.forEach((test, index) => {
  console.log(`\n[${index + 1}/${totalTests}] ${test.description}`);
  const passed = verifyDateCalculation(
    test.start,
    test.duration,
    test.unit,
    test.expected,
    test.description
  );
  
  if (passed) {
    passCount++;
  }
});

// Summary
console.log('\n📊 TEST SUMMARY');
console.log('=' .repeat(60));
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${totalTests - passCount}`);

if (passCount === totalTests) {
  console.log('\n🎉 ALL TESTS PASSED! Subscription date calculations are working correctly.');
} else {
  console.log('\n⚠️  SOME TESTS FAILED! Please review the SimpleDateCalculator implementation.');
}

// Additional edge case tests
console.log('\n🔍 EDGE CASE TESTS');
console.log('=' .repeat(60));

// Test month-end edge cases
const edgeCases = [
  { start: '2025-01-31', duration: 1, unit: 'months', desc: 'Jan 31 + 1 month (Feb has fewer days)' },
  { start: '2025-03-31', duration: 1, unit: 'months', desc: 'Mar 31 + 1 month (Apr has 30 days)' },
  { start: '2025-05-31', duration: 1, unit: 'months', desc: 'May 31 + 1 month (Jun has 30 days)' },
  { start: '2024-02-29', duration: 12, unit: 'months', desc: 'Leap year Feb 29 + 12 months' }
];

edgeCases.forEach(test => {
  console.log(`\n📝 ${test.desc}:`);
  testSubscriptionDuration(test.start, test.duration, test.unit, 'Check JavaScript date handling');
});

console.log('\n✅ Test script completed!');