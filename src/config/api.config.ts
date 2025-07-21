// API Configuration
export const API_CONFIG = {
  // Supabase is our primary backend
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
  
  // Legacy REST API (fallback)
  REST_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
  
  // API endpoints for Supabase
  ENDPOINTS: {
    // Supabase tables (direct access)
    CLASSES: 'classes',
    BOOKINGS: 'bookings',
    USERS: 'users',
    SUBSCRIPTIONS: 'user_subscriptions',
    SUBSCRIPTION_PLANS: 'subscription_plans',
    PAYMENTS: 'payments',
    NOTIFICATIONS: 'notifications',
    
    // REST API endpoints (fallback)
    REST: {
      CLASSES: '/api/classes',
      BOOKINGS: '/api/bookings',
      USERS: '/api/users',
      SUBSCRIPTIONS: '/api/subscriptions',
      PAYMENTS: '/api/payments',
      NOTIFICATIONS: '/api/notifications',
    }
  },
  
  // Timeout settings
  TIMEOUT: 10000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Get the appropriate API URL based on current mode
export const getApiUrl = () => {
  // Use REST API URL since we're using local backend
  return API_CONFIG.REST_API_URL;
};

// Log current API configuration
export const logApiConfig = () => {
  console.log('🔧 API Configuration:');
  console.log('Supabase URL:', API_CONFIG.SUPABASE_URL);
  console.log('REST API URL:', API_CONFIG.REST_API_URL);
  console.log('Current API URL:', getApiUrl());
  console.log('Using REST API as primary backend');
}; 