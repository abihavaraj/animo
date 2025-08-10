const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLSOptimization() {
  console.log('🔍 Testing RLS Policy Optimization...\n');

  try {
    // Test 1: Check current RLS policies
    console.log('📋 Test 1: Checking current RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_schema', 'public');

    if (policiesError) {
      console.log('⚠️ Could not check policies:', policiesError.message);
    } else {
      console.log(`✅ Found ${policies.length} RLS policies`);
      
      // Check for multiple policies on same table
      const policyCounts = {};
      policies.forEach(policy => {
        const key = `${policy.table_schema}.${policy.table_name}`;
        policyCounts[key] = (policyCounts[key] || 0) + 1;
      });

      const multiplePolicies = Object.entries(policyCounts)
        .filter(([table, count]) => count > 1)
        .map(([table, count]) => ({ table, count }));

      if (multiplePolicies.length > 0) {
        console.log('⚠️ Tables with multiple policies:');
        multiplePolicies.forEach(({ table, count }) => {
          console.log(`   - ${table}: ${count} policies`);
        });
      } else {
        console.log('✅ No tables with multiple policies found');
      }
    }

    // Test 2: Check for auth.uid() usage in policies
    console.log('\n📋 Test 2: Checking for auth.uid() usage...');
    
    const { data: policyDefinitions, error: defError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public'
        `
      });

    if (defError) {
      console.log('⚠️ Could not check policy definitions (exec_sql not available)');
      console.log('   This is expected - we\'ll need to apply the optimization migration');
    } else {
      let authUidCount = 0;
      policyDefinitions.forEach(policy => {
        const definition = `${policy.qual || ''} ${policy.with_check || ''}`;
        if (definition.includes('auth.uid()')) {
          authUidCount++;
          console.log(`   - ${policy.tablename}.${policy.policyname}: uses auth.uid()`);
        }
      });
      
      if (authUidCount > 0) {
        console.log(`⚠️ Found ${authUidCount} policies using auth.uid()`);
      } else {
        console.log('✅ No policies using auth.uid() found');
      }
    }

    // Test 3: Check table sizes and performance
    console.log('\n📋 Test 3: Checking table sizes...');
    
    const { data: tableStats, error: statsError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes,
            n_live_tup as live_rows,
            n_dead_tup as dead_rows
          FROM pg_stat_user_tables 
          WHERE schemaname = 'public'
          ORDER BY n_live_tup DESC
        `
      });

    if (statsError) {
      console.log('⚠️ Could not check table statistics (exec_sql not available)');
    } else {
      console.log('📊 Table Statistics:');
      tableStats.forEach(table => {
        console.log(`   - ${table.tablename}: ${table.live_rows} rows`);
      });
    }

    // Test 4: Check indexes
    console.log('\n📋 Test 4: Checking indexes...');
    
    const { data: indexes, error: indexError } = await supabase
      .from('information_schema.indexes')
      .select('*')
      .eq('table_schema', 'public');

    if (indexError) {
      console.log('⚠️ Could not check indexes:', indexError.message);
    } else {
      const indexCounts = {};
      indexes.forEach(index => {
        const key = `${index.table_schema}.${index.table_name}`;
        indexCounts[key] = (indexCounts[key] || 0) + 1;
      });

      console.log('📊 Index Statistics:');
      Object.entries(indexCounts).forEach(([table, count]) => {
        console.log(`   - ${table}: ${count} indexes`);
      });
    }

    console.log('\n✅ RLS Optimization Test Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Apply the optimization migration: supabase/migrations/006_optimize_rls_policies.sql');
    console.log('2. Test the application functionality after migration');
    console.log('3. Monitor performance improvements in Supabase dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRLSOptimization(); 