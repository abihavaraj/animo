
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private supabaseUrl: string;
  private supabaseKey: string;
  private token: string | null = null;
  private lastLogoutTime: number = 0;
  private LOGOUT_COOLDOWN = 5000; // 5 seconds between auto-logouts
  private readonly timeout: number = 15000;

  constructor() {
    // Initialize with Supabase client
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byhqueksdwlbiwodpbbd.supabase.co';
    this.supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';
  }

  setToken(token: string | null) {
    this.token = token;
    console.log('🔧 ApiService token updated:', token ? 'Token set' : 'Token cleared');
  }

  // Handle authentication errors by dispatching logout action
  private handleAuthenticationError(endpoint: string, errorData: any) {
    // Only logout for specific auth errors that indicate session expiration
    const errorMessage = errorData?.message || '';
    const isSessionExpired = errorMessage.includes('JWT expired') || 
                           errorMessage.includes('session expired') ||
                           errorMessage.includes('invalid JWT') ||
                           errorMessage.includes('token expired');
    
    // Don't logout for RLS policy violations or permission errors
    const isPermissionError = errorMessage.includes('row-level security') ||
                             errorMessage.includes('insufficient privileges') ||
                             errorMessage.includes('permission denied');
    
    if (isSessionExpired && !isPermissionError) {
      // Be more lenient - only logout for very specific critical session errors
      const isCriticalSessionError = errorMessage.includes('session revoked') ||
                                   errorMessage.includes('session invalidated') ||
                                   errorMessage.includes('user not authenticated');
      
      if (!isCriticalSessionError) {
        console.log('🔄 [apiService] Token expired but not critical - user can continue using app');
        console.log('🔍 [apiService] Supabase will retry token refresh on next request');
        return; // Don't logout for normal token expiration
      }
      
      // Prevent rapid logout cycles
      const now = Date.now();
      if (now - this.lastLogoutTime < this.LOGOUT_COOLDOWN) {
        console.log('🚫 [apiService] Auto-logout on cooldown - preventing rapid logout cycle');
        return;
      }
      
      this.lastLogoutTime = now;
      console.log('🚪 [apiService] Critical session error detected - triggering auto-logout');
      console.log('🔍 [apiService] Endpoint:', endpoint, 'Error:', errorMessage);
      
      // Import store dynamically to avoid circular dependencies
      import('../store').then(({ store }) => {
        store.dispatch({ type: 'auth/clearAuth' });
      }).catch(error => {
        console.error('Failed to auto-logout on auth error:', error);
      });
    } else {
      console.log('🔍 [apiService] Auth error but not critical session issue:', errorMessage);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'apikey': this.supabaseKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Use user token if available, otherwise use anon key
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      headers['Authorization'] = `Bearer ${this.supabaseKey}`;
    }

    return headers;
  }

  // Direct Supabase REST API calls
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = `${this.supabaseUrl}/rest/v1${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for authentication errors (401/403) and auto-logout
        if (response.status === 401 || response.status === 403) {
          console.log('🚪 [apiService] Authentication error detected in GET');
          this.handleAuthenticationError(endpoint, data);
        }
        return { success: false, error: data.message || 'Request failed' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('API GET error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async post<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const url = `${this.supabaseUrl}/rest/v1${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check for authentication errors (401/403) and auto-logout
        if (response.status === 401 || response.status === 403) {
          console.log('🚪 [apiService] Authentication error detected in POST');
          this.handleAuthenticationError(endpoint, data);
        }
        return { success: false, error: data.message || 'Request failed' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('API POST error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async put<T>(endpoint: string, body: any): Promise<ApiResponse<T>> {
    try {
      const url = `${this.supabaseUrl}/rest/v1${endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || 'Request failed' };
      }

      return { success: true, data };
    } catch (error) {
      console.error('API PUT error:', error);
      return { success: false, error: 'Network error' };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = `${this.supabaseUrl}/rest/v1${endpoint}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.message || 'Request failed' };
      }

      return { success: true, data: null as T };
    } catch (error) {
      console.error('API DELETE error:', error);
      return { success: false, error: 'Network error' };
    }
  }
}

export const apiService = new ApiService();

