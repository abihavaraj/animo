import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Supabase configuration - use environment variables only
export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Service role key - hardcoded for local dev (Expo web doesn't load non-EXPO_PUBLIC_ vars)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ';

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with enhanced session persistence (singleton to avoid multi-instances on web/HMR)
const existingStudio = (globalThis as any).__animo_studio_supabase as any | undefined;
const supabaseClient = existingStudio ?? ((globalThis as any).__animo_studio_supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
    
    // CRITICAL: Unique storage key to prevent conflicts with bar Supabase client
    storageKey: 'animo-pilates-studio-auth',
    
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
      'X-Platform': Platform.OS,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
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
}));

// Add auth state change listener for debugging
if (__DEV__) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      // User signed out
    } else if (event === 'SIGNED_IN') {
      // User signed in
    }
    
    if (session) {
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const hoursUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      // Log session expiry info for debugging
      if (hoursUntilExpiry <= 2) { // Only warn when very close to expiry
        console.warn(`⚠️ [Supabase] Session expires soon: ${hoursUntilExpiry} hours`);
      }
    }
  });
}

// Create admin client for admin operations (only if service key is available)
const supabaseAdminClient = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        storageKey: 'animo-pilates-studio-admin-auth',
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Log configuration details
console.log('🏢 Studio Supabase initialized with storageKey:', 'animo-pilates-studio-auth');

// Log admin client status in dev mode
if (__DEV__) {
  console.log('🔍 [Supabase Config] Admin Client:', supabaseAdminClient ? '✅ Available' : '⚠️ Not configured (set SUPABASE_SERVICE_ROLE_KEY)');
  console.log('🔍 [Supabase Config] Platform:', Platform.OS);
}

export { supabaseClient as supabase, supabaseAdminClient as supabaseAdmin };

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
}; 