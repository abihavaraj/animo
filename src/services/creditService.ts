import { ApiResponse, apiService } from './api';

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
    const endpoint = userId ? `/manual-credits/balance/${userId}` : '/manual-credits/balance/me';
    return apiService.get<CreditBalance>(endpoint);
  }

  // Get manual credits for a user (admin only)
  async getManualCredits(userId: number): Promise<ApiResponse<{credits: ManualCredit[], balance: {total_credits: number, total_classes: number}}>> {
    return apiService.get(`/manual-credits/${userId}`);
  }

  // Add manual credit (admin only)
  async addManualCredit(data: AddManualCreditRequest): Promise<ApiResponse<ManualCredit>> {
    return apiService.post<ManualCredit>('/manual-credits', data);
  }

  // Use credit for purchase
  async useCredit(data: UseCreditRequest): Promise<ApiResponse<UseCreditResponse>> {
    return apiService.post<UseCreditResponse>('/manual-credits/use-credit', data);
  }

  // Update manual credit (admin only)
  async updateManualCredit(id: number, data: {description?: string, receipt_number?: string}): Promise<ApiResponse<ManualCredit>> {
    return apiService.put<ManualCredit>(`/manual-credits/${id}`, data);
  }
}

export const creditService = new CreditService(); 