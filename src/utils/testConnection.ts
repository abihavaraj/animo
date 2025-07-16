import { getApiUrl, logApiConfig } from '../config/api.config';
import { apiService } from '../services/api';

export const testBackendConnection = async () => {
  try {
    // Log current configuration
    logApiConfig();
    
    const baseUrl = getApiUrl().replace('/api', '');
    console.log('Testing backend connection to:', baseUrl);
    
    // Test health endpoint
    const healthUrl = `${baseUrl}/health`;
    console.log('Testing health endpoint:', healthUrl);
    
    const healthResponse = await fetch(healthUrl);
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    // Test plans endpoint using API service
    console.log('Testing plans endpoint via API service...');
    const plansResponse = await apiService.get('/plans');
    console.log('Plans response:', plansResponse);
    
    return {
      success: true,
      health: healthData,
      plans: plansResponse,
      apiUrl: getApiUrl(),
      healthUrl: healthUrl
    };
  } catch (error) {
    console.error('Backend connection test failed:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check for common network errors
      if (error.message.includes('Network request failed')) {
        errorMessage += '\n\nPossible causes:\n1. Backend server not running\n2. Wrong IP address in configuration\n3. Firewall blocking connection\n4. Mobile device not on same network';
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      apiUrl: getApiUrl()
    };
  }
}; 