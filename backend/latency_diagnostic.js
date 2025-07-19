const axios = require('axios');
const fs = require('fs');

// Configuration
const BACKEND_URL = 'https://animo-pilates-backend.fly.dev';
const FRONTEND_URL = 'https://animo-pilates-studio.vercel.app';

// Test data
const testCredentials = {
  email: 'admin@pilatesstudio.com',
  password: 'password123'
};

class LatencyDiagnostic {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testEndpoint(endpoint, method = 'GET', data = null, description = '') {
    const startTime = Date.now();
    try {
      const config = {
        method,
        url: `${BACKEND_URL}${endpoint}`,
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LatencyDiagnostic/1.0'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      const endTime = Date.now();
      const latency = endTime - startTime;

      const result = {
        endpoint,
        method,
        description,
        latency,
        status: response.status,
        success: response.status >= 200 && response.status < 300,
        timestamp: new Date().toISOString(),
        data: response.data
      };

      this.results.push(result);
      await this.log(`${description || endpoint}: ${latency}ms (${response.status})`, result.success ? 'success' : 'warning');
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      const result = {
        endpoint,
        method,
        description,
        latency,
        status: error.response?.status || 'ERROR',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      await this.log(`${description || endpoint}: ${latency}ms - ERROR: ${error.message}`, 'error');
      
      return result;
    }
  }

  async runDiagnostics() {
    await this.log('🚀 Starting Fly.io Backend Latency Diagnostics', 'info');
    await this.log(`Backend URL: ${BACKEND_URL}`, 'info');
    await this.log(`Frontend URL: ${FRONTEND_URL}`, 'info');

    // Test 1: Health Check
    await this.log('\n📊 Test 1: Health Check', 'info');
    const healthResult = await this.testEndpoint('/health', 'GET', null, 'Health Check');

    // Test 2: Login Endpoint
    await this.log('\n📊 Test 2: Login Endpoint', 'info');
    const loginResult = await this.testEndpoint('/api/auth/login', 'POST', testCredentials, 'Login API');

    // Test 3: Database Connection Test
    await this.log('\n📊 Test 3: Database Operations', 'info');
    if (loginResult.success && loginResult.data?.data?.token) {
      const token = loginResult.data.data.token;
      await this.testEndpoint('/api/auth/me', 'GET', null, 'User Profile (with auth)');
    }

    // Test 4: Cold Start Simulation
    await this.log('\n⏰ Test 4: Cold Start Test', 'info');
    await this.log('Waiting 30 seconds to simulate cold start...', 'info');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await this.testEndpoint('/health', 'GET', null, 'Health Check (after cold start)');

    // Test 5: Multiple Concurrent Requests
    await this.log('\n🔄 Test 5: Concurrent Requests', 'info');
    const concurrentTests = Array(5).fill().map((_, i) => 
      this.testEndpoint('/health', 'GET', null, `Concurrent Test ${i + 1}`)
    );
    await Promise.all(concurrentTests);

    // Generate Report
    await this.generateReport();
  }

  async generateReport() {
    const totalTime = Date.now() - this.startTime;
    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    const avgLatency = successfulTests.length > 0 
      ? successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length 
      : 0;

    const maxLatency = Math.max(...this.results.map(r => r.latency));
    const minLatency = Math.min(...this.results.map(r => r.latency));

    await this.log('\n📋 DIAGNOSTIC REPORT', 'info');
    await this.log('='.repeat(50), 'info');
    await this.log(`Total Tests: ${this.results.length}`, 'info');
    await this.log(`Successful: ${successfulTests.length}`, 'success');
    await this.log(`Failed: ${failedTests.length}`, failedTests.length > 0 ? 'warning' : 'success');
    await this.log(`Average Latency: ${avgLatency.toFixed(2)}ms`, 'info');
    await this.log(`Min Latency: ${minLatency}ms`, 'info');
    await this.log(`Max Latency: ${maxLatency}ms`, 'info');
    await this.log(`Total Time: ${totalTime}ms`, 'info');

    // Identify issues
    const slowTests = this.results.filter(r => r.latency > 5000);
    if (slowTests.length > 0) {
      await this.log('\n🐌 SLOW TESTS (>5s):', 'warning');
      for (const test of slowTests) {
        await this.log(`  - ${test.description}: ${test.latency}ms`, 'warning');
      }
    }

    // Recommendations
    await this.log('\n💡 RECOMMENDATIONS:', 'info');
    if (avgLatency > 3000) {
      await this.log('  - High average latency detected (>3s)', 'warning');
      await this.log('  - Consider upgrading Fly.io machine size', 'info');
      await this.log('  - Enable min_machines_running = 1', 'info');
    }
    
    if (maxLatency > 10000) {
      await this.log('  - Very slow responses detected (>10s)', 'warning');
      await this.log('  - This indicates cold start issues', 'warning');
      await this.log('  - Set min_machines_running = 1 in fly.toml', 'info');
    }

    // Save detailed report
    const report = {
      summary: {
        totalTests: this.results.length,
        successful: successfulTests.length,
        failed: failedTests.length,
        avgLatency,
        maxLatency,
        minLatency,
        totalTime
      },
      tests: this.results,
      recommendations: this.getRecommendations(avgLatency, maxLatency)
    };

    fs.writeFileSync('latency_report.json', JSON.stringify(report, null, 2));
    await this.log('\n📄 Detailed report saved to: latency_report.json', 'success');
  }

  getRecommendations(avgLatency, maxLatency) {
    const recommendations = [];
    
    if (avgLatency > 3000) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'High average latency',
        solution: 'Upgrade Fly.io machine size or enable persistent machines'
      });
    }
    
    if (maxLatency > 10000) {
      recommendations.push({
        priority: 'CRITICAL',
        issue: 'Cold start delays',
        solution: 'Set min_machines_running = 1 in fly.toml'
      });
    }

    return recommendations;
  }
}

// Run diagnostics
const diagnostic = new LatencyDiagnostic();
diagnostic.runDiagnostics().catch(console.error); 