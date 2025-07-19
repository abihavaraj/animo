const http = require('http');

const API_BASE_URL = 'http://localhost:3001/api';

function makeRequest(method, endpoint, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testDeleteClass() {
  try {
    console.log('🧪 Testing delete class functionality for reception...');
    
    // First, let's check if the server is running
    console.log('🔍 Checking if server is running...');
    try {
      const healthResponse = await makeRequest('GET', '/health');
      console.log('✅ Server is running, health response:', healthResponse);
    } catch (error) {
      console.error('❌ Server is not running or not accessible:', error.message);
      return;
    }
    
    // First, let's login as a reception user
    console.log('🔑 Attempting login...');
    const loginData = await makeRequest('POST', '/auth/login', {
      email: 'reception@studio.com', // Adjust this to match your reception user
      password: 'password123'
    });

    console.log('🔑 Login response:', loginData);

    if (!loginData.success) {
      console.error('❌ Login failed:', loginData.message);
      return;
    }

    const token = loginData.token;
    console.log('✅ Login successful, token received');

    // Get a list of classes to find one to delete
    console.log('📋 Fetching classes...');
    const classesData = await makeRequest('GET', '/classes', null, token);
    console.log('📋 Classes response:', classesData);

    if (!classesData.success || !classesData.data || classesData.data.length === 0) {
      console.error('❌ No classes found to test deletion');
      return;
    }

    const classToDelete = classesData.data[0];
    console.log(`🎯 Testing delete for class: ${classToDelete.name} (ID: ${classToDelete.id})`);

    // Try to delete the class
    console.log('🗑️ Attempting to delete class...');
    const deleteData = await makeRequest('DELETE', `/classes/${classToDelete.id}`, null, token);
    console.log('🗑️ Delete response:', deleteData);

    if (deleteData.success) {
      console.log('✅ Delete class successful!');
    } else {
      console.error('❌ Delete class failed:', deleteData.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testDeleteClass(); 