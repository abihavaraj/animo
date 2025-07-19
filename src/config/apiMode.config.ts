// API Mode Configuration
export type ApiMode = 'REST' | 'SUPABASE' | 'HYBRID';

interface ApiModeConfig {
  currentMode: ApiMode;
  fallbackMode: ApiMode;
  enableRealTime: boolean;
}

export const API_MODE_CONFIG: ApiModeConfig = {
  // Using Supabase as our backend - no separate backend needed
  currentMode: 'SUPABASE', // Supabase is our backend
  
  // Fallback mode if Supabase fails
  fallbackMode: 'REST',
  
  // Enable real-time features (Supabase specialty)
  enableRealTime: true, // Real-time updates from Supabase
};

// Helper function to get current mode
export const getCurrentApiMode = (): ApiMode => {
  return API_MODE_CONFIG.currentMode;
};

// Helper function to check if real-time is enabled
export const isRealTimeEnabled = (): boolean => {
  return API_MODE_CONFIG.enableRealTime && API_MODE_CONFIG.currentMode === 'SUPABASE';
};

// Helper function to switch API mode
export const switchApiMode = (mode: ApiMode) => {
  API_MODE_CONFIG.currentMode = mode;
  console.log(`🔄 Switched to ${mode} API mode`);
};

// Debug function to log current configuration
export const logApiModeConfig = () => {
  console.log('=== API Mode Configuration ===');
  console.log('Current mode:', API_MODE_CONFIG.currentMode);
  console.log('Fallback mode:', API_MODE_CONFIG.fallbackMode);
  console.log('Real-time enabled:', API_MODE_CONFIG.enableRealTime);
  console.log('=============================');
}; 