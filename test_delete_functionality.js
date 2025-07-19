const fetch = require('node-fetch');

// Test the delete user functionality
async function testDeleteUser() {
  try {
    console.log('🧪 Testing delete user functionality...');
    
    // First, let's test if the server is running
    const healthCheck = await fetch('http://localhost:3001/api/health');
    console.log('✅ Server is running');
    
    // Test delete endpoint (this will fail due to auth, but we can see the response)
    const deleteResponse = await fetch('http://localhost:3001/api/users/999', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const deleteData = await deleteResponse.json();
    console.log('🗑️ Delete test response:', deleteData);
    console.log('🗑️ Delete test status:', deleteResponse.status);
    
    if (deleteResponse.status === 401) {
      console.log('✅ Delete endpoint exists but requires authentication (expected)');
    } else if (deleteResponse.status === 404) {
      console.log('✅ Delete endpoint exists but user not found (expected)');
    } else {
      console.log('❓ Unexpected response:', deleteResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeleteUser(); 