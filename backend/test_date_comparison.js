const Database = require('./config/database');

async function testDateComparison() {
  try {
    console.log('🧪 Testing SQLite date comparison...');
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`Today: ${today}`);
    console.log(`Yesterday: ${yesterdayStr}`);
    
    const result = await Database.get(`
      SELECT 
        DATE('now') as today,
        ? as yesterday,
        DATE('now') >= ? as comparison,
        DATE('now') >= DATE('now') as today_vs_today
    `, [yesterdayStr, yesterdayStr]);
    
    console.log('SQLite Results:');
    console.log(`  Today (SQLite): ${result.today}`);
    console.log(`  Yesterday: ${result.yesterday}`);
    console.log(`  Today >= Yesterday: ${result.comparison}`);
    console.log(`  Today >= Today: ${result.today_vs_today}`);
    
    // Test with actual subscription dates
    const testResult = await Database.get(`
      SELECT 
        DATE('now') as today,
        '2024-01-15' as test_end_date,
        DATE('now') >= '2024-01-15' as is_expired,
        '2024-01-15' >= DATE('now') as is_active
    `);
    
    console.log('\nSubscription Date Test:');
    console.log(`  Today: ${testResult.today}`);
    console.log(`  Test End Date: ${testResult.test_end_date}`);
    console.log(`  Is Expired (today >= end_date): ${testResult.is_expired}`);
    console.log(`  Is Active (end_date >= today): ${testResult.is_active}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await Database.close();
  }
}

testDateComparison(); 