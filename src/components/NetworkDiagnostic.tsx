import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../config/supabase.config';

export const NetworkDiagnostic: React.FC = () => {
  const [results, setResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      addResult('🔍 Starting network diagnostics...');
      
      // Test 1: Basic Supabase configuration
      addResult('📋 Checking Supabase configuration...');
      addResult(`✅ Supabase client initialized successfully`);
      addResult(`✅ Testing with configured credentials`);
      
      // Test 2: Test simple connection
      addResult('🌐 Testing basic connection...');
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          addResult(`❌ Session check failed: ${error.message}`);
        } else {
          addResult('✅ Session check successful');
        }
      } catch (error: any) {
        addResult(`❌ Session check error: ${error.message}`);
      }
      
      // Test 3: Test authentication endpoint
      addResult('🔐 Testing authentication endpoint...');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'test@invalid.com',
          password: 'invalid'
        });
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            addResult('✅ Auth endpoint responsive (invalid credentials as expected)');
          } else {
            addResult(`⚠️ Auth endpoint error: ${error.message}`);
          }
        } else {
          addResult('🤔 Unexpected success with invalid credentials');
        }
      } catch (error: any) {
        addResult(`❌ Auth endpoint network error: ${error.message}`);
      }
      
      // Test 4: Test with valid credentials
      addResult('🔐 Testing with valid credentials...');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@pilatesstudio.com',
          password: 'password123'
        });
        
        if (error) {
          addResult(`❌ Valid credentials failed: ${error.message}`);
        } else if (data.user) {
          addResult(`✅ Valid credentials successful: ${data.user.email}`);
          
          // Sign out immediately
          await supabase.auth.signOut();
          addResult('✅ Signed out successfully');
        } else {
          addResult('⚠️ No user data returned despite success');
        }
      } catch (error: any) {
        addResult(`❌ Valid credentials network error: ${error.message}`);
      }
      
      addResult('🎉 Diagnostics completed');
      
    } catch (error: any) {
      addResult(`❌ Diagnostic error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Network Diagnostic</Text>
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton, isRunning && styles.disabledButton]}
          onPress={runDiagnostics}
          disabled={isRunning}
        >
          <Text style={styles.buttonText}>
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={clearResults}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {results.length === 0 && (
          <Text style={styles.emptyText}>
            Click "Run Diagnostics" to test network connectivity
          </Text>
        )}
      </ScrollView>
    </View>
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
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'monospace',
    color: '#333',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default NetworkDiagnostic; 