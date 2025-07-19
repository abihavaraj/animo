import { MaterialIcons } from '@expo/vector-icons';
import { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Paragraph, Title } from 'react-native-paper';
import { devError, isDev } from '../utils/devUtils';
import { handleErrorBoundaryError } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info for detailed debugging
    this.setState({ errorInfo });
    
    // Use enhanced error handler
    handleErrorBoundaryError(error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('🚨 Error in custom error handler:', handlerError);
      }
    }

    // Additional logging for crash analysis
    devError('Component stack:', errorInfo.componentStack);
    devError('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  }

  handleRetry = () => {
    console.log('🔄 ErrorBoundary: Attempting recovery...');
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  handleForceRefresh = () => {
    console.log('🔄 ErrorBoundary: Force refresh requested...');
    
    // Clear state and force a complete re-render
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
    
    // Force component tree to remount by changing key
    // This is a more aggressive recovery approach
    setTimeout(() => {
      if (this.state.hasError) {
        this.forceUpdate();
      }
    }, 100);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Enhanced default fallback UI
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
              
              {isDev() && this.state.error && (
                <>
                  <Paragraph style={styles.debugInfo}>
                    <strong>Error:</strong> {this.state.error.message}
                  </Paragraph>
                  {this.state.errorInfo?.componentStack && (
                    <Paragraph style={styles.debugInfo}>
                      <strong>Component Stack:</strong> {this.state.errorInfo.componentStack.slice(0, 200)}...
                    </Paragraph>
                  )}
                </>
              )}
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  onPress={this.handleRetry}
                  style={[styles.button, styles.retryButton]}
                >
                  Try Again
                </Button>
                <Button 
                  mode="outlined" 
                  onPress={this.handleForceRefresh}
                  style={[styles.button, styles.refreshButton]}
                >
                  Force Refresh
                </Button>
              </View>
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
    textAlign: 'left',
    marginBottom: 8,
    color: '#999',
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    width: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    minWidth: 100,
  },
  retryButton: {
    backgroundColor: '#2196F3',
  },
  refreshButton: {
    borderColor: '#2196F3',
  },
});

export default ErrorBoundary; 