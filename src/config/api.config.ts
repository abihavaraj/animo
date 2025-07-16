// API Configuration for different environments
interface ApiEndpoints {
  LOCALHOST: string;
  LOCAL_IP: string;
  PRODUCTION: string;
}

interface ApiConfig {
  LOCAL_IP: string;
  ENDPOINTS: ApiEndpoints;
  CURRENT_ENDPOINT: keyof ApiEndpoints;
}

export const API_CONFIG: ApiConfig = {
  // Your computer's IP address (found using ipconfig)
  LOCAL_IP: '192.168.100.37',
  
  // Different API endpoints for testing
  ENDPOINTS: {
    LOCALHOST: 'http://localhost:3000/api',
    LOCAL_IP: 'http://192.168.100.37:3000/api',
    PRODUCTION: 'https://animo-pilates-backend.fly.dev/api',
    // Add more endpoints as needed
  },
  
  // Current environment
  CURRENT_ENDPOINT: 'LOCAL_IP',
};

// Helper function to get the current API URL
export const getApiUrl = () => {
  return API_CONFIG.ENDPOINTS[API_CONFIG.CURRENT_ENDPOINT];
};

// Debug information (only call when needed)
export const logApiConfig = () => {
  console.log('=== API Configuration ===');
  console.log('Current endpoint:', API_CONFIG.CURRENT_ENDPOINT);
  console.log('URL:', getApiUrl());
  console.log('Available endpoints:', Object.keys(API_CONFIG.ENDPOINTS));
  console.log('========================');
}; 