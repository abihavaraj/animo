import { supabase, supabaseAdmin } from '../config/supabase.config';
import { devError, devLog } from '../utils/devUtils';
import { ApiResponse } from './api';
import { UserProfile } from './authService';

// Extended user interface for backend/admin operations
export interface BackendUser extends UserProfile {
  last_login?: string;
  subscription_status?: string;
  total_classes_booked?: number;
  subscription_plan?: string;
  subscription_end_date?: string;
  referral_source?: string;
  credit_balance?: number;
}

export interface UserFilters {
  role?: 'client' | 'instructor' | 'admin' | 'reception' | 'prospect';
  status?: string;
  searchTerm?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'client' | 'instructor' | 'admin' | 'reception' | 'prospect';
  emergency_contact?: string;
  medical_conditions?: string;
  referral_source?: string;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string;
  role?: 'client' | 'instructor' | 'admin' | 'reception' | 'prospect';
  status?: string;
  emergency_contact?: string;
  medical_conditions?: string;
  referral_source?: string;
}

class UserService {
  // Get all users with optional filters
  async getUsers(filters?: UserFilters): Promise<ApiResponse<BackendUser[]>> {
    try {
      devLog('🔍 [userService] Fetching users with filters:', filters);
      
      let query = supabase
        .from('users')
        .select(`
          *,
          user_subscriptions (
            status, 
            end_date, 
            remaining_classes,
            subscription_plans (name)
          )
        `);
      
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,email.ilike.%${filters.searchTerm}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        devError('❌ [userService] Supabase error:', error);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] Users fetched successfully:', data?.length);
      return { success: true, data: data || [] };
      
    } catch (error) {
      devError('❌ [userService] Exception in getUsers:', error);
      return { success: false, error: 'Failed to fetch users' };
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<ApiResponse<BackendUser>> {
    try {
      devLog('🔍 [userService] Fetching user by ID:', id);
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_subscriptions (
            status, 
            end_date, 
            remaining_classes,
            subscription_plans (name)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        devError('❌ [userService] Supabase error:', error);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] User fetched successfully:', data?.email);
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [userService] Exception in getUserById:', error);
      return { success: false, error: 'Failed to fetch user' };
    }
  }

  // Alias for getUserById for backward compatibility
  async getUser(id: string): Promise<ApiResponse<BackendUser>> {
    return this.getUserById(id);
  }

  // Get instructors specifically
  async getInstructors(): Promise<ApiResponse<BackendUser[]>> {
    try {
      devLog('🎓 [userService] Fetching instructors...');
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'instructor')
        .eq('status', 'active')
        .order('name', { ascending: true });
      
      if (error) {
        devError('❌ [userService] Supabase error:', error);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] Instructors fetched successfully:', data?.length);
      return { success: true, data: data || [] };
      
    } catch (error) {
      devError('❌ [userService] Exception in getInstructors:', error);
      return { success: false, error: 'Failed to fetch instructors' };
    }
  }

  // Update user password directly with admin privileges
  async updatePassword(userId: string, passwordData: { newPassword: string }): Promise<ApiResponse<void>> {
    try {
      devLog('🔐 [userService] Updating user password directly:', userId);
      
      // Update password using Supabase admin client (has service role key)
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: passwordData.newPassword
      });
      
      if (error) {
        devError('❌ [userService] Password update error:', error);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] Password updated successfully');
      return { success: true };
      
    } catch (error) {
      devError('❌ [userService] Exception in updatePassword:', error);
      return { success: false, error: 'Failed to update password' };
    }
  }

  // Update user email directly with admin privileges
  async updateEmail(userId: string, emailData: { newEmail: string }): Promise<ApiResponse<void>> {
    try {
      devLog('📧 [userService] Updating user email directly:', userId, emailData.newEmail);
      
      // Update email using Supabase admin client (has service role key)
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: emailData.newEmail,
        email_confirm: true // Auto-confirm the new email for admin updates
      });
      
      if (error) {
        devError('❌ [userService] Email update error:', error);
        return { success: false, error: error.message };
      }

      // Also update email in the users table
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          email: emailData.newEmail,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) {
        devError('❌ [userService] Profile email update error:', profileError);
        // Don't fail the whole operation, just warn
        console.warn('Email updated in auth but profile update failed:', profileError);
      }
      
      devLog('✅ [userService] Email updated successfully');
      return { success: true };
      
    } catch (error) {
      devError('❌ [userService] Exception in updateEmail:', error);
      return { success: false, error: 'Failed to update email' };
    }
  }

  // Create new user
  async createUser(userData: CreateUserRequest): Promise<ApiResponse<BackendUser>> {
    try {
      devLog('🔨 [userService] Creating new user:', userData.email);
      
      // Create auth user using admin API (bypasses email confirmation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Automatically confirm email
        user_metadata: {
          role: userData.role
        },
        app_metadata: {
          role: userData.role
        }
      });
      
      devLog('🔍 [userService] Auth creation result:', { 
        success: !authError, 
        userId: authData?.user?.id,
        emailConfirmed: authData?.user?.email_confirmed_at,
        error: authError?.message 
      });
      
      if (authError) {
        devError('❌ [userService] Auth creation error:', authError);
        return { success: false, error: authError.message };
      }
      
      if (!authData.user) {
        return { success: false, error: 'Failed to create auth user' };
      }
      
      // Then create user profile
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          phone: userData.phone,
          role: userData.role,
          status: 'active',
          emergency_contact: userData.emergency_contact,
          medical_conditions: userData.medical_conditions,
          referral_source: userData.referral_source,
          join_date: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        devError('❌ [userService] Profile creation error:', error);
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] User created successfully:', data?.email);
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [userService] Exception in createUser:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  // Update user
  async updateUser(id: string, updates: UpdateUserRequest): Promise<ApiResponse<BackendUser>> {
    try {
      devLog('🔄 [userService] Updating user:', id, updates);
      
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        devError('❌ [userService] Update error:', error);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] User updated successfully:', data?.email);
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [userService] Exception in updateUser:', error);
      return { success: false, error: 'Failed to update user' };
    }
  }

  // Delete user
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    try {
      devLog('🗑️ [userService] Deleting user:', id);
      
      // First delete from users table
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (profileError) {
        devError('❌ [userService] Profile deletion error:', profileError);
        return { success: false, error: profileError.message };
      }
      
      // Then delete auth user
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
      
      if (authError) {
        devError('❌ [userService] Auth deletion error:', authError);
        return { success: false, error: authError.message };
      }
      
      devLog('✅ [userService] User deleted successfully');
      return { success: true };
      
    } catch (error) {
      devError('❌ [userService] Exception in deleteUser:', error);
      return { success: false, error: 'Failed to delete user' };
    }
  }

  // Get user stats
  async getUserStats(): Promise<ApiResponse<any>> {
    try {
      devLog('📊 [userService] Fetching user stats');
      
      const { data, error } = await supabase
        .rpc('get_user_stats');
      
      if (error) {
        devError('❌ [userService] Stats error:', error);
        return { success: false, error: error.message };
      }
      
      devLog('✅ [userService] User stats fetched successfully');
      return { success: true, data };
      
    } catch (error) {
      devError('❌ [userService] Exception in getUserStats:', error);
      return { success: false, error: 'Failed to fetch user stats' };
    }
  }

  // Get all instructors for assignment purposes
  async getAllInstructors(): Promise<ApiResponse<{id: string, name: string, email: string}[]>> {
    try {
      devLog('👩‍🏫 [userService] Fetching all instructors');
      
      const response = await this.getUsers({ role: 'instructor' });
      
      if (response.success && response.data) {
        const instructors = response.data.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email
        }));
        
        devLog('✅ [userService] Instructors fetched for assignment:', instructors.length);
        return { success: true, data: instructors };
      }
      
      return { success: false, error: response.error || 'Failed to fetch instructors' };
      
    } catch (error) {
      devError('❌ [userService] Exception in getAllInstructors:', error);
      return { success: false, error: 'Failed to fetch instructors' };
    }
  }
}

export const userService = new UserService(); 