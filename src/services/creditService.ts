import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';

export interface CreditBalance {
  user: {
    name: string;
    email: string;
    credit_balance: number;
    remaining_classes: number;
  };
  recent_credits: ManualCredit[];
}

export interface ManualCredit {
  id: number;
  user_id: number;
  admin_id: number;
  amount: number;
  classes_added: number;
  reason: 'cash_payment' | 'refund' | 'promotional' | 'adjustment' | 'compensation' | 'subscription_purchase';
  description?: string;
  receipt_number?: string;
  admin_name: string;
  created_at: string;
}

export interface AddManualCreditRequest {
  userId: number;
  amount: number;
  classesAdded?: number;
  reason: 'cash_payment' | 'refund' | 'promotional' | 'adjustment' | 'compensation';
  description?: string;
  receiptNumber?: string;
}

export interface UseCreditRequest {
  amount: number;
  description?: string;
}

export interface UseCreditResponse {
  credit_used: number;
  remaining_balance: number;
  remaining_classes: number;
}

class CreditService {
  // Get credit balance for a user
  async getCreditBalance(userId?: number): Promise<ApiResponse<CreditBalance>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const targetUserId = userId || user.id;
      
      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email, credit_balance, remaining_classes')
        .eq('id', targetUserId)
        .single();
      
      if (userError) {
        return { success: false, error: userError.message };
      }

      // Get recent credits
      const { data: credits, error: creditsError } = await supabase
        .from('manual_credits')
        .select(`
          *,
          users!manual_credits_user_id_fkey (name),
          admins:users!manual_credits_admin_id_fkey (name)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (creditsError) {
        return { success: false, error: creditsError.message };
      }

      const recentCredits = credits?.map(credit => ({
        ...credit,
        admin_name: credit.admins?.name || 'Unknown'
      })) || [];

      return {
        success: true,
        data: {
          user: {
            name: userData.name,
            email: userData.email,
            credit_balance: userData.credit_balance || 0,
            remaining_classes: userData.remaining_classes || 0
          },
          recent_credits: recentCredits
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to get credit balance' };
    }
  }

  // Get manual credits for a user (admin only)
  async getManualCredits(userId: number): Promise<ApiResponse<{credits: ManualCredit[], balance: {total_credits: number, total_classes: number}}>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if current user is admin
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (currentUser?.role !== 'admin') {
        return { success: false, error: 'Admin access required' };
      }

      const { data: credits, error } = await supabase
        .from('manual_credits')
        .select(`
          *,
          users!manual_credits_user_id_fkey (name),
          admins:users!manual_credits_admin_id_fkey (name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        return { success: false, error: error.message };
      }

      const totalCredits = credits?.reduce((sum, credit) => sum + (credit.amount || 0), 0) || 0;
      const totalClasses = credits?.reduce((sum, credit) => sum + (credit.classes_added || 0), 0) || 0;

      const formattedCredits = credits?.map(credit => ({
        ...credit,
        admin_name: credit.admins?.name || 'Unknown'
      })) || [];

      return {
        success: true,
        data: {
          credits: formattedCredits,
          balance: {
            total_credits: totalCredits,
            total_classes: totalClasses
          }
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to get manual credits' };
    }
  }

  // Add manual credit (admin only)
  async addManualCredit(data: AddManualCreditRequest): Promise<ApiResponse<ManualCredit>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if current user is admin
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (currentUser?.role !== 'admin') {
        return { success: false, error: 'Admin access required' };
      }

      const { data: credit, error } = await supabase
        .from('manual_credits')
        .insert({
          user_id: data.userId,
          admin_id: user.id,
          amount: data.amount,
          classes_added: data.classesAdded || 0,
          reason: data.reason,
          description: data.description,
          receipt_number: data.receiptNumber
        })
        .select(`
          *,
          users!manual_credits_user_id_fkey (name),
          admins:users!manual_credits_admin_id_fkey (name)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }

      // Update user's credit balance
      const { error: updateError } = await supabase
        .from('users')
        .update({
          credit_balance: (credit.credit_balance || 0) + data.amount,
          remaining_classes: (credit.remaining_classes || 0) + (data.classesAdded || 0)
        })
        .eq('id', data.userId);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        data: {
          ...credit,
          admin_name: credit.admins?.name || 'Unknown'
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to add manual credit' };
    }
  }

  // Use credit for purchase
  async useCredit(data: UseCreditRequest): Promise<ApiResponse<UseCreditResponse>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get current user's credit balance
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credit_balance, remaining_classes')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        return { success: false, error: userError.message };
      }

      const currentBalance = userData.credit_balance || 0;
      const currentClasses = userData.remaining_classes || 0;

      if (currentBalance < data.amount) {
        return { success: false, error: 'Insufficient credit balance' };
      }

      // Update user's credit balance
      const { error: updateError } = await supabase
        .from('users')
        .update({
          credit_balance: currentBalance - data.amount,
          remaining_classes: Math.max(0, currentClasses - 1)
        })
        .eq('id', user.id);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return {
        success: true,
        data: {
          credit_used: data.amount,
          remaining_balance: currentBalance - data.amount,
          remaining_classes: Math.max(0, currentClasses - 1)
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to use credit' };
    }
  }

  // Update manual credit (admin only)
  async updateManualCredit(id: number, data: {description?: string, receipt_number?: string}): Promise<ApiResponse<ManualCredit>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if current user is admin
      const { data: currentUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (currentUser?.role !== 'admin') {
        return { success: false, error: 'Admin access required' };
      }

      const { data: credit, error } = await supabase
        .from('manual_credits')
        .update({
          description: data.description,
          receipt_number: data.receipt_number
        })
        .eq('id', id)
        .select(`
          *,
          users!manual_credits_user_id_fkey (name),
          admins:users!manual_credits_admin_id_fkey (name)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          ...credit,
          admin_name: credit.admins?.name || 'Unknown'
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to update manual credit' };
    }
  }
}

export const creditService = new CreditService(); 