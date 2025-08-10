#!/usr/bin/env node

/**
 * Splinter Test Runner
 * Run this script to test the Splinter integration with your Supabase database
 */

const { testSplinter } = require('./src/services/testSplinter');

console.log('🔍 Supabase Splinter Integration Test');
console.log('=====================================\n');

// Check if we're in the right environment
if (typeof window !== 'undefined') {
  console.error('❌ This test must be run in a Node.js environment, not in the browser');
  process.exit(1);
}

// Run the tests
testSplinter()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests PASSED');
      console.log('🎉 Splinter integration is working correctly!');
      console.log('\nNext steps:');
      console.log('1. Add the SplinterDashboard component to your admin interface');
      console.log('2. Run regular database health checks');
      console.log('3. Address any issues found by the linter');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests FAILED');
      console.log('Please check the error messages above and fix any issues');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test runner crashed:', error);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check your Supabase configuration');
    console.error('2. Verify your database connection');
    console.error('3. Ensure you have the necessary permissions');
    process.exit(1);
  }); 