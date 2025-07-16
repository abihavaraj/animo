import { MaterialIcons } from '@expo/vector-icons';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Paragraph, Title } from 'react-native-paper';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In development, you might want to report to crash analytics
    if (__DEV__) {
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <Card style={styles.errorCard}>
            <Card.Content style={styles.cardContent}>
              <MaterialIcons 
                name="error-outline" 
                size={64} 
                color="#f44336" 
                style={styles.errorIcon} 
              />
              <Title style={styles.errorTitle}>Oops! Something went wrong</Title>
              <Paragraph style={styles.errorMessage}>
                We&apos;re sorry, but something unexpected happened. Please try again.
              </Paragraph>
              {__DEV__ && this.state.error && (
                <Paragraph style={styles.debugInfo}>
                  Debug Info: {this.state.error.message}
                </Paragraph>
              )}
              <Button 
                mode="contained" 
                onPress={this.handleRetry}
                style={styles.retryButton}
              >
                Try Again
              </Button>
            </Card.Content>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  cardContent: {
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
    lineHeight: 20,
  },
  debugInfo: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#999',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: 8,
    minWidth: 120,
  },
});

export default ErrorBoundary; 