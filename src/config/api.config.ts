// API Configuration
export const API_CONFIG = {
  // Supabase configuration - Your only backend
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byhqueksdwlbiwodpbbd.supabase.co',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMjg1ODUsImV4cCI6MjA1MjgwNDU4NX0.OJPrAg10yN7JZCC1mSCAfH2HTQ_7v-UBfmX7T1hKwj8',
  
  // Supabase REST API URL
  SUPABASE_REST_URL: 'https://byhqueksdwlbiwodpbbd.supabase.co/rest/v1',
  
  // API endpoints for Supabase tables (correct table names)
  ENDPOINTS: {
    CLASSES: '/classes',
    BOOKINGS: '/bookings', 
    USERS: '/users',
    SUBSCRIPTIONS: '/user_subscriptions',
    PLANS: '/subscription_plans',
    PAYMENTS: '/payments',
    NOTIFICATIONS: '/notifications',
    // Admin feature tables in Supabase
    CLIENT_NOTES: '/client_notes',
    CLIENT_DOCUMENTS: '/client_documents', 
    CLIENT_ACTIVITY: '/client_activity_log',
    CLIENT_LIFECYCLE: '/client_lifecycle',
    MANUAL_CREDITS: '/manual_credits',
    PAYMENT_SETTINGS: '/payment_settings',
  },
  
  // Timeout settings
  TIMEOUT: 10000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Get the Supabase REST API URL
export const getApiUrl = () => {
  console.log('🔧 Using Supabase REST API:', API_CONFIG.SUPABASE_REST_URL);
  return API_CONFIG.SUPABASE_REST_URL;
};

// Get Supabase headers for API calls
export const getApiHeaders = () => {
  return {
    'apikey': API_CONFIG.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

// Legacy function for backward compatibility
export const getSupabaseHeaders = () => {
  return {
    'apikey': API_CONFIG.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${API_CONFIG.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
};

// Log current API configuration
export const logApiConfig = () => {
  console.log('🔧 API Configuration:');
  console.log('Supabase URL:', API_CONFIG.SUPABASE_URL);
  console.log('Supabase REST URL:', API_CONFIG.SUPABASE_REST_URL);
  console.log('✅ Using Supabase only - no separate backend needed!');
}; 