import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';

export interface Payment {
  id: number;
  user_id: number;
  subscription_id: number;
  amount: number;
  payment_date: string;
  payment_method: 'card' | 'cash' | 'bank_transfer' | 'other';
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  transaction_id?: string;
  notes?: string;
  subscription_plan_name?: string;
  monthly_classes?: number;
}

export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  averageAmount: number;
  pendingCount: number;
  pendingAmount: number;
  thisMonthPayments: number;
  thisMonthAmount: number;
}

export interface PaymentFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
}

class PaymentService {
  async getPayments(filters?: PaymentFilters): Promise<ApiResponse<Payment[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      let query = supabase
        .from('payments')
        .select(`
          *,
          user_subscriptions!payments_subscription_id_fkey (
            subscription_plans (name, monthly_classes)
          )
        `)
        .eq('user_id', user.id);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.startDate) {
        query = query.gte('payment_date', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('payment_date', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get payments' };
    }
  }

  async getPaymentStats(): Promise<ApiResponse<PaymentStats>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      const payments = data || [];
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const completedPayments = payments.filter(p => p.status === 'completed');
      const pendingPayments = payments.filter(p => p.status === 'pending');
      
      const stats: PaymentStats = {
        totalPayments: payments.length,
        totalAmount,
        averageAmount: payments.length > 0 ? totalAmount / payments.length : 0,
        pendingCount: pendingPayments.length,
        pendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        thisMonthPayments: 0,
        thisMonthAmount: 0
      };
      
      // Calculate this month's stats
      const now = new Date();
      const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const thisMonthPayments = payments.filter(p => p.payment_date.startsWith(thisMonth));
      stats.thisMonthPayments = thisMonthPayments.length;
      stats.thisMonthAmount = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to get payment stats' };
    }
  }

  async getAllPayments(filters?: PaymentFilters & { userId?: number }): Promise<ApiResponse<Payment[]>> {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          user_subscriptions!payments_subscription_id_fkey (
            subscription_plans (name, monthly_classes)
          ),
          users!payments_user_id_fkey (name, email)
        `);
      
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.startDate) {
        query = query.gte('payment_date', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('payment_date', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get all payments' };
    }
  }

  async getRevenueStats(): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'completed');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      const payments = data || [];
      const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
      
      // Calculate monthly revenue
      const monthlyRevenue: { [key: string]: number } = {};
      payments.forEach(payment => {
        const month = payment.payment_date.substring(0, 7); // YYYY-MM
        monthlyRevenue[month] = (monthlyRevenue[month] || 0) + payment.amount;
      });
      
      const stats = {
        totalRevenue,
        totalPayments: payments.length,
        averagePayment: payments.length > 0 ? totalRevenue / payments.length : 0,
        monthlyRevenue,
        thisMonthRevenue: 0,
        lastMonthRevenue: 0
      };
      
      // Calculate this month and last month revenue
      const now = new Date();
      const thisMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const lastMonth = now.getFullYear() + '-' + String(now.getMonth()).padStart(2, '0');
      
      stats.thisMonthRevenue = monthlyRevenue[thisMonth] || 0;
      stats.lastMonthRevenue = monthlyRevenue[lastMonth] || 0;
      
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to get revenue stats' };
    }
  }
}

export const paymentService = new PaymentService(); 