import { ApiResponse, apiService } from './api';

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  monthly_price: number;
  monthly_classes: number;
  duration_months: number;
  equipment_access: 'mat' | 'reformer' | 'both';
  category: 'group' | 'personal' | 'personal_duo' | 'personal_trio';
  features: string[];
  is_active: number; // 1 for active, 0 for inactive (from SQLite)
  created_at: string;
  updated_at: string;
  
  // Legacy fields for backward compatibility
  price?: number;
  monthlyClasses?: number;
  isUnlimited?: boolean;
  equipmentAccess?: 'mat' | 'reformer' | 'both';
  durationMonths?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  remaining_classes: number;
  status: 'active' | 'expired' | 'cancelled';
  auto_renewal?: number; // 1 or 0 from SQLite
  created_at: string;
  updated_at: string;
  
  // Plan details from JOIN query
  plan_name: string;
  equipment_access: 'mat' | 'reformer' | 'both';
  monthly_price: number;
  monthly_classes: number;
  duration_months: number; // Duration of the plan in months (0.033 for day passes)
  category: string;
  features?: string[];
  
  // Legacy camelCase fields for backward compatibility
  userId?: number;
  planId?: number;
  startDate?: string;
  endDate?: string;
  remainingClasses?: number;
  isActive?: boolean;
  autoRenew?: boolean;
  createdAt?: string;
  updatedAt?: string;
  plan?: SubscriptionPlan;
}

export interface PurchaseSubscriptionRequest {
  planId: number;
  paymentMethodId?: string;
  autoRenew?: boolean;
  useCredit?: boolean;
}

export interface CreatePlanRequest {
  name: string;
  description: string;
  monthlyPrice: number;
  monthlyClasses: number;
  durationMonths?: number;
  equipmentAccess: 'mat' | 'reformer' | 'both';
  category?: 'group' | 'personal' | 'personal_duo' | 'personal_trio';
  features: string[];
}

export interface UpdatePlanRequest {
  name?: string;
  description?: string;
  price?: number;
  monthlyClasses?: number;
  monthlyPrice?: number;
  isUnlimited?: boolean;
  equipmentAccess?: 'mat' | 'reformer' | 'both';
  durationMonths?: number;
  category?: 'group' | 'personal' | 'personal_duo' | 'personal_trio';
  features?: string[];
  isActive?: boolean;
}

class SubscriptionService {
  // Plan management
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return apiService.get<SubscriptionPlan[]>('/plans');
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await apiService.get<SubscriptionPlan[]>('/plans');
    if (response.success && response.data) {
      return response.data;
    }
    return [];
  }

  async createPlan(planData: CreatePlanRequest): Promise<ApiResponse<SubscriptionPlan>> {
    return apiService.post<SubscriptionPlan>('/plans', planData);
  }

  async updatePlan(id: number, planData: UpdatePlanRequest): Promise<ApiResponse<SubscriptionPlan>> {
    return apiService.put<SubscriptionPlan>(`/plans/${id}`, planData);
  }

  async deletePlan(id: number): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/plans/${id}`);
  }

  // User subscription management
  async getUserSubscriptions(): Promise<ApiResponse<UserSubscription[]>> {
    return apiService.get<UserSubscription[]>('/subscriptions');
  }

  async getCurrentSubscription(): Promise<ApiResponse<UserSubscription>> {
    return apiService.get<UserSubscription>('/subscriptions/current');
  }

  async purchaseSubscription(data: PurchaseSubscriptionRequest): Promise<ApiResponse<UserSubscription>> {
    return apiService.post<UserSubscription>('/subscriptions/purchase', data);
  }

  async cancelSubscription(id: number, reason?: string): Promise<ApiResponse<UserSubscription>> {
    return apiService.put<UserSubscription>(`/subscriptions/${id}/cancel`, {
      reason: reason || 'User requested cancellation'
    });
  }

  async renewSubscription(id: number): Promise<ApiResponse<UserSubscription>> {
    return apiService.put<UserSubscription>(`/subscriptions/${id}/renew`);
  }

  // Admin/Reception methods
  async checkExistingSubscription(userId: number, planId: number): Promise<ApiResponse<any>> {
    return apiService.post<any>('/subscriptions/check-existing', {
      userId,
      planId
    });
  }

  async assignSubscription(userId: number, planId: number, notes?: string, action?: 'new' | 'extend' | 'queue'): Promise<ApiResponse<any>> {
    return apiService.post<any>('/subscriptions/assign', {
      userId,
      planId,
      paymentMethod: 'manual',
      notes: notes || '',
      action: action || 'new'
    });
  }

  async getClientSubscriptions(userId: number): Promise<ApiResponse<UserSubscription[]>> {
    return apiService.get<UserSubscription[]>(`/subscriptions/user/${userId}`);
  }

  async pauseSubscription(id: number, pauseDays: number = 30, reason?: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/subscriptions/${id}/pause`, {
      pauseDays,
      reason: reason || 'Administrative pause'
    });
  }

  async resumeSubscription(id: number, reason?: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/subscriptions/${id}/resume`, {
      reason: reason || 'Administrative resume'
    });
  }

  async extendSubscription(id: number, extensionDays: number, reason?: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/subscriptions/${id}/extend`, {
      extensionDays,
      reason: reason || 'Administrative extension'
    });
  }

  async addClassesToSubscription(id: number, classesToAdd: number, planId: number, paymentAmount?: number, reason?: string): Promise<ApiResponse<any>> {
    const requestData: any = {
      classesToAdd,
      planId,
      reason: reason || 'Class extension by reception'
    };
    
    // Only include paymentAmount if it's defined and not undefined
    if (paymentAmount !== undefined && paymentAmount !== null) {
      requestData.paymentAmount = paymentAmount;
    }
    
    return apiService.put<any>(`/subscriptions/${id}/add-classes`, requestData);
  }

  async removeClassesFromSubscription(id: number, classesToRemove: number, reason?: string): Promise<ApiResponse<any>> {
    return apiService.put<any>(`/subscriptions/${id}/remove-classes`, {
      classesToRemove,
      reason: reason || 'Class removal by reception'
    });
  }
}

export const subscriptionService = new SubscriptionService(); 