/**
 * Test Supabase Connection Script
 * 
 * This script verifies that your Supabase instance is reachable
 * and configured correctly.
 * 
 * Run with: node scripts/test-supabase-connection.js
 */

const https = require('https');

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byhqueksdwlbiwodpbbd.supabase.co';
const BAR_SUPABASE_URL = process.env.EXPO_PUBLIC_BAR_SUPABASE_URL || 'https://grfyzitojijoptyqhujs.supabase.co';

console.log('\n🔍 Testing Supabase Connections...\n');

/**
 * Test a Supabase instance
 */
function testSupabaseConnection(name, url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    https.get(`${url}/rest/v1/`, {
      headers: {
        'apikey': 'test' // Just testing connectivity, not actual auth
      }
    }, (res) => {
      const duration = Date.now() - startTime;
      
      // 200 or 401 both mean the server is reachable
      // 401 is expected without proper auth
      if (res.statusCode === 200 || res.statusCode === 401) {
        console.log(`✅ ${name}: Connected (${duration}ms)`);
        console.log(`   URL: ${url}`);
        resolve(true);
      } else {
        console.warn(`⚠️  ${name}: Unexpected status ${res.statusCode} (${duration}ms)`);
        console.log(`   URL: ${url}`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.error(`❌ ${name}: Connection failed`);
      console.error(`   URL: ${url}`);
      console.error(`   Error: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  const results = [];
  
  // Test main Pilates Studio database
  results.push(await testSupabaseConnection('Pilates Studio DB', SUPABASE_URL));
  
  // Test bar database
  results.push(await testSupabaseConnection('Bar Management DB', BAR_SUPABASE_URL));
  
  // Summary
  console.log('\n' + '─'.repeat(50));
  const successCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    console.log(`✅ All ${totalCount} Supabase instances are reachable!\n`);
    process.exit(0);
  } else {
    console.log(`⚠️  ${successCount}/${totalCount} Supabase instances reachable\n`);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('❌ Test script error:', err);
  process.exit(1);
});


