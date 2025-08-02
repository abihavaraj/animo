import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { logApiConfig } from '../config/api.config';
import { logSupabaseConfig } from '../config/supabase.config';
import { unifiedApiService } from '../services/unifiedApi';

interface TestResult {
  operation: string;
  success: boolean;
  data?: any;
  error?: string;
  source?: 'REST' | 'SUPABASE';
}

export const ApiTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev]);
  };

  const testApi = async () => {
    setLoading(true);
    setResults([]);

    // Log configurations
    logApiConfig();
    logSupabaseConfig();
    unifiedApiService.logConfiguration();

    try {
      // Test 1: Get Classes
      console.log('🧪 Testing getClasses...');
      const classesResult = await unifiedApiService.getClasses();
      addResult({
        operation: 'getClasses',
        success: classesResult.success,
        data: Array.isArray(classesResult.data) ? classesResult.data.length : 0,
        error: classesResult.error
      });

      // Test 2: Get Subscription Plans
      console.log('🧪 Testing getSubscriptionPlans...');
      const plansResult = await unifiedApiService.getSubscriptionPlans();
      addResult({
        operation: 'getSubscriptionPlans',
        success: plansResult.success,
        data: Array.isArray(plansResult.data) ? plansResult.data.length : 0,
        error: plansResult.error
      });

      // Test 3: Get Users (might require auth)
      console.log('🧪 Testing getUsers...');
      const usersResult = await unifiedApiService.getUsers();
      addResult({
        operation: 'getUsers',
        success: usersResult.success,
        data: Array.isArray(usersResult.data) ? usersResult.data.length : 0,
        error: usersResult.error
      });

    } catch (error) {
      console.error('❌ Test error:', error);
      addResult({
        operation: 'Test Suite',
        success: false,
        error: `Test failed: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const switchToRest = () => {
    unifiedApiService.switchToRest();
    addResult({
      operation: 'Switch API Mode',
      success: true,
      data: 'Switched to REST API'
    });
  };

  const switchToSupabase = () => {
    unifiedApiService.switchToSupabase();
    addResult({
      operation: 'Switch API Mode',
      success: true,
      data: 'Switched to Supabase API'
    });
  };

  const switchToHybrid = () => {
    unifiedApiService.switchToHybrid();
    addResult({
      operation: 'Switch API Mode',
      success: true,
      data: 'Switched to Hybrid API'
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 API Configuration Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testApi} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Testing...' : '🧪 Run API Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.restButton]} onPress={switchToRest}>
          <Text style={styles.buttonText}>🔄 Switch to REST</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.supabaseButton]} onPress={switchToSupabase}>
          <Text style={styles.buttonText}>⚡ Switch to Supabase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.hybridButton]} onPress={switchToHybrid}>
          <Text style={styles.buttonText}>🔄 Switch to Hybrid</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Test Results:</Text>
      
      {results.map((result, index) => (
        <View key={index} style={[styles.resultCard, result.success ? styles.successCard : styles.errorCard]}>
          <Text style={styles.operationText}>{result.operation}</Text>
          <Text style={styles.statusText}>
            {result.success ? '✅ Success' : '❌ Failed'}
          </Text>
          {result.data && (
            <Text style={styles.dataText}>Data: {JSON.stringify(result.data)}</Text>
          )}
          {result.error && (
            <Text style={styles.errorText}>Error: {result.error}</Text>
          )}
          {result.source && (
            <Text style={styles.sourceText}>Source: {result.source}</Text>
          )}
        </View>
      ))}

      {results.length === 0 && (
        <Text style={styles.noResults}>No test results yet. Run the tests to see results.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    marginVertical: 5,
    minWidth: 120,
  },
  restButton: {
    backgroundColor: '#FF9500',
  },
  supabaseButton: {
    backgroundColor: '#3ECF8E',
  },
  hybridButton: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  resultCard: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  operationText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
  },
  dataText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  errorText: {
    fontSize: 12,
    color: '#721c24',
    marginBottom: 3,
  },
  sourceText: {
    fontSize: 12,
    color: '#0066cc',
    fontStyle: 'italic',
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 20,
  },
}); 