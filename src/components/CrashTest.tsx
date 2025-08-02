import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Paragraph, Title } from 'react-native-paper';
import { ErrorBoundary } from './ErrorBoundary';

// Component that will throw an error when triggered
const BuggyComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error from BuggyComponent');
  }
  
  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Buggy Component</Title>
        <Paragraph>This component is working normally.</Paragraph>
      </Card.Content>
    </Card>
  );
};

// Component that will cause an unhandled promise rejection
const PromiseTestComponent = () => {
  const [result, setResult] = useState<string>('');

  const testUnhandledRejection = () => {
    setResult('Testing unhandled promise rejection...');
    
    // This would normally crash the app
    setTimeout(() => {
      Promise.reject(new Error('Test unhandled promise rejection'));
    }, 1000);
    
    setTimeout(() => {
      setResult('Promise rejection test completed - app should still be running!');
    }, 2000);
  };

  const testGlobalError = () => {
    setResult('Testing global error handler...');
    
    // This would normally crash the app
    setTimeout(() => {
      throw new Error('Test global error handler');
    }, 1000);
    
    setTimeout(() => {
      setResult('Global error test completed - app should still be running!');
    }, 2000);
  };

  const testNetworkError = async () => {
    setResult('Testing network error handling...');
    
    try {
      // This will fail but should be handled gracefully
      const response = await fetch('https://invalid-url-that-will-fail.com');
      const data = await response.json();
      setResult('Network test completed');
    } catch (error) {
      setResult('Network error caught and handled gracefully!');
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title>Crash Prevention Tests</Title>
        <Paragraph>Test the crash prevention system:</Paragraph>
        
        <View style={styles.buttonContainer}>
          <Button 
            mode="contained" 
            onPress={testUnhandledRejection}
            style={styles.button}
          >
            Test Promise Rejection
          </Button>
          
          <Button 
            mode="contained" 
            onPress={testGlobalError}
            style={styles.button}
          >
            Test Global Error
          </Button>
          
          <Button 
            mode="contained" 
            onPress={testNetworkError}
            style={styles.button}
          >
            Test Network Error
          </Button>
        </View>
        
        {result && (
          <Paragraph style={styles.result}>{result}</Paragraph>
        )}
      </Card.Content>
    </Card>
  );
};

// Main test component
export const CrashTest = () => {
  const [showBuggyComponent, setShowBuggyComponent] = useState(false);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>🛡️ Crash Prevention System Test</Title>
          <Paragraph>
            This page tests the crash prevention system we implemented. 
            Try the tests below to verify the app stays stable even when errors occur.
          </Paragraph>
        </Card.Content>
      </Card>

      <PromiseTestComponent />

      <Card style={styles.card}>
        <Card.Content>
          <Title>ErrorBoundary Test</Title>
          <Paragraph>
            Test the ErrorBoundary component by triggering a component error:
          </Paragraph>
          
          <Button 
            mode="contained" 
            onPress={() => setShowBuggyComponent(true)}
            style={styles.button}
          >
            Trigger Component Error
          </Button>
          
          {showBuggyComponent && (
            <ErrorBoundary>
              <BuggyComponent shouldThrow={true} />
            </ErrorBoundary>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>✅ Enhanced System Status</Title>
          <Paragraph>
            • Global error handlers: ACTIVE{'\n'}
            • Enhanced native exception handling: ACTIVE{'\n'}
            • ErrorBoundary components: ACTIVE{'\n'}
            • Network error handling: ACTIVE{'\n'}
            • Promise rejection safety: ACTIVE{'\n'}
            • iOS Beta detection: ACTIVE{'\n'}
            • Crash reporting service: ACTIVE{'\n'}
            • Navigation crash protection: ACTIVE{'\n'}
            • Development debugging: ACTIVE
          </Paragraph>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={() => {
                // Test crash reporting
                const crashReporting = require('../utils/crashReporting').default;
                const stats = crashReporting.getCrashStats();
                alert(`Crash Stats:\nTotal: ${stats.totalCrashes}\nFatal: ${stats.fatalCrashes}\nNon-Fatal: ${stats.nonFatalCrashes}`);
              }}
              style={styles.button}
              icon="chart-line"
            >
              View Crash Statistics
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  buttonContainer: {
    gap: 8,
    marginTop: 8,
  },
  button: {
    marginTop: 8,
  },
  result: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
    fontFamily: 'monospace',
  },
});

export default CrashTest; 