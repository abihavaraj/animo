import React, { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { API_MODE_CONFIG } from '../config/apiMode.config';
import { unifiedApiService } from '../services/unifiedApi';

export const SupabaseTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    addResult('🔍 Testing Supabase connection...');

    try {
      // Test 1: Get current user
      const userResult = await unifiedApiService.getCurrentUser();
      addResult(`👤 User test: ${userResult.success ? '✅ Success' : '❌ Failed'}`);

      // Test 2: Get classes
      const classesResult = await unifiedApiService.getClasses();
      addResult(`📚 Classes test: ${classesResult.success ? '✅ Success' : '❌ Failed'}`);

      // Test 3: Get users
      const usersResult = await unifiedApiService.getUsers();
      addResult(`👥 Users test: ${usersResult.success ? '✅ Success' : '❌ Failed'}`);

      // Test 4: Check API mode
      const currentMode = unifiedApiService.getCurrentMode();
      addResult(`🎯 Current API mode: ${currentMode}`);

      // Test 5: Check real-time status
      const realTimeEnabled = unifiedApiService.isRealTimeEnabled();
      addResult(`⚡ Real-time enabled: ${realTimeEnabled ? 'Yes' : 'No'}`);

    } catch (error) {
      addResult(`❌ Test failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const switchToSupabase = () => {
    unifiedApiService.setMode('SUPABASE');
    addResult('🔄 Switched to Supabase mode');
  };

  const switchToRest = () => {
    unifiedApiService.setMode('REST');
    addResult('🔄 Switched to REST mode');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Supabase Integration Test</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title={loading ? "Testing..." : "Test Connection"}
          onPress={testSupabaseConnection}
          disabled={loading}
        />
        
        <Button
          title="Switch to Supabase"
          onPress={switchToSupabase}
        />
        
        <Button
          title="Switch to REST"
          onPress={switchToRest}
        />
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </View>

      <View style={styles.configContainer}>
        <Text style={styles.configTitle}>Current Configuration:</Text>
        <Text style={styles.configText}>API Mode: {API_MODE_CONFIG.currentMode}</Text>
        <Text style={styles.configText}>Fallback: {API_MODE_CONFIG.fallbackMode}</Text>
        <Text style={styles.configText}>Real-time: {API_MODE_CONFIG.enableRealTime ? 'Enabled' : 'Disabled'}</Text>
      </View>
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
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
    color: '#666',
  },
  configContainer: {
    backgroundColor: '#e8f4fd',
    padding: 15,
    borderRadius: 8,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  configText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
}); 