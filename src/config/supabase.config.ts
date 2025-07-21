import { createClient } from '@supabase/supabase-js';

// Supabase configuration - use environment variables with fallback
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to check if Supabase is available
export const isSupabaseAvailable = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};

// Debug function to log Supabase configuration
export const logSupabaseConfig = () => {
  console.log('=== Supabase Configuration ===');
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