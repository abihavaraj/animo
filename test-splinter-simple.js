#!/usr/bin/env node

/**
 * Simple Splinter Test
 * Tests the Splinter SQL queries directly against Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration (using the same config as your app)
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simplified Splinter SQL query for testing
const SIMPLE_SPLINTER_SQL = `
-- Simple Splinter test queries
WITH lint_results AS (
  -- Check for missing primary keys
  SELECT 
    'missing_primary_keys' as name,
    'Missing Primary Keys' as title,
    'ERROR' as level,
    ARRAY['SECURITY'] as categories,
    'Tables should have primary keys for data integrity' as description,
    t.table_name as detail,
    'https://supabase.com/docs/guides/database/design#primary-keys' as remediation
  FROM information_schema.tables t
  LEFT JOIN information_schema.table_constraints tc 
    ON tc.table_name = t.table_name
    AND tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = t.table_schema
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND tc.constraint_name IS NULL
  
  UNION ALL
  
  -- Check for unindexed foreign keys
  SELECT 
    'unindexed_foreign_keys' as name,
    'Unindexed Foreign Keys' as title,
    'WARN' as level,
    ARRAY['PERFORMANCE'] as categories,
    'Foreign key columns should be indexed for better join performance' as description,
    tc.table_name || '.' || kcu.column_name as detail,
    'https://supabase.com/docs/guides/database/performance#indexes' as remediation
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  LEFT JOIN information_schema.statistics s 
    ON s.table_name = tc.table_name
    AND s.column_name = kcu.column_name
    AND s.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND s.index_name IS NULL
  
  UNION ALL
  
  -- Check for missing RLS policies
  SELECT 
    'missing_rls' as name,
    'Missing Row Level Security' as title,
    'WARN' as level,
    ARRAY['SECURITY'] as categories,
    'Tables should have Row Level Security policies' as description,
    t.table_name as detail,
    'https://supabase.com/docs/guides/auth/row-level-security' as remediation
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('schema_migrations', 'ar_internal_metadata')
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = t.table_name
    )
)

SELECT * FROM lint_results ORDER BY level DESC, name;
`;

async function testSplinterSimple() {
  console.log('🧪 Starting Simple Splinter Test...\n');

  try {
    // Test 1: Check Supabase connection
    console.log('📋 Test 1: Checking Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      return false;
    }
    console.log('✅ Supabase connection successful\n');

    // Test 2: Run Splinter SQL
    console.log('📋 Test 2: Running Splinter SQL query...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: SIMPLE_SPLINTER_SQL
    });

    if (error) {
      console.error('❌ Splinter SQL execution failed:', error.message);
      console.error('This might be because:');
      console.error('1. The exec_sql function is not available');
      console.error('2. You need to enable the pg_net extension');
      console.error('3. You need proper permissions');
      return false;
    }

    console.log('✅ Splinter SQL executed successfully');
    console.log(`   Found ${data?.length || 0} issues\n`);

    // Test 3: Analyze results
    console.log('📋 Test 3: Analyzing results...');
    if (data && data.length > 0) {
      console.log('🔍 Issues found:');
      data.forEach((lint, index) => {
        const levelEmoji = lint.level === 'ERROR' ? '❌' : '⚠️';
        const categoryEmoji = lint.categories.includes('SECURITY') ? '🔒' : '⚡';
        console.log(`   ${index + 1}. ${levelEmoji} ${categoryEmoji} ${lint.title}`);
        console.log(`      Table: ${lint.detail}`);
        console.log(`      ${lint.description}`);
        if (lint.remediation) {
          console.log(`      💡 Solution: ${lint.remediation}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No issues found! Your database looks good.\n');
    }

    // Test 4: Summary
    console.log('📋 Test 4: Generating summary...');
    const errors = data?.filter(lint => lint.level === 'ERROR').length || 0;
    const warnings = data?.filter(lint => lint.level === 'WARN').length || 0;
    const security = data?.filter(lint => lint.categories.includes('SECURITY')).length || 0;
    const performance = data?.filter(lint => lint.categories.includes('PERFORMANCE')).length || 0;

    console.log('Database Health Summary:');
    console.log(`   Total Issues: ${data?.length || 0}`);
    console.log(`   Critical Issues (ERROR): ${errors}`);
    console.log(`   Important Issues (WARN): ${warnings}`);
    console.log(`   Security Concerns: ${security}`);
    console.log(`   Performance Issues: ${performance}\n`);

    console.log('🎉 Simple Splinter test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Simple Splinter test failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Run the test
console.log('🔍 Simple Supabase Splinter Test');
console.log('=================================\n');

testSplinterSimple()
  .then(success => {
    if (success) {
      console.log('\n✅ Test PASSED');
      console.log('🎉 Splinter integration is working!');
      console.log('\nNext steps:');
      console.log('1. Add the SplinterDashboard to your admin interface');
      console.log('2. Address any issues found above');
      console.log('3. Set up regular database health monitoring');
      process.exit(0);
    } else {
      console.log('\n❌ Test FAILED');
      console.log('Please check the error messages above');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  }); 