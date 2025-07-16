import { ApiResponse, apiService } from './api';

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
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<Payment[]>(endpoint);
  }

  async getPaymentStats(): Promise<ApiResponse<PaymentStats>> {
    return apiService.get<PaymentStats>('/payments/stats');
  }

  async getAllPayments(filters?: PaymentFilters & { userId?: number }): Promise<ApiResponse<Payment[]>> {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const endpoint = `/payments/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<Payment[]>(endpoint);
  }

  async getRevenueStats(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/payments/revenue');
  }
}

export const paymentService = new PaymentService(); 