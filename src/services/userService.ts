import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  emergency_contact?: string;
  medical_conditions?: string;
  referral_source?: string;
  join_date: string;
  status: 'active' | 'inactive' | 'suspended' | 'archived';
  created_at: string;
  currentSubscription?: any;
  credit_balance?: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: 'client' | 'instructor' | 'admin' | 'reception';
  emergencyContact?: string;
  medicalConditions?: string;
  initialCreditBalance?: number;
  referralSource?: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'client' | 'instructor' | 'admin' | 'reception';
  status?: 'active' | 'inactive' | 'suspended' | 'archived';
  emergencyContact?: string;
  medicalConditions?: string;
}

export interface UpdatePasswordRequest {
  newPassword: string;
}

export interface UserFilters {
  role?: string;
  status?: string;
  search?: string;
}

class UserService {
  async getUsers(filters?: UserFilters): Promise<ApiResponse<BackendUser[]>> {
    try {
      let query = supabase
        .from('users')
        .select('*');
      
      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get users' };
    }
  }

  async getUser(userId: number): Promise<ApiResponse<BackendUser>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to get user' };
    }
  }

  async getInstructors(): Promise<ApiResponse<BackendUser[]>> {
    return this.getUsers({ role: 'instructor' });
  }

  async createUser(userData: CreateUserRequest): Promise<ApiResponse<BackendUser>> {
    try {
      // First create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });
      
      if (authError) {
        return { success: false, error: authError.message };
      }
      
      // Then create the user profile in the users table
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: authData.user?.id,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
          emergency_contact: userData.emergencyContact,
          medical_conditions: userData.medicalConditions,
          referral_source: userData.referralSource,
          status: 'active',
          join_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to create user' };
    }
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<ApiResponse<BackendUser>> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update user' };
    }
  }

  async updatePassword(id: number, passwordData: UpdatePasswordRequest): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.auth.admin.updateUserById(id.toString(), {
        password: passwordData.newPassword
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update password' };
    }
  }

  async deleteUser(id: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete user' };
    }
  }

  async getUserStats(): Promise<ApiResponse<any>> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('role, status, created_at');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      const stats = {
        totalUsers: users?.length || 0,
        clients: users?.filter(u => u.role === 'client').length || 0,
        instructors: users?.filter(u => u.role === 'instructor').length || 0,
        activeUsers: users?.filter(u => u.status === 'active').length || 0,
        recentUsers: users?.filter(u => {
          const joinDate = new Date(u.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return joinDate > thirtyDaysAgo;
        }).length || 0
      };
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to get user stats' };
    }
  }
}

export const userService = new UserService();