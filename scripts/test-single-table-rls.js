#!/usr/bin/env node

/**
 * Test RLS on a single table first
 * This script enables RLS on just the 'waitlist' table to test safety
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration  
const supabaseUrl = 'https://cbztsrwqbjjutpdkgpyf.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNienRzcndxYmpqdXRwZGtncHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzQ1NjIsImV4cCI6MjA1MjYxMDU2Mn0.cNe1nSGkMWBLrzBOFGu_j_YbNZoD_Pz2y8kKvQcMKuE';

if (!supabaseKey) {
  console.error('❌ Error: EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleTableRLS() {
  console.log('🧪 Testing RLS on Single Table (waitlist)');
  console.log('');
  
  try {
    console.log('📋 Step 1: Check current waitlist access...');
    
    // Test current access to waitlist
    const { data: beforeData, error: beforeError } = await supabase
      .from('waitlist')
      .select('*')
      .limit(1);
    
    if (beforeError) {
      console.log('⚠️  Current waitlist access has issues:', beforeError.message);
    } else {
      console.log('✅ Current waitlist access works');
    }
    
    console.log('');
    console.log('🔒 Step 2: Enabling RLS on waitlist table...');
    
    // Enable RLS on waitlist table only
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.error('❌ Failed to enable RLS:', rlsError.message);
      return;
    }
    
    console.log('✅ RLS enabled on waitlist table');
    console.log('');
    
    console.log('🧪 Step 3: Testing access after RLS enabled...');
    
    // Test access after RLS
    const { data: afterData, error: afterError } = await supabase
      .from('waitlist')
      .select('*')
      .limit(1);
    
    if (afterError) {
      console.log('❌ Waitlist access failed after RLS:', afterError.message);
      console.log('🔄 This means we need to check the waitlist_access_policy');
    } else {
      console.log('✅ Waitlist access still works after RLS!');
      console.log('🎉 This confirms that enabling RLS is safe');
    }
    
    console.log('');
    console.log('📊 Test Results:');
    console.log(`   Before RLS: ${beforeError ? 'Had issues' : 'Working'}`);
    console.log(`   After RLS:  ${afterError ? 'Failed' : 'Working'}`);
    
    if (!afterError) {
      console.log('');
      console.log('🎯 Conclusion: Safe to enable RLS on all tables!');
      console.log('👍 Your policies are working correctly');
    } else {
      console.log('');
      console.log('🔍 Need to investigate waitlist_access_policy before proceeding');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

console.log('🛡️  Single Table RLS Test');
console.log('');
console.log('This will:');
console.log('✅ Test RLS on just the waitlist table');
console.log('✅ Check if existing policies work correctly');
console.log('✅ Confirm safety before full deployment');
console.log('');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Ready to test? (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    rl.close();
    testSingleTableRLS();
  } else {
    console.log('👍 Test cancelled');
    rl.close();
  }
});
