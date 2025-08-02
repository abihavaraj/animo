// API Mode Configuration
// This controls which backend API to use primarily

interface ApiModeConfig {
  currentMode: 'SUPABASE' | 'REST';
  fallbackMode: 'SUPABASE' | 'REST';
  enableFallback: boolean;
}

export const API_MODE_CONFIG: ApiModeConfig = {
  currentMode: 'SUPABASE', // Primary mode - using Supabase/PostgreSQL backend
  fallbackMode: 'REST',    // Fallback mode if primary fails
  enableFallback: false,   // Whether to use fallback on errors - DISABLED since Fly.dev backend is removed
};

// Helper function to check if Supabase should be used
export const useSupabase = () => API_MODE_CONFIG.currentMode === 'SUPABASE'; 