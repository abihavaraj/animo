import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';
import { getApiUrl, logApiConfig } from '../config/api.config';
import { createTimeoutSignal } from '../utils/devUtils';

export const ConnectionTest: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testConnection = async () => {
    setTesting(true);
    setLastResult('Testing...');
    
    try {
      // Log current API configuration
      logApiConfig();
      
      const apiUrl = getApiUrl();
      const healthUrl = apiUrl.replace('/api', '/health');
      
      console.log('🔍 Testing connection to:', healthUrl);
      
      // Test health endpoint
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout for better error handling
        signal: createTimeoutSignal(10000), // 10 second timeout
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const result = `✅ Connection successful!\nAPI: ${apiUrl}\nStatus: ${response.status}\nEnvironment: ${data.environment}\nTimestamp: ${data.timestamp}`;
        console.log('✅ Connection test passed:', data);
        setLastResult(result);
        Alert.alert('✅ Connection Test', result);
      } else {
        const error = `❌ API Error: ${response.status}\n${data.message || 'Unknown error'}`;
        console.error('❌ Connection test failed:', data);
        setLastResult(error);
        Alert.alert('❌ Connection Test Failed', error);
      }
    } catch (error: any) {
      const errorMsg = `❌ Network Error: ${error.message || 'Connection failed'}\nAPI URL: ${getApiUrl()}`;
      console.error('❌ Connection error:', error);
      setLastResult(errorMsg);
      Alert.alert('❌ Connection Error', errorMsg);
    } finally {
      setTesting(false);
    }
  };

  const testApiEndpoint = async () => {
    setTesting(true);
    setLastResult('Testing API...');
    
    try {
      const apiUrl = getApiUrl();
      const plansUrl = `${apiUrl}/api/plans`;
      
      console.log('🔍 Testing API endpoint:', plansUrl);
      
      const response = await fetch(plansUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: createTimeoutSignal(10000),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        const result = `✅ API Test successful!\nEndpoint: ${plansUrl}\nPlans found: ${data.data?.length || 0}`;
        console.log('✅ API test passed:', data);
        setLastResult(result);
        Alert.alert('✅ API Test', result);
      } else {
        const error = `❌ API Error: ${response.status}\n${data.message || data.error || 'Unknown error'}`;
        console.error('❌ API test failed:', data);
        setLastResult(error);
        Alert.alert('❌ API Test Failed', error);
      }
    } catch (error: any) {
      const errorMsg = `❌ API Error: ${error.message || 'Request failed'}\nEndpoint: ${getApiUrl()}/api/plans`;
      console.error('❌ API error:', error);
      setLastResult(errorMsg);
      Alert.alert('❌ API Error', errorMsg);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Connection Diagnostics</Text>
      <Text style={styles.info}>Current API: {getApiUrl()}</Text>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          onPress={testConnection}
          loading={testing}
          disabled={testing}
          style={styles.button}
        >
          Test Health
        </Button>
        
        <Button 
          mode="contained" 
          onPress={testApiEndpoint}
          loading={testing}
          disabled={testing}
          style={styles.button}
        >
          Test API
        </Button>
      </View>
      
      {lastResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Result:</Text>
          <Text style={styles.result}>{lastResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    margin: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  info: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  resultContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  result: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#333',
  },
}); 