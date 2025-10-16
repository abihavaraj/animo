import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// =====================================================
// SEPARATE SUPABASE PROJECT FOR BAR MANAGEMENT
// =====================================================
// This is an isolated Supabase project for the bar system
// Keeps bar data completely separate from studio operations
// =====================================================

// Bar Supabase configuration - use environment variables only
export const barSupabaseUrl = process.env.EXPO_PUBLIC_BAR_SUPABASE_URL;
const barSupabaseAnonKey = process.env.EXPO_PUBLIC_BAR_SUPABASE_ANON_KEY;

// Validate bar configuration (optional - bar feature may not be enabled)
if (!barSupabaseUrl || !barSupabaseAnonKey) {
  console.warn('⚠️ Bar Supabase NOT configured - missing environment variables');
}

// Create Bar-specific Supabase client only if configured (singleton to avoid multiple instances)
const existingBar = (globalThis as any).__animo_bar_supabase as any | undefined;
const barSupabaseClient = barSupabaseUrl && barSupabaseAnonKey 
  ? (existingBar ?? ((globalThis as any).__animo_bar_supabase = createClient(barSupabaseUrl, barSupabaseAnonKey, {
  auth: {
    // Use platform-appropriate storage
    storage: Platform.OS === 'web' ? {
      getItem: (key: string) => {
        try {
          const value = localStorage.getItem(key);
          return value;
        } catch (e) {
          console.error('Error getting item from localStorage', e);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.error('Error setting item in localStorage', e);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.error('Error removing item from localStorage', e);
        }
      },
    } : AsyncStorage,
    
    // CRITICAL: Unique storage key to prevent conflicts with main Supabase client
    storageKey: 'animo-bar-portal-auth',
    
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'pilates-bar-management',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})))
  : null; // Return null if bar is not configured

// Export the bar client
export { barSupabaseClient as barSupabase };

// Helper to check if bar is configured
export const isBarConfigured = () => {
  return barSupabaseUrl && barSupabaseAnonKey && barSupabaseUrl.length > 0;
};

// Log configuration status
if (isBarConfigured()) {
  console.log('🍷 Bar Supabase configured:', barSupabaseUrl);
  console.log('🍷 Bar Supabase storageKey:', 'animo-bar-portal-auth');
} else {
  console.warn('⚠️ Bar Supabase NOT configured - using studio database as fallback');
}

