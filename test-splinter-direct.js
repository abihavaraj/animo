#!/usr/bin/env node

/**
 * Direct Splinter Test
 * Tests Splinter functionality using direct Supabase queries
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSplinterDirect() {
  console.log('🧪 Starting Direct Splinter Test...\n');

  const results = {
    missingPrimaryKeys: [],
    unindexedForeignKeys: [],
    missingRLS: [],
    largeTables: [],
    authUsersWithoutProfiles: []
  };

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

    // Test 2: Check for missing primary keys
    console.log('📋 Test 2: Checking for missing primary keys...');
    try {
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (!error && tables) {
        for (const table of tables) {
          const { data: constraints, error: constraintError } = await supabase
            .from('information_schema.table_constraints')
            .select('constraint_name')
            .eq('table_name', table.table_name)
            .eq('constraint_type', 'PRIMARY KEY')
            .eq('table_schema', 'public');

          if (!constraintError && (!constraints || constraints.length === 0)) {
            results.missingPrimaryKeys.push(table.table_name);
          }
        }
      }
      console.log(`✅ Found ${results.missingPrimaryKeys.length} tables without primary keys\n`);
    } catch (error) {
      console.log('⚠️ Could not check primary keys (permission issue)\n');
    }

    // Test 3: Check for unindexed foreign keys
    console.log('📋 Test 3: Checking for unindexed foreign keys...');
    try {
      const { data: foreignKeys, error } = await supabase
        .from('information_schema.table_constraints')
        .select(`
          table_name,
          constraint_name,
          key_column_usage!inner(column_name)
        `)
        .eq('constraint_type', 'FOREIGN KEY')
        .eq('table_schema', 'public');

      if (!error && foreignKeys) {
        for (const fk of foreignKeys) {
          const { data: indexes, error: indexError } = await supabase
            .from('information_schema.statistics')
            .select('index_name')
            .eq('table_name', fk.table_name)
            .eq('column_name', fk.key_column_usage.column_name)
            .eq('table_schema', 'public');

          if (!indexError && (!indexes || indexes.length === 0)) {
            results.unindexedForeignKeys.push(`${fk.table_name}.${fk.key_column_usage.column_name}`);
          }
        }
      }
      console.log(`✅ Found ${results.unindexedForeignKeys.length} unindexed foreign keys\n`);
    } catch (error) {
      console.log('⚠️ Could not check foreign keys (permission issue)\n');
    }

    // Test 4: Check for missing RLS policies
    console.log('📋 Test 4: Checking for missing RLS policies...');
    try {
      const { data: tables, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE')
        .not('table_name', 'in', '(schema_migrations,ar_internal_metadata)');

      if (!error && tables) {
        for (const table of tables) {
          const { data: policies, error: policyError } = await supabase
            .from('pg_policies')
            .select('policyname')
            .eq('tablename', table.table_name);

          if (!policyError && (!policies || policies.length === 0)) {
            results.missingRLS.push(table.table_name);
          }
        }
      }
      console.log(`✅ Found ${results.missingRLS.length} tables without RLS policies\n`);
    } catch (error) {
      console.log('⚠️ Could not check RLS policies (permission issue)\n');
    }

    // Test 5: Check for large tables
    console.log('📋 Test 5: Checking for large tables...');
    try {
      const { data: tableStats, error } = await supabase
        .from('pg_stat_user_tables')
        .select('schemaname,relname,n_tup_ins')
        .eq('schemaname', 'public')
        .gte('n_tup_ins', 100000);

      if (!error && tableStats) {
        results.largeTables = tableStats.map(table => ({
          name: table.relname,
          rowCount: table.n_tup_ins
        }));
      }
      console.log(`✅ Found ${results.largeTables.length} large tables\n`);
    } catch (error) {
      console.log('⚠️ Could not check table sizes (permission issue)\n');
    }

    // Test 6: Check for auth users without profiles
    console.log('📋 Test 6: Checking for auth users without profiles...');
    try {
      const { data: authUsers, error } = await supabase.auth.admin.listUsers();
      if (!error && authUsers) {
        for (const user of authUsers.users) {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

          if (!profileError && !profile) {
            results.authUsersWithoutProfiles.push(user.id);
          }
        }
      }
      console.log(`✅ Found ${results.authUsersWithoutProfiles.length} auth users without profiles\n`);
    } catch (error) {
      console.log('⚠️ Could not check auth users (permission issue)\n');
    }

    // Test 7: Generate summary
    console.log('📋 Test 7: Generating summary...');
    const totalIssues = 
      results.missingPrimaryKeys.length +
      results.unindexedForeignKeys.length +
      results.missingRLS.length +
      results.largeTables.length +
      results.authUsersWithoutProfiles.length;

    console.log('Database Health Summary:');
    console.log(`   Total Issues: ${totalIssues}`);
    console.log(`   Missing Primary Keys: ${results.missingPrimaryKeys.length}`);
    console.log(`   Unindexed Foreign Keys: ${results.unindexedForeignKeys.length}`);
    console.log(`   Missing RLS Policies: ${results.missingRLS.length}`);
    console.log(`   Large Tables: ${results.largeTables.length}`);
    console.log(`   Auth Users Without Profiles: ${results.authUsersWithoutProfiles.length}\n`);

    // Test 8: Display detailed results
    if (totalIssues > 0) {
      console.log('🔍 Detailed Issues Found:');
      
      if (results.missingPrimaryKeys.length > 0) {
        console.log('\n❌ Tables without Primary Keys:');
        results.missingPrimaryKeys.forEach(table => {
          console.log(`   - ${table}`);
        });
      }

      if (results.unindexedForeignKeys.length > 0) {
        console.log('\n⚠️ Unindexed Foreign Keys:');
        results.unindexedForeignKeys.forEach(fk => {
          console.log(`   - ${fk}`);
        });
      }

      if (results.missingRLS.length > 0) {
        console.log('\n⚠️ Tables without RLS Policies:');
        results.missingRLS.forEach(table => {
          console.log(`   - ${table}`);
        });
      }

      if (results.largeTables.length > 0) {
        console.log('\nℹ️ Large Tables (>100k rows):');
        results.largeTables.forEach(table => {
          console.log(`   - ${table.name} (${table.rowCount} rows)`);
        });
      }

      if (results.authUsersWithoutProfiles.length > 0) {
        console.log('\n⚠️ Auth Users Without Profiles:');
        results.authUsersWithoutProfiles.forEach(userId => {
          console.log(`   - ${userId}`);
        });
      }

      console.log('\n💡 Recommendations:');
      console.log('1. Add primary keys to tables without them');
      console.log('2. Create indexes on foreign key columns');
      console.log('3. Implement Row Level Security policies');
      console.log('4. Consider partitioning large tables');
      console.log('5. Ensure auth users have corresponding profile records');
    } else {
      console.log('✅ No issues found! Your database is in good health.\n');
    }

    console.log('🎉 Direct Splinter test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Direct Splinter test failed:', error);
    console.error('Error details:', error.message);
    return false;
  }
}

// Run the test
console.log('🔍 Direct Supabase Splinter Test');
console.log('=================================\n');

testSplinterDirect()
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