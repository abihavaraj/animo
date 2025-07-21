import { devLog } from '../utils/devUtils';
import { unifiedApiService } from './unifiedApi';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  phone?: string;
  emergency_contact?: string;
  medical_conditions?: string;
  referral_source?: string;
  join_date?: string;
  status?: string;
  created_at: string;
  updated_at: string;
  
  // Legacy fields for backward compatibility
  emergencyContact?: string;
  medicalConditions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  emergencyContact?: string;
  medicalConditions?: string;
  referralSource?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  emergencyContact?: string;
  medicalConditions?: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<any> {
    try {
      devLog('🔐 [authService] Starting login for:', credentials.emailOrPhone);
      
      // Use unified API service which handles Supabase/REST switching
      const response = await unifiedApiService.signIn(credentials.emailOrPhone, credentials.password);
      
      if (response.success && response.data) {
        devLog('✅ [authService] Login API call successful, processing data...');
        const userData = response.data as any;
        
        if (userData.user && userData.token) {
          devLog('👍 [authService] User and token found.');
          
          // Format Supabase user data to match our User interface
          const formattedUser = {
            id: userData.user.id,
            email: userData.user.email,
            name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'User',
            role: userData.user.user_metadata?.role || 'client',
            phone: userData.user.user_metadata?.phone || '',
            emergency_contact: userData.user.user_metadata?.emergency_contact || '',
            medical_conditions: userData.user.user_metadata?.medical_conditions || '',
            referral_source: userData.user.user_metadata?.referral_source || '',
            join_date: userData.user.created_at,
            status: 'active',
            created_at: userData.user.created_at,
            updated_at: userData.user.updated_at || userData.user.created_at,
            // Legacy fields for backward compatibility
            emergencyContact: userData.user.user_metadata?.emergency_contact || '',
            medicalConditions: userData.user.user_metadata?.medical_conditions || '',
            createdAt: userData.user.created_at,
            updatedAt: userData.user.updated_at || userData.user.created_at
          };
          
          return {
            success: true,
            data: {
              user: formattedUser,
              token: userData.token
            }
          };
        } else {
          devLog('⚠️ [authService] Login success but no user data found in response.');
          return { success: false, error: 'Login successful, but user data is missing.' };
        }
      } else {
        devLog('🚨 [authService] Login API call failed:', response.error);
        return { success: false, error: response.error || 'Login failed.' };
      }
    } catch (error) {
      devLog('🔥 [authService] Critical login error:', error);
      return {
        success: false,
        error: 'A critical error occurred during login. Please try again.'
      };
    }
  }

  async register(userData: RegisterRequest): Promise<any> {
    try {
      // Use unified API service which handles Supabase/REST switching
      const response = await unifiedApiService.signUp(userData.email, userData.password, {
        name: userData.name,
        phone: userData.phone,
        emergencyContact: userData.emergencyContact,
        medicalConditions: userData.medicalConditions,
        referralSource: userData.referralSource
      });
      
      return response;
    } catch (error) {
      console.error('Auth register error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  async getProfile(): Promise<any> {
    // Use unified API service to get current user
    return unifiedApiService.getCurrentUser();
  }

  async updateProfile(data: UpdateProfileRequest): Promise<any> {
    // Update user profile using unified API service
    // Note: This might need to be implemented in the unified API service
    return { success: false, error: 'Profile update not implemented yet' };
  }

  async signOut(): Promise<any> {
    // Use unified API service for sign out
    return unifiedApiService.signOut();
  }

  setToken(token: string | null) {
    // Set token in the unified API service
    console.log('🔑 Setting token in unified API service:', token ? 'Token provided' : 'Clearing token');
    
    // The unified API service will handle token management internally
    // based on the current mode (Supabase or REST)
  }
}

export const authService = new AuthService(); 