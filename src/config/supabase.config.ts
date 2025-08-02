import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration - use environment variables with fallback
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

// Service role key for admin operations (password updates, user management)
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ';

// Create Supabase client with enhanced session persistence
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use platform-appropriate storage
    storage: Platform.OS === 'web' ? {
      getItem: (key: string) => {
        try {
          const value = localStorage.getItem(key);
          // Removed verbose logging: console.log(`🔑 [Supabase] Web storage get: ${key} = ${value ? 'exists' : 'null'}`);
          return value;
        } catch (e) {
          console.error('Error getting item from localStorage', e);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
          // Removed verbose logging: console.log(`🔑 [Supabase] Web storage set: ${key}`);
        } catch (e) {
          console.error('Error setting item in localStorage', e);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
          // Removed verbose logging: console.log(`🔑 [Supabase] Web storage remove: ${key}`);
        } catch (e) {
          console.error('Error removing item from localStorage', e);
        }
      }
    } : AsyncStorage,
    
    // Disable debug logging for GoTrueClient
    debug: false,
    
    // Configure session persistence settings
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    
    // Use PKCE flow for better security
    flowType: 'pkce'
  },
  
  // Global configuration
  global: {
    headers: {
      'X-Client-Info': 'animo-pilates-studio',
      'X-Platform': Platform.OS
    }
  },
  
  // Database configuration  
  db: {
    schema: 'public'
  },
  
  // Realtime configuration
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  }
});

// Add auth state change listener for debugging
if (__DEV__) {
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log(`🔐 [Supabase] Auth event: ${event}`);
    if (event === 'TOKEN_REFRESHED') {
      console.log('🔄 [Supabase] Token refreshed successfully');
    } else if (event === 'SIGNED_OUT') {
      console.log('🚪 [Supabase] User signed out');
    } else if (event === 'SIGNED_IN') {
      console.log('🚪 [Supabase] User signed in');
    }
    
    if (session) {
      const expiresAt = new Date(session.expires_at! * 1000);
      console.log(`🕒 [Supabase] Session expires at: ${expiresAt.toLocaleString()}`);
      
      // Calculate time until expiry
      const timeUntilExpiry = expiresAt.getTime() - Date.now();
      const hoursUntilExpiry = Math.round(timeUntilExpiry / (1000 * 60 * 60) * 10) / 10;
      console.log(`⏰ [Supabase] Session expires in ${hoursUntilExpiry} hours`);
    }
  });
}

// Create admin client for admin operations like password updates
const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log(`🔗 Supabase client initialized for ${Platform.OS} with enhanced session persistence`);
console.log(`🔐 Supabase admin client initialized for password updates`);

export { supabaseClient as supabase, supabaseAdminClient as supabaseAdmin };

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Debug function to log Supabase configuration
export const logSupabaseConfig = () => {
  console.log('=== Supabase Configuration ===');
  console.log('Platform:', Platform.OS);
  console.log('URL:', supabaseUrl);
  console.log('Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');
  console.log('Anon Key (last 10 chars):', '...' + supabaseAnonKey?.substring(supabaseAnonKey.length - 10));
  console.log('Available:', isSupabaseAvailable());
  console.log('Environment URL:', process.env.EXPO_PUBLIC_SUPABASE_URL || 'Using fallback');
  console.log('Environment Key:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? `Set (${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...)` : 'Using fallback');
  console.log('===========================');
};

// Log configuration on module load
logSupabaseConfig(); 