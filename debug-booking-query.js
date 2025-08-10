// Debug script to test the failing booking query
// Run this in the browser console on your app to debug the 406 error

async function debugBookingQuery() {
  console.log('🔍 Testing booking query that\'s failing...');
  
  // The exact query from the error
  const userId = '0c6754c3-1c84-438a-8b56-f8a6a3f44fcc';
  const classId = '43158fc3-e9bb-4495-a96c-164d35dcbae4';
  
  try {
    // Test 1: Simple bookings query without filters
    console.log('Test 1: Basic bookings query');
    const response1 = await fetch('https://byhqueksdwlbiwodpbbd.supabase.co/rest/v1/bookings?select=id,status&limit=5', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjg1ODUsImV4cCI6MjA1MjgwNDU4NX0.OJPrAg10yN7JZCC1mSCAfH2HTQ_7v-UBfmX7T1hKwj8',
        'Authorization': 'Bearer ' + localStorage.getItem('supabase.auth.token'),
        'Content-Type': 'application/json'
      }
    });
    console.log('Test 1 status:', response1.status);
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('Test 1 success:', data1);
    } else {
      console.log('Test 1 failed:', await response1.text());
    }
    
    // Test 2: Query with user_id only
    console.log('Test 2: Query with user_id only');
    const response2 = await fetch(`https://byhqueksdwlbiwodpbbd.supabase.co/rest/v1/bookings?select=id,status&user_id=eq.${userId}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjg1ODUsImV4cCI6MjA1MjgwNDU4NX0.OJPrAg10yN7JZCC1mSCAfH2HTQ_7v-UBfmX7T1hKwj8',
        'Authorization': 'Bearer ' + localStorage.getItem('supabase.auth.token'),
        'Content-Type': 'application/json'
      }
    });
    console.log('Test 2 status:', response2.status);
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('Test 2 success:', data2);
    } else {
      console.log('Test 2 failed:', await response2.text());
    }
    
    // Test 3: Query with class_id only  
    console.log('Test 3: Query with class_id only');
    const response3 = await fetch(`https://byhqueksdwlbiwodpbbd.supabase.co/rest/v1/bookings?select=id,status&class_id=eq.${classId}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjg1ODUsImV4cCI6MjA1MjgwNDU4NX0.OJPrAg10yN7JZCC1mSCAfH2HTQ_7v-UBfmX7T1hKwj8',
        'Authorization': 'Bearer ' + localStorage.getItem('supabase.auth.token'),
        'Content-Type': 'application/json'
      }
    });
    console.log('Test 3 status:', response3.status);
    if (response3.ok) {
      const data3 = await response3.json();
      console.log('Test 3 success:', data3);
    } else {
      console.log('Test 3 failed:', await response3.text());
    }
    
    // Test 4: The failing query (both filters)
    console.log('Test 4: The failing query (both user_id AND class_id)');
    const response4 = await fetch(`https://byhqueksdwlbiwodpbbd.supabase.co/rest/v1/bookings?select=id,status&user_id=eq.${userId}&class_id=eq.${classId}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjg1ODUsImV4cCI6MjA1MjgwNDU4NX0.OJPrAg10yN7JZCC1mSCAfH2HTQ_7v-UBfmX7T1hKwj8',
        'Authorization': 'Bearer ' + localStorage.getItem('supabase.auth.token'),
        'Content-Type': 'application/json'
      }
    });
    console.log('Test 4 status:', response4.status);
    if (response4.ok) {
      const data4 = await response4.json();
      console.log('Test 4 success:', data4);
    } else {
      console.log('Test 4 failed:', await response4.text());
    }
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

// Run the debug function
debugBookingQuery();