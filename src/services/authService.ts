import { supabase, supabaseAdmin } from '../config/supabase.config';
import { devError, devLog } from '../utils/devUtils';
import { ApiResponse } from './api';
import { storageService } from './storageService';

// Define the shape of the user profile
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  status: string;
  emergency_contact?: string;
  medical_conditions?: string;
  join_date?: string;
  created_at?: string;
  currentSubscription?: any;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  referralSource?: string;
  emergencyContact?: string;
  medicalConditions?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  emergency_contact?: string;
  medical_conditions?: string;
}

class AuthService {
  private token: string | null = null;

  // Simple unified login using only Supabase auth - works for both web and mobile
  async login(emailOrPhone: string, password: string): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    devLog(`🔐 [authService] Starting unified Supabase login for: ${emailOrPhone}`);
    
    try {
      // Use Supabase auth directly for all platforms
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailOrPhone.includes('@') ? emailOrPhone : `${emailOrPhone}@temp.local`, // Handle phone login
        password: password
      });

      if (authError) {
        devLog(`❌ [authService] Supabase auth failed: ${authError.message}`);
        
        // If direct auth fails, try to find user by phone number and authenticate manually
        if (!emailOrPhone.includes('@')) {
          return await this.loginByPhone(emailOrPhone, password);
        }
        
        // Provide user-friendly error messages
        let userFriendlyError = authError.message;
        if (authError.message.includes('Invalid login credentials') || 
            authError.message.includes('Invalid email or password') ||
            authError.message.includes('Invalid credentials')) {
          userFriendlyError = '❌ Wrong password or email. Please check your credentials and try again.';
        } else if (authError.message.includes('Email not confirmed')) {
          userFriendlyError = '📧 Please check your email and confirm your account before logging in.';
        } else if (authError.message.includes('Too many requests')) {
          userFriendlyError = '⏰ Too many login attempts. Please wait a few minutes and try again.';
        }
        
        return { success: false, error: userFriendlyError };
      }

      if (!authData.user || !authData.session) {
        return { success: false, error: 'Login failed - no user data received' };
      }

      // Set token for API calls
      this.setToken(authData.session.access_token);

      // Get user profile from our users table
      const profileResponse = await this.getProfile();
      if (profileResponse.success && profileResponse.data) {
        devLog('✅ [authService] Login successful with profile loaded');
        return {
          success: true,
          data: {
            user: profileResponse.data,
            token: authData.session.access_token
          }
        };
      }

      return { success: false, error: 'Login successful but failed to load profile' };
    } catch (error) {
      devError('❌ [authService] Login error:', error);
      return { success: false, error: 'An unexpected error occurred during login.' };
    }
  }

  // Handle phone number login by finding user in our database
  private async loginByPhone(phone: string, password: string): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    try {
      devLog(`📱 [authService] Attempting phone login for: ${phone}`);
      
      // Get user by phone from our users table  
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .eq('status', 'active')
        .single();

      if (userError || !userData) {
        devLog('❌ [authService] User not found by phone');
        return { success: false, error: '❌ Wrong phone number or password. Please check your credentials and try again.' };
      }

      // If user exists in our database, try to sign in with their email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password
      });

      if (authError) {
        devLog(`❌ [authService] Phone auth failed: ${authError.message}`);
        return { success: false, error: '❌ Wrong password. Please check your password and try again.' };
      }

      if (!authData.user || !authData.session) {
        return { success: false, error: 'Login failed - no session created' };
      }

      this.setToken(authData.session.access_token);

      return {
        success: true,
        data: {
          user: userData as UserProfile,
          token: authData.session.access_token
        }
      };
    } catch (error) {
      devError('❌ [authService] Phone login error:', error);
      return { success: false, error: '❌ Login failed. Please check your phone number and password.' };
    }
  }

  // Get current user profile from our users table
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      devLog('👤 [authService] Getting user profile');
      
      // Get current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return { success: false, error: 'No active session' };
      }

      const userId = session.user.id;

      // Get user from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        devLog('❌ [authService] User not found in users table');
        return { success: false, error: 'User profile not found' };
      }

      // Get current subscription if user is a client
      if (userData.role === 'client') {
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans(name, equipment_access, monthly_price)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscription) {
          userData.currentSubscription = {
            ...subscription,
            plan_name: subscription.subscription_plans?.name,
            equipment_access: subscription.subscription_plans?.equipment_access,
            monthly_price: subscription.subscription_plans?.monthly_price
          };
        }
      }

      return { success: true, data: userData as UserProfile };
    } catch (error) {
      devError('❌ [authService] Profile fetch error:', error);
      return { success: false, error: 'Failed to load profile' };
    }
  }

  // Logout and clear session
  async logout(): Promise<ApiResponse<null>> {
    try {
      devLog('🚪 [authService] Logging out');
      
      // Get current user before logout to clean up push tokens
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        devError('❌ [authService] Logout error:', error);
        // Even if logout fails, clear local data
      }

      // Clean up push notification tokens for this user
      if (currentUser?.id) {
        try {
          const { error: tokenCleanupError } = await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', currentUser.id);
          
          if (tokenCleanupError) {
            devError('⚠️ [authService] Push token cleanup failed:', tokenCleanupError);
          } else {
            devLog('🔔 [authService] Push tokens cleaned up for user:', currentUser.id);
          }
        } catch (tokenError) {
          devError('⚠️ [authService] Push token cleanup error:', tokenError);
        }
      }

      // Clear local token and all session data to prevent device-specific corruption
      this.setToken(null);
      await storageService.removeItem('auth_token');
      
      // Clear additional session storage that can cause device-specific issues
      try {
        await storageService.removeItem('user_session');
        await storageService.removeItem('subscription_cache');
        devLog('🧹 [authService] Session storage cleared');
      } catch (storageError) {
        devError('⚠️ [authService] Storage cleanup failed (non-critical):', storageError);
      }

      devLog('✅ [authService] Logout successful with push token cleanup');
      return { success: true, data: null };
    } catch (error) {
      devError('❌ [authService] Logout error:', error);
      // Clear local data even on error
      this.setToken(null);
      await storageService.removeItem('auth_token');
      return { success: true, data: null }; // Still return success to allow logout
    }
  }

  // Check if user has valid session (automatic session restoration)
  async restoreSession(): Promise<ApiResponse<{ user: UserProfile; token: string } | null>> {
    try {
      // Add timeout protection for session check
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 10000)
      );

      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
      
      if (error || !session) {
        devLog('ℹ️ [authService] No existing session found');
        return { success: true, data: null };
      }

      devLog('✅ [authService] Found existing session, loading profile');
      this.setToken(session.access_token);

      // Add timeout protection for profile loading
      const profilePromise = this.getProfile();
      const profileTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile load timeout')), 15000)
      );

      try {
        const profileResponse = await Promise.race([profilePromise, profileTimeoutPromise]) as any;
        
        if (profileResponse.success && profileResponse.data) {
          devLog('✅ [authService] Session and profile restored successfully');
          return {
            success: true,
            data: {
              user: profileResponse.data,
              token: session.access_token
            }
          };
        }
      } catch (profileError) {
        devError('❌ [authService] Profile load failed/timeout:', profileError);
      }

      // Profile load failed or timeout - clear session WITHOUT blocking
      devLog('🧹 [authService] Profile load failed, clearing session (non-blocking)');
      
      // Clear session in background - don't wait for it
      supabase.auth.signOut().catch(signOutError => {
        devError('⚠️ [authService] Session cleanup failed (non-critical):', signOutError);
      });
      
      // Clear local data immediately
      this.setToken(null);
      await storageService.removeItem('auth_token');
      
      devLog('✅ [authService] Local session cleared, showing login');
      return { success: true, data: null };
      
    } catch (error) {
      devError('❌ [authService] Session restore error:', error);
      
      // Ensure we clear local data even on errors
      try {
        this.setToken(null);
        await storageService.removeItem('auth_token');
      } catch (cleanupError) {
        devError('⚠️ [authService] Local cleanup error:', cleanupError);
      }
      
      return { success: true, data: null }; // Always succeed to show login screen
    }
  }

  // Update user profile
  async updateProfile(updates: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'No active session' };
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as UserProfile };
    } catch (error) {
      devError('❌ [authService] Profile update error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    try {
      devLog('📝 [authService] Starting user registration');
      
      // Create auth user using admin API to bypass email confirmation
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Automatically confirm email
        user_metadata: {
          role: 'client'
        },
        app_metadata: {
          role: 'client'
        }
      });

      if (authError) {
        devLog(`❌ [authService] Registration auth failed: ${authError.message}`);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Registration failed - no user created' };
      }

      // Create user profile in our users table
      const userProfile = {
        id: authData.user.id,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: 'client' as const,
        status: 'active',
        emergency_contact: userData.emergencyContact,
        medical_conditions: userData.medicalConditions,
        referral_source: userData.referralSource,
        join_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([userProfile])
        .select()
        .single();

      if (profileError) {
        devLog(`❌ [authService] Profile creation failed: ${profileError.message}`);
        // If profile creation fails, try to clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: 'Failed to create user profile' };
      }

      // Admin createUser doesn't create a session, so we need to sign in the user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password
      });

      if (signInError || !signInData.session) {
        devLog('⚠️ [authService] Registration successful but auto-login failed');
        return { success: false, error: 'Registration successful. Please try logging in.' };
      }

      this.setToken(signInData.session.access_token);
      devLog('✅ [authService] Registration and auto-login successful');
      return {
        success: true,
        data: {
          user: profileData as UserProfile,
          token: signInData.session.access_token
        }
      };

    } catch (error) {
      devError('❌ [authService] Registration error:', error);
      return { success: false, error: 'An unexpected error occurred during registration.' };
    }
  }

  // Token management for API calls
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      storageService.setItem('auth_token', token);
    } else {
      storageService.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // Get auth header for API calls
  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const authService = new AuthService(); 