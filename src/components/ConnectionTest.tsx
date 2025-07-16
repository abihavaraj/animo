import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, Paragraph, Title } from 'react-native-paper';
import { testBackendConnection } from '../utils/testConnection';

const ConnectionTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleTest = async () => {
    setIsLoading(true);
    setResult('Testing connection...');
    
    try {
      const testResult = await testBackendConnection();
      
      if (testResult.success) {
        const plansCount = Array.isArray(testResult.plans?.data) ? testResult.plans.data.length : 
                          Array.isArray(testResult.plans) ? testResult.plans.length : 0;
        const message = `✅ Connection successful!\n\nHealth: ${JSON.stringify(testResult.health, null, 2)}\n\nPlans count: ${plansCount}`;
        setResult(message);
        Alert.alert('Success!', 'Backend connection is working!');
      } else {
        const errorMessage = `❌ Connection failed!\n\nError: ${testResult.error}`;
        setResult(errorMessage);
        Alert.alert('Connection Failed', testResult.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = `❌ Test failed!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setResult(errorMessage);
      Alert.alert('Test Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Backend Connection Test</Title>
        <Paragraph style={styles.subtitle}>
          Test the connection to your backend API
        </Paragraph>
        
        <Button
          mode="contained"
          onPress={handleTest}
          loading={isLoading}
          disabled={isLoading}
          style={styles.button}
        >
          Test Connection
        </Button>
        
        {result && (
          <View style={styles.resultContainer}>
            <Paragraph style={styles.result}>{result}</Paragraph>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 20,
    elevation: 4,
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
  },
  button: {
    marginBottom: 20,
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
  },
  result: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});

export default ConnectionTest; 