import SplinterService from './splinterService';

/**
 * Test script for Splinter service
 * This will test the Splinter integration with your Supabase database
 */
async function testSplinter() {
  console.log('🧪 Starting Splinter Service Tests...\n');

  try {
    // Test 1: Basic lint execution
    console.log('📋 Test 1: Running basic lints...');
    const report = await SplinterService.runLints();
    console.log('✅ Basic lints executed successfully');
    console.log(`   Found ${report.summary.total} issues`);
    console.log(`   Errors: ${report.summary.errors}, Warnings: ${report.summary.warnings}, Info: ${report.summary.info}`);
    console.log(`   Security: ${report.summary.security}, Performance: ${report.summary.performance}\n`);

    // Test 2: Generate formatted report
    console.log('📋 Test 2: Generating formatted report...');
    const formattedReport = await SplinterService.generateReport();
    console.log('✅ Formatted report generated successfully');
    console.log('Report preview:');
    console.log(formattedReport.substring(0, 500) + '...\n');

    // Test 3: Get lints by category
    console.log('📋 Test 3: Testing category filters...');
    const securityLints = await SplinterService.getLintsByCategory('SECURITY');
    const performanceLints = await SplinterService.getLintsByCategory('PERFORMANCE');
    console.log(`✅ Security lints: ${securityLints.length}`);
    console.log(`✅ Performance lints: ${performanceLints.length}\n`);

    // Test 4: Get lints by level
    console.log('📋 Test 4: Testing level filters...');
    const errorLints = await SplinterService.getLintsByLevel('ERROR');
    const warningLints = await SplinterService.getLintsByLevel('WARN');
    const infoLints = await SplinterService.getLintsByLevel('INFO');
    console.log(`✅ Error lints: ${errorLints.length}`);
    console.log(`✅ Warning lints: ${warningLints.length}`);
    console.log(`✅ Info lints: ${infoLints.length}\n`);

    // Test 5: Format individual lint
    if (report.lints.length > 0) {
      console.log('📋 Test 5: Testing lint formatting...');
      const firstLint = report.lints[0];
      const formattedLint = SplinterService.formatLint(firstLint);
      console.log('✅ Lint formatting test:');
      console.log(formattedLint.substring(0, 200) + '...\n');
    }

    // Test 6: Detailed analysis
    console.log('📋 Test 6: Detailed analysis...');
    console.log('Database Health Summary:');
    console.log(`   Total Issues: ${report.summary.total}`);
    console.log(`   Critical Issues (ERROR): ${report.summary.errors}`);
    console.log(`   Important Issues (WARN): ${report.summary.warnings}`);
    console.log(`   Informational Issues (INFO): ${report.summary.info}`);
    console.log(`   Security Concerns: ${report.summary.security}`);
    console.log(`   Performance Issues: ${report.summary.performance}\n`);

    if (report.lints.length > 0) {
      console.log('🔍 Detailed Issues Found:');
      report.lints.forEach((lint, index) => {
        const levelEmoji = lint.level === 'ERROR' ? '❌' : lint.level === 'WARN' ? '⚠️' : 'ℹ️';
        const categoryEmoji = lint.categories.includes('SECURITY') ? '🔒' : '⚡';
        console.log(`   ${index + 1}. ${levelEmoji} ${categoryEmoji} ${lint.title}`);
        console.log(`      ${lint.description}`);
        if (lint.remediation) {
          console.log(`      💡 Solution: ${lint.remediation}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No issues found! Your database is in good health.\n');
    }

    console.log('🎉 All Splinter tests completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Splinter test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testSplinter()
    .then(success => {
      if (success) {
        console.log('\n✅ Splinter integration test PASSED');
        process.exit(0);
      } else {
        console.log('\n❌ Splinter integration test FAILED');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Splinter test crashed:', error);
      process.exit(1);
    });
}

export { testSplinter }; 