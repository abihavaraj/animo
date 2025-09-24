
import { API_MODE_CONFIG } from '../config/apiMode.config';
import { supabase } from '../config/supabase.config';
import { SimpleDateCalculator } from '../utils/simpleDateCalculator';
import { apiService } from './api';
import { notificationService } from './notificationService';
import { supabaseNotificationService } from './supabaseNotificationService';

// Define ApiResponse interface locally
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  monthlyPrice: number;
  monthlyClasses: number;
  duration: number;
  duration_unit: 'days' | 'months' | 'years';
  equipmentAccess: 'mat' | 'reformer' | 'both';
  category: 'group' | 'personal' | 'personal_duo' | 'personal_trio';
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Legacy fields for backward compatibility
  monthly_price?: number;
  monthly_classes?: number;
  duration_months?: number;
  equipment_access?: 'mat' | 'reformer' | 'both';
  is_active?: number; // 1 for active, 0 for inactive (from SQLite)
  created_at?: string;
  updated_at?: string;
  price?: number;
  isUnlimited?: boolean;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string;
  end_date: string;
  remaining_classes: number;
  status: 'active' | 'expired' | 'cancelled' | 'terminated';
  auto_renewal?: number; // 1 or 0 from SQLite
  created_at: string;
  updated_at: string;
  
  // Plan details from JOIN query
  plan_name: string;
  equipment_access: 'mat' | 'reformer' | 'both';
  monthly_price: number;
  monthly_classes: number;
  duration: number; // Simple duration number (1, 7, 12, etc)
  duration_unit: 'days' | 'months' | 'years'; // Simple unit
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

export interface ClientWithoutSubscription {
  id: string;
  name: string;
  email: string;
  phone?: string;
  join_date: string;
  status: string;
  has_previous_subscription: boolean;
  last_subscription?: {
    plan_name: string;
    end_date: string;
    status: string;
  };
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
  duration: number;
  duration_unit: 'days' | 'months' | 'years';
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
  duration?: number;
  duration_unit?: 'days' | 'months' | 'years';
  category?: 'group' | 'personal' | 'personal_duo' | 'personal_trio';
  features?: string[];
  isActive?: boolean;
}

class SubscriptionService {
  // Helper method to check if we should use Supabase
  private useSupabase(): boolean {
    return API_MODE_CONFIG.currentMode === 'SUPABASE';
  }

  // Subscription plan management
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      //console.log('🔍 getSubscriptionPlans: Using Supabase mode');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');
      
      if (error) {
        console.error('Supabase error fetching plans:', error);
        return [];
      }
      
      // Map snake_case to camelCase
      const mappedPlans = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        monthlyClasses: Number(plan.monthly_classes) || 0,
        monthlyPrice: Number(plan.monthly_price) || 0,
        duration: Number(plan.duration || plan.duration_months) || 1,
        duration_unit: plan.duration_unit || 'months',
        equipmentAccess: plan.equipment_access || 'mat',
        category: plan.category || 'group',
        features: Array.isArray(plan.features) ? plan.features : (plan.features ? JSON.parse(plan.features) : []),
        isActive: plan.is_active === true || plan.is_active === 1,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        // Keep snake_case fields for backward compatibility
        monthly_price: Number(plan.monthly_price) || 0,
        monthly_classes: Number(plan.monthly_classes) || 0,

        equipment_access: plan.equipment_access || 'mat',
        is_active: plan.is_active === true || plan.is_active === 1 ? 1 : 0,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }));
      
      return mappedPlans;
    } catch (error) {
      console.error('Failed to fetch subscription plans:', error);
      return [];
    }
  }

  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    try {
      //console.log('🔍 getPlans: Using Supabase mode');
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price');
      
      if (error) {
        console.error('Supabase error fetching plans:', error);
        return { success: false, error: error.message };
      }
      
      // Map snake_case fields to camelCase for frontend compatibility
      const mappedPlans = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        monthlyClasses: Number(plan.monthly_classes) || 0,
        monthlyPrice: Number(plan.monthly_price) || 0,
        duration: Number(plan.duration || plan.duration_months) || 1,
        duration_unit: plan.duration_unit || 'months',
        equipmentAccess: plan.equipment_access || 'mat',
        category: plan.category || 'group',
        features: Array.isArray(plan.features) ? plan.features : (plan.features ? JSON.parse(plan.features) : []),
        isActive: plan.is_active === true || plan.is_active === 1,
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        // Keep snake_case fields for backward compatibility
        monthly_price: Number(plan.monthly_price) || 0,
        monthly_classes: Number(plan.monthly_classes) || 0,

        equipment_access: plan.equipment_access || 'mat',
        is_active: plan.is_active === true || plan.is_active === 1 ? 1 : 0,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }));
      
      return { success: true, data: mappedPlans };
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      return { success: false, error: 'Failed to fetch plans' };
    }
  }

  async createSubscriptionPlan(planData: Partial<SubscriptionPlan>): Promise<ApiResponse<SubscriptionPlan>> {
    try {
      //console.log('🔍 createSubscriptionPlan: Using Supabase mode');
      
      // Convert camelCase to snake_case for Supabase
      const supabaseData: any = {};
      if (planData.name !== undefined) supabaseData.name = planData.name;
      if (planData.description !== undefined) supabaseData.description = planData.description;
      if (planData.monthlyPrice !== undefined) supabaseData.monthly_price = planData.monthlyPrice;
      if (planData.monthlyClasses !== undefined) supabaseData.monthly_classes = planData.monthlyClasses;
      if (planData.equipmentAccess !== undefined) supabaseData.equipment_access = planData.equipmentAccess;
      if (planData.duration !== undefined) supabaseData.duration = planData.duration;
      if (planData.duration_unit !== undefined) supabaseData.duration_unit = planData.duration_unit;
      if (planData.category !== undefined) supabaseData.category = planData.category;
      if (planData.features !== undefined) supabaseData.features = planData.features;
      if (planData.isActive !== undefined) supabaseData.is_active = planData.isActive;
      
      supabaseData.created_at = new Date().toISOString();
      supabaseData.updated_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('subscription_plans')
        .insert(supabaseData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error creating plan:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('Failed to create plan:', error);
      return { success: false, error: 'Failed to create plan' };
    }
  }

  async createPlan(planData: CreatePlanRequest): Promise<ApiResponse<SubscriptionPlan>> {
    // Redirect to the main createSubscriptionPlan method
    return this.createSubscriptionPlan(planData);
  }

  async updateSubscriptionPlan(id: number, planData: Partial<SubscriptionPlan>): Promise<ApiResponse<SubscriptionPlan>> {
    try {
      //console.log('🔍 updateSubscriptionPlan: Using Supabase mode');
      
      // Convert camelCase to snake_case for Supabase
      const supabaseData: any = {};
      if (planData.name !== undefined) supabaseData.name = planData.name;
      if (planData.description !== undefined) supabaseData.description = planData.description;
      if (planData.monthlyPrice !== undefined) supabaseData.monthly_price = planData.monthlyPrice;
      if (planData.monthlyClasses !== undefined) supabaseData.monthly_classes = planData.monthlyClasses;
      if (planData.equipmentAccess !== undefined) supabaseData.equipment_access = planData.equipmentAccess;
      if (planData.duration !== undefined) supabaseData.duration = planData.duration;
      if (planData.duration_unit !== undefined) supabaseData.duration_unit = planData.duration_unit;
      if (planData.category !== undefined) supabaseData.category = planData.category;
      if (planData.features !== undefined) supabaseData.features = planData.features;
      if (planData.isActive !== undefined) supabaseData.is_active = planData.isActive;
      
      supabaseData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('subscription_plans')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating plan:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Failed to update plan:', error);
      return { success: false, error: 'Failed to update plan' };
    }
  }

  async updatePlan(id: number, planData: UpdatePlanRequest): Promise<ApiResponse<SubscriptionPlan>> {
    try {
      //console.log('🔍 updatePlan: Using Supabase mode');
      
      // Convert camelCase to snake_case for Supabase
      const supabaseData: any = {};
      
      if (planData.name !== undefined) supabaseData.name = planData.name;
      if (planData.description !== undefined) supabaseData.description = planData.description;
      if (planData.monthlyPrice !== undefined) supabaseData.monthly_price = planData.monthlyPrice;
      if (planData.monthlyClasses !== undefined) supabaseData.monthly_classes = planData.monthlyClasses;
      if (planData.equipmentAccess !== undefined) supabaseData.equipment_access = planData.equipmentAccess;
      if (planData.duration !== undefined) supabaseData.duration = planData.duration;
      if (planData.duration_unit !== undefined) supabaseData.duration_unit = planData.duration_unit;
      if (planData.category !== undefined) supabaseData.category = planData.category;
      if (planData.features !== undefined) supabaseData.features = planData.features;
      if (planData.isActive !== undefined) supabaseData.is_active = planData.isActive;
      
      supabaseData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('subscription_plans')
        .update(supabaseData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating plan:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data };
    } catch (error) {
      console.error('Failed to update plan:', error);
      return { success: false, error: 'Failed to update plan' };
    }
  }

  async deleteSubscriptionPlan(id: number): Promise<ApiResponse<void>> {
    try {
      //console.log('🔍 deleteSubscriptionPlan: Using Supabase mode');
      
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error deleting plan:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to delete plan:', error);
      return { success: false, error: 'Failed to delete plan' };
    }
  }

  // Alias for Redux compatibility
  async deletePlan(id: number): Promise<ApiResponse<void>> {
    return this.deleteSubscriptionPlan(id);
  }

  // User subscription management
  async getUserSubscriptions(): Promise<ApiResponse<UserSubscription[]>> {
    try {
      if (this.useSupabase()) {
        // Get current user from auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return { success: false, error: 'User not authenticated' };
        }

        // Get all subscriptions (including expired ones for history)
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans:plan_id (
              id,
              name,
              monthly_price,
              monthly_classes,
              duration,
              duration_unit,
              equipment_access,
              category,
              features
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase error fetching user subscriptions:', error);
          return { success: false, error: error.message };
        }
        
        // Transform data to match expected format and apply business logic
        const today = new Date().toISOString().split('T')[0];
        const transformedData = data?.map(sub => {
          // Auto-determine correct status based on dates (client-side for display)
          let displayStatus = sub.status;
          if (sub.status === 'active' && sub.end_date < today) {
            displayStatus = 'expired'; // For display purposes only
          }
          
          return {
            ...sub,
            status: displayStatus, // Display status
            plan_name: sub.subscription_plans?.name || '',
            equipment_access: sub.subscription_plans?.equipment_access || 'mat',
            monthly_price: sub.subscription_plans?.monthly_price || 0,
            monthly_classes: sub.subscription_plans?.monthly_classes || 0,
            duration: sub.subscription_plans?.duration || 1,
            duration_unit: sub.subscription_plans?.duration_unit || 'months',
            category: sub.subscription_plans?.category || 'group',
            features: sub.subscription_plans?.features || []
          };
        }) || [];
        
        return { success: true, data: transformedData };
      }
      
              return apiService.get('/api/subscriptions');
    } catch (error) {
      console.error('Failed to get user subscriptions:', error);
      return { success: false, error: 'Failed to get user subscriptions' };
    }
  }

  // Cache for expiration checks to avoid overloading
  private static lastExpirationCheck: { [userId: string]: string } = {};
  
  private shouldRunExpirationCheck(userId: string, today: string, currentHour: number): boolean {
    // Always run expiration check if we haven't checked today yet
    // This ensures day passes and short subscriptions expire properly
    const lastCheck = SubscriptionService.lastExpirationCheck[userId];
    return lastCheck !== today;
  }
  
  private async runExpirationCheck(userId: string, today: string): Promise<void> {
    try {
      const now = new Date();
      
      // Expire all subscriptions that have reached their end_date (including today)
      // Subscriptions are valid UNTIL the end of their end_date, then expire the next day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const cutoffDate = yesterday.toISOString().split('T')[0];

              // Running expiration check

      const { data: expiredSubs, error: expiredError } = await supabase
        .from('user_subscriptions')
        .select('id, end_date, subscription_plans:plan_id(name)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('end_date', today); // Changed from lte to lt - expire subscriptions where end_date < today
      
      if (expiredError) {
        console.error('Error checking for expired subscriptions:', expiredError);
        return;
      }
      
      if (expiredSubs && expiredSubs.length > 0) {
        //console.log(`💀 Found ${expiredSubs.length} expired subscription(s) to update.`);
        
        // Log which subscriptions are being expired
        expiredSubs.forEach(sub => {
          const planName = (sub.subscription_plans as any)?.name || 'Unknown Plan';
          //console.log(`   - Expiring: ${planName} (ended ${sub.end_date})`);
        });
        
        // Update expired subscriptions to 'expired' status
        const expiredIds = expiredSubs.map(sub => sub.id);
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString() 
          })
          .in('id', expiredIds);
        
        if (updateError) {
          console.error('❌ Error updating expired subscriptions:', updateError);
        } else {
          //console.log(`✅ Successfully expired ${expiredSubs.length} subscription(s) for user ${userId}.`);
        }
      } else {
        //console.log(`✅ No expired subscriptions found for user ${userId} ending on or before ${cutoffDate}.`);
      }
    } catch (error) {
      console.error('❌ Error in expiration check:', error);
    }
  }
  
  async getCurrentSubscription(): Promise<ApiResponse<UserSubscription>> {
    try {
      if (this.useSupabase()) {
        // Get current user from auth
        const { data: { user } } = await supabase.auth.getUser();
                // console.log(`🔍 [getCurrentSubscription] Auth check:`, {
        //   hasUser: !!user,
        //   userId: user?.id,
        //   userEmail: user?.email
        // });
        
        if (!user) {
          //console.log('❌ [getCurrentSubscription] User not authenticated - this causes "ready to start"');
          return { success: false, error: 'User not authenticated' };
        }

        const today = new Date().toISOString().split('T')[0];
        const currentHour = new Date().getHours();
        
        // SMART EXPIRATION CHECK: Re-enabled
        const shouldCheckExpiration = this.shouldRunExpirationCheck(user.id, today, currentHour);
        
        if (shouldCheckExpiration) {
          //console.log('🔄 Running scheduled expiration check...');
          await this.runExpirationCheck(user.id, today);
          // Cache that we've checked today
          SubscriptionService.lastExpirationCheck[user.id] = today;
        } else {
          //console.log('⏰ Expiration check skipped - not time to run yet');
        }
        
        // STEP 2: Now get the current active subscription (after expiration cleanup)
        const { data, error } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans:plan_id (
              id,
              name,
              monthly_price,
              monthly_classes,
              duration,
              duration_unit,
              equipment_access,
              category,
              features
            )
          `)
          .eq('user_id', user.id)
          .gte('end_date', today) // Include subscriptions that expire today or later
          .eq('status', 'active') // Only active subscriptions
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Supabase error fetching current subscription:', error);
          return { success: false, error: error.message };
        }
        
        if (!data || data.length === 0) {
          //console.log('❌ [getCurrentSubscription] No active subscription found - this causes "ready to start"');
          //console.log(`🔍 Query details: user_id=${user.id}, end_date>=${today}, status=active`);
          return { success: true, data: undefined };
        }
        
        const subscription = data[0]; // Get the first (most recent) subscription
        //console.log(`📋 Found active subscription: ${subscription.subscription_plans?.name} (expires ${subscription.end_date})`);
        
        // Transform data to match expected format - SIMPLE DURATION!
        const transformedData = {
          ...subscription,
          plan_name: subscription.subscription_plans?.name || '',
          equipment_access: subscription.subscription_plans?.equipment_access || 'mat',
          monthly_price: subscription.subscription_plans?.monthly_price || 0,
          monthly_classes: subscription.subscription_plans?.monthly_classes || 0,
          duration: subscription.subscription_plans?.duration || 1,
          duration_unit: subscription.subscription_plans?.duration_unit || 'months',
          category: subscription.subscription_plans?.category || 'group',
          features: subscription.subscription_plans?.features || []
        };
        
        return { success: true, data: transformedData };
      }
      
      const response = await apiService.get('/api/subscriptions/current');
      return response as ApiResponse<UserSubscription>;
    } catch (error) {
      console.error('Failed to get current subscription:', error);
      return { success: false, error: 'Failed to get current subscription' };
    }
  }

  async getSubscriptionStatsForUser(userId: number | string): Promise<ApiResponse<any>> {
    try {
      if (this.useSupabase()) {
        // Get all subscriptions for the user
        const { data: subscriptions, error } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans:plan_id (
              name,
              monthly_price
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Supabase error fetching user subscriptions:', error);
          return { success: false, error: error.message };
        }
        
        if (!subscriptions || subscriptions.length === 0) {
          return { success: true, data: {
            totalSpent: 0,
            currentSubscription: null
          }};
        }
        
        // Calculate total spent - exclude only 'cancelled' subscriptions (refunded)
        // Include 'active', 'expired', and 'terminated' subscriptions (money was paid)
        const totalSpent = subscriptions
          .filter(sub => sub.status !== 'cancelled')
          .reduce((acc, sub) => {
            return acc + (sub.subscription_plans?.monthly_price || 0);
          }, 0);
        
        const currentSubscription = subscriptions
          .filter(sub => sub.status === 'active' && new Date(sub.end_date) >= new Date())
          .map(sub => ({
            plan_name: sub.subscription_plans?.name || 'Unknown Plan'
          }))[0] || null;
          
        return { success: true, data: { totalSpent, currentSubscription } };
      }
      
      // Fallback for non-supabase mode
      return { success: false, error: 'Not implemented for non-supabase mode' };
    } catch (error) {
      console.error('Failed to get subscription stats for user:', error);
      return { success: false, error: 'Failed to get subscription stats' };
    }
  }

  async purchaseSubscription(data: PurchaseSubscriptionRequest): Promise<ApiResponse<UserSubscription>> {
          return apiService.post('/api/subscriptions/purchase', data);
  }

  async terminateSubscription(id: string | number, reason?: string): Promise<ApiResponse<UserSubscription>> {
    //console.log('🛑 terminateSubscription called with:', { id, reason });
    
    if (this.useSupabase()) {
      try {
        //console.log('🛑 Using Supabase client for terminateSubscription');
        
        // Use Supabase client directly for admin/reception operations
        const { data: subscriptions, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('id', id);
        
        if (fetchError) {
          console.error('❌ Error fetching subscription for termination:', fetchError);
          return { success: false, error: fetchError.message };
        }
        
        if (!subscriptions || subscriptions.length === 0) {
          return { success: false, error: 'Subscription not found' };
        }
        
        const subscription = subscriptions[0];
        
        if (subscription.status === 'terminated') {
          return { success: false, error: 'Subscription is already terminated' };
        }
        
        if (subscription.status === 'cancelled') {
          return { success: false, error: 'Cannot terminate a cancelled subscription' };
        }
        
        // Update subscription to terminated status (keeps remaining classes at 0)
        const { data: updatedSubscription, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            status: 'terminated',
            remaining_classes: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*')
          .single();
        
        if (updateError) {
          console.error('❌ Error terminating subscription:', updateError);
          return { success: false, error: updateError.message };
        }
        
        //console.log('✅ Subscription terminated successfully:', updatedSubscription.id);
        return { success: true, data: updatedSubscription };
        
      } catch (error) {
        console.error('❌ terminateSubscription error:', error);
        return { success: false, error: 'Failed to terminate subscription' };
      }
    }
    
    // Fallback to API mode (using post since patch might not be implemented)
    return apiService.post(`/api/subscriptions/${id}/terminate`, { reason });
  }

  async cancelSubscription(id: string | number, reason?: string): Promise<ApiResponse<UserSubscription>> {
    //console.log('🎮 cancelSubscription called with:', { id, reason });
    
    if (this.useSupabase()) {
      try {
        //console.log('🎮 Using Supabase client for cancelSubscription');
        
        // Use Supabase client directly for admin/reception operations
        const { data: subscriptions, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans!inner(name, monthly_price, monthly_classes)')
          .eq('id', id);

        if (fetchError) {
          console.error('❌ Error fetching subscription:', fetchError);
          return {
            success: false,
            error: `Failed to fetch subscription: ${fetchError.message}`
          };
        }

        if (!subscriptions || subscriptions.length === 0) {
          return {
            success: false,
            error: 'Subscription not found'
          };
        }

        const subscription = subscriptions[0];
        
        if (subscription.status === 'cancelled') {
          return {
            success: false,
            error: 'Subscription is already cancelled'
          };
        }

        // Update the subscription using Supabase client
        const { data: updatedData, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          return {
            success: false,
            error: `Failed to update subscription: ${updateError.message}`
          };
        }

        // **BUSINESS LOGIC: Remove payment record when cancelling (refund/mistake)**
        //console.log('🔄 Removing payment records for cancelled subscription...');
        try {
          // Note: We can't easily link subscription to payment due to UUID mismatch
          // So we don't delete payments here to avoid accidental deletions
          // The calculation logic in ReceptionClientProfile already excludes cancelled subscriptions
          //console.log('ℹ️ Payment records kept for audit trail - calculation logic excludes cancelled subscriptions');
        } catch (paymentError) {
          console.error('❌ Payment deletion warning:', paymentError);
          // Don't fail cancellation if payment handling fails
        }

        // Send notification for subscription cancellation
        try {
          await supabaseNotificationService.createSubscriptionUpdateNotification(
            subscription.user_id.toString(),
            'cancelled',
            `Your ${subscription.subscription_plans.name} subscription has been cancelled${reason ? `: ${reason}` : ''}`,
            'Reception Staff'
          );
        } catch (notificationError) {
          console.error('❌ Failed to send cancellation notification:', notificationError);
          // Don't fail the operation if notification fails
        }
        
        //console.log('✅ Subscription cancelled successfully via Supabase');
        return {
          success: true,
          data: {
            ...subscription,
            status: 'cancelled'
          }
        };
      } catch (error) {
        console.error('❌ Error cancelling subscription via Supabase:', error);
        return {
          success: false,
          error: `Failed to cancel subscription: ${error}`
        };
      }
    }

    // Fallback to REST API
          return apiService.put(`/api/subscriptions/${id}/cancel`, {
      reason: reason || 'User requested cancellation'
    });
  }

  async renewSubscription(id: number): Promise<ApiResponse<UserSubscription>> {
          return apiService.put(`/api/subscriptions/${id}/renew`, {});
  }

  // Admin/Reception methods
  async checkExistingSubscription(userId: string | number, planId: string | number): Promise<ApiResponse<any>> {
    try {
      if (this.useSupabase()) {
        // Get the new plan
        const { data: plans, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .eq('is_active', true)
          .single();

        if (planError || !plans) {
          return {
            success: false,
            error: 'Plan not found or inactive'
          };
        }

        const newPlan = plans;

        // Get the user
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (userError || !users) {
          return {
            success: false,
            error: 'User not found'
          };
        }

        const user = users;

        // Check if user has existing TRULY ACTIVE subscription (not expired or used up)
        const today = new Date().toISOString().split('T')[0];
        const { data: existingSubscriptions, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select(`
            *,
            subscription_plans!inner(
              name,
              monthly_price,
              monthly_classes,
              equipment_access,
              duration,
              duration_unit
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', today) // Include subscriptions that expire today or later
          .order('created_at', { ascending: false })
          .limit(10); // Get more results to filter properly

        if (subscriptionError) {
          console.error('Error checking existing subscriptions:', subscriptionError);
          return {
            success: false,
            error: 'Failed to check existing subscriptions'
          };
        }

        // Filter subscriptions to find truly active ones
        // Day passes (duration_unit = 'days') are active if they haven't expired, regardless of remaining classes
        // Monthly/longer subscriptions need remaining classes > 0 to be considered active
        // Found existing subscriptions
        
        const activeSubscriptions = (existingSubscriptions || []).filter(sub => {
          const isDayPass = sub.subscription_plans.duration_unit === 'days';
          // Subscription details processed
          
          if (isDayPass) {
            // Day passes are active as long as they haven't expired (even with 0 remaining classes)
            // Day pass is active
            return true; // We already filtered by end_date >= today in the query
          } else {
            // Monthly/yearly subscriptions need remaining classes to be considered active
            const isActive = sub.remaining_classes > 0;
            // Monthly subscription status processed
            return isActive;
          }
        });
        
        // Active subscriptions filtered

        const existingSubscription = activeSubscriptions.length > 0 ? {
          ...activeSubscriptions[0],
          plan_name: activeSubscriptions[0].subscription_plans.name,
          monthly_price: activeSubscriptions[0].subscription_plans.monthly_price,
          monthly_classes: activeSubscriptions[0].subscription_plans.monthly_classes,
          equipment_access: activeSubscriptions[0].subscription_plans.equipment_access,
          duration: activeSubscriptions[0].subscription_plans.duration,
          duration_unit: activeSubscriptions[0].subscription_plans.duration_unit
        } : null;

        if (!existingSubscription) {
          // No existing subscription, safe to proceed
          return {
            success: true,
            data: {
              hasExistingSubscription: false,
              canProceed: true,
              user: user,
              newPlan: newPlan,
              message: 'No existing subscription found. Safe to assign new subscription.',
              options: []
            }
          };
        }

        // Calculate days remaining and classes remaining
        const endDate = new Date(existingSubscription.end_date);
        const todayDate = new Date();
        const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
        const classesRemaining = existingSubscription.remaining_classes || 0;

        // Calculate potential refund (pro-rated) and pricing adjustments
        const startDate = new Date(existingSubscription.start_date);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const refundAmount = totalDays > 0 ? (daysRemaining / totalDays) * existingSubscription.monthly_price : 0;
        
        // Calculate pro-rated pricing for upgrades/downgrades
        const priceDifference = newPlan.monthly_price - existingSubscription.monthly_price;
        const proRatedPriceDifference = totalDays > 0 ? (daysRemaining / totalDays) * priceDifference : priceDifference;
        const classDifference = newPlan.monthly_classes - existingSubscription.monthly_classes;

        // Analyze plan comparison
        const isUpgrade = newPlan.monthly_price > existingSubscription.monthly_price;
        const isDowngrade = newPlan.monthly_price < existingSubscription.monthly_price;
        const isSamePlan = newPlan.id === existingSubscription.plan_id;
        
        // Determine subscription types for better messaging
        const existingIsDayPass = existingSubscription.duration_unit === 'days';
        const newIsDayPass = newPlan.duration_unit === 'days';

        // Provide options based on situation and subscription types
        const options = [];
        
        // Option 1: Replace (always available)
        options.push({
          id: 'replace',
          name: 'Replace Current Subscription',
          description: `Cancel existing "${existingSubscription.plan_name}" and start new "${newPlan.name}" immediately`,
          warning: existingIsDayPass && classesRemaining > 0 
            ? `Client will lose ${classesRemaining} remaining day pass classes`
            : classesRemaining > 0 
            ? `Client will lose ${classesRemaining} remaining classes and ${daysRemaining} days`
            : existingIsDayPass
            ? `Current day pass will be cancelled (already used)`
            : `Current subscription will be cancelled`,
          refundAmount: refundAmount,
          recommended: isUpgrade || (existingIsDayPass && !newIsDayPass)
        });
        
        // Option 2: Queue (available for most cases, but with smart descriptions)
        options.push({
          id: 'queue',
          name: 'Queue for Next Period',
          description: newIsDayPass 
            ? `Add "${newPlan.name}" to be activated when current subscription ends on ${endDate.toISOString().split('T')[0]}`
            : `Start new "${newPlan.name}" when current subscription ends on ${endDate.toISOString().split('T')[0]}`,
          warning: newIsDayPass ? 'Day pass will be activated automatically when current subscription ends' : null,
          refundAmount: 0,
          recommended: !existingIsDayPass && !newIsDayPass // Most recommended for monthly -> monthly
        });
        
        // Option 3: Smart Upgrade/Downgrade (available for similar subscription types)
        if (!existingIsDayPass && !newIsDayPass) {
          if (isUpgrade) {
            // UPGRADE SCENARIO: 8 classes → 12 classes
            options.push({
              id: 'upgrade',
              name: 'Upgrade Current Subscription',
              description: `Upgrade from "${existingSubscription.plan_name}" to "${newPlan.name}" immediately`,
              warning: `Client will pay additional ${Math.abs(proRatedPriceDifference).toFixed(0)} ALL pro-rated for remaining ${daysRemaining} days`,
              refundAmount: -Math.abs(proRatedPriceDifference), // Negative = client pays
              paymentRequired: Math.abs(proRatedPriceDifference),
              classAdjustment: classDifference > 0 ? `+${classDifference} classes` : `${classDifference} classes`,
              recommended: true
            });
          } else if (isDowngrade) {
            // DOWNGRADE SCENARIO: 12 classes → 8 classes  
            options.push({
              id: 'downgrade',
              name: 'Downgrade Current Subscription',
              description: `Downgrade from "${existingSubscription.plan_name}" to "${newPlan.name}" immediately`,
              warning: `Client will receive ${Math.abs(proRatedPriceDifference).toFixed(0)} ALL refund pro-rated for remaining ${daysRemaining} days`,
              refundAmount: Math.abs(proRatedPriceDifference), // Positive = client gets refund
              paymentRequired: 0,
              classAdjustment: classDifference < 0 ? `${classDifference} classes` : `+${classDifference} classes`,
              recommended: false
            });
          } else {
            // EXTEND/ADD CLASSES: Same price tier
            options.push({
              id: 'extend',
              name: 'Add Classes to Current Subscription',
              description: `Add ${newPlan.monthly_classes} classes to existing "${existingSubscription.plan_name}" subscription`,
              warning: null,
              refundAmount: 0,
              paymentRequired: newPlan.monthly_price,
              classAdjustment: `+${newPlan.monthly_classes} classes`,
              recommended: true
            });
          }
        } else if (!existingIsDayPass && newIsDayPass) {
          // Monthly subscription + Day pass
          options.push({
            id: 'extend',
            name: 'Add Day Pass as Classes',
            description: `Add ${newPlan.monthly_classes} classes from "${newPlan.name}" to existing "${existingSubscription.plan_name}" subscription`,
            warning: null,
            refundAmount: 0,
            paymentRequired: newPlan.monthly_price,
            classAdjustment: `+${newPlan.monthly_classes} classes`,
            recommended: true
          });
        }

        return {
          success: true,
          data: {
            hasExistingSubscription: true,
            canProceed: false,
            user: user,
            newPlan: newPlan,
            existingSubscription: {
              id: existingSubscription.id,
              planName: existingSubscription.plan_name,
              monthlyPrice: existingSubscription.monthly_price,
              classesRemaining: classesRemaining,
              daysRemaining: daysRemaining,
              endDate: existingSubscription.end_date,
              equipmentAccess: existingSubscription.equipment_access
            },
            comparison: {
              isUpgrade,
              isDowngrade,
              isSamePlan,
              priceDifference: newPlan.monthly_price - existingSubscription.monthly_price,
              classDifference: newPlan.monthly_classes - existingSubscription.monthly_classes
            },
            options: options,
            message: existingIsDayPass && newIsDayPass 
              ? 'Client has an active day pass. Please choose how to handle the existing day pass.'
              : existingIsDayPass && !newIsDayPass
              ? 'Client has an active day pass and wants to purchase a monthly subscription. Please choose an option.'
              : !existingIsDayPass && newIsDayPass
              ? `Client has an active monthly subscription "${existingSubscription.plan_name}" and wants to add a day pass. Please choose an option.`
              : 'Client has an existing subscription. Please choose an option.'
          }
        };
      }

      // Fallback to REST API if not using Supabase
      return apiService.post('/api/subscriptions/check-existing', {
        userId,
        planId
      });
    } catch (error) {
      console.error('Error in checkExistingSubscription:', error);
      return {
        success: false,
        error: 'Failed to check existing subscription'
      };
    }
  }

  async assignSubscription(
    userId: string | number, 
    planId: string | number, 
    notes?: string, // Added notes parameter
    action?: 'new' | 'extend' | 'queue' | 'replace' | 'upgrade' | 'downgrade'
  ): Promise<ApiResponse<any>> {
    try {
      if (this.useSupabase()) {
        // Assigning subscription
        
        // Step 1: Get all necessary details (plan, user, existing subscription)
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          return { success: false, error: 'Plan not found or inactive' };
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single();

        if (userError || !user) {
          return { success: false, error: 'User not found' };
        }

        const today = new Date().toISOString().split('T')[0];
        const { data: existingSubscriptions } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('end_date', today)
          .order('created_at', { ascending: false })
          .limit(1);

        const existingSubscription = existingSubscriptions?.[0];

        // Step 2: Handle different actions based on business logic
        
        // --- ACTION: EXTEND ---
        // This action adds classes to an existing subscription without changing its dates.
        if (action === 'extend' && existingSubscription) {
          const newRemainingClasses = existingSubscription.remaining_classes + plan.monthly_classes;
          const { data, error } = await supabase
            .from('user_subscriptions')
            .update({ remaining_classes: newRemainingClasses, updated_at: new Date().toISOString() })
            .eq('id', existingSubscription.id)
            .select()
            .single();

          if (error) throw new Error(`Failed to extend subscription: ${error.message}`);

          // **CRITICAL FIX: Create payment record for extension**
          //console.log('🔄 Creating payment record for subscription extension...');
          const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

          try {
            const { data: payment, error: paymentError } = await supabase
              .from('payments')
              .insert({
                user_id: userId,
                subscription_id: generateUUID(), // Placeholder UUID due to schema mismatch
                amount: plan.monthly_price,
                payment_method: 'manual',
                status: 'completed',
                payment_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

            if (paymentError) {
              console.error('❌ Failed to create payment record for extension:', paymentError);
              // Don't fail the extension if payment fails
            } else {
              //console.log('✅ Payment record created successfully for extension:', payment.id);
            }
          } catch (paymentError) {
            console.error('❌ Payment creation error for extension:', paymentError);
            // Continue with extension success even if payment fails
          }
          
          // Send notification for subscription extension
        try {
          await supabaseNotificationService.createSubscriptionUpdateNotification(
            userId.toString(),
            'extended',
            `Added ${plan.monthly_classes} classes to your subscription`,
            'Reception Staff'
          );
        } catch (notificationError) {
          console.error('❌ Failed to send extension notification:', notificationError);
          // Don't fail the operation if notification fails
        }
        
        return { success: true, data: { operationType: 'extended', classesAdded: plan.monthly_classes, paymentAmount: plan.monthly_price, subscription: data } };
        }

        // --- ACTION: UPGRADE ---
        // This action upgrades the existing subscription plan, handling different upgrade types
        if (action === 'upgrade' && existingSubscription) {
          // Get existing plan details to understand the upgrade type
          const existingPlan = await supabase
            .from('subscription_plans')
            .select('monthly_classes, duration, duration_unit, monthly_price')
            .eq('id', existingSubscription.plan_id)
            .single();

          if (existingPlan.error || !existingPlan.data) {
            return { success: false, error: 'Could not find existing plan details' };
          }

          const existingPlanData = existingPlan.data;
          
          // Determine upgrade type:
          // 1. Class upgrade: same duration, more classes per month (1M/12 → 1M/20)
          // 2. Duration upgrade: longer duration, same classes per month (1M/20 → 3M/20)
          // 3. Both upgrade: longer duration AND more classes per month (1M/12 → 3M/20)
          
          const isClassUpgrade = existingPlanData.monthly_classes < plan.monthly_classes;
          const isDurationUpgrade = existingPlanData.duration < plan.duration;
          
          let finalRemainingClasses;
          let upgradedEndDate = existingSubscription.end_date; // Default to existing end date

          if (isDurationUpgrade && !isClassUpgrade) {
            // DURATION UPGRADE: 1M/20 → 3M/20 (extend subscription, keep same classes)
            // Keep existing remaining classes, extend the end date
            finalRemainingClasses = existingSubscription.remaining_classes;
            
            // Calculate new end date based on plan duration
            const currentEndDate = new Date(existingSubscription.end_date);
            if (plan.duration_unit === 'months') {
              currentEndDate.setMonth(currentEndDate.getMonth() + (plan.duration - existingPlanData.duration));
            } else if (plan.duration_unit === 'days') {
              currentEndDate.setDate(currentEndDate.getDate() + (plan.duration - existingPlanData.duration));
            }
            upgradedEndDate = currentEndDate.toISOString().split('T')[0];
            
          } else if (isClassUpgrade && !isDurationUpgrade) {
            // CLASS UPGRADE: 1M/8 → 1M/12 (more classes, same duration)  
            // Calculate how many classes the user has already used from their original plan
            const usedClasses = existingPlanData.monthly_classes - existingSubscription.remaining_classes;
            // New remaining = new plan total - classes already used
            finalRemainingClasses = Math.max(0, plan.monthly_classes - usedClasses);
            // Class upgrade processed
            
          } else if (isClassUpgrade && isDurationUpgrade) {
            // BOTH UPGRADE: 1M/12 → 3M/20 (more classes AND longer duration)
            const usedClasses = existingPlanData.monthly_classes - existingSubscription.remaining_classes;
            finalRemainingClasses = Math.max(0, plan.monthly_classes - usedClasses);
            // Both upgrade processed
            
            // Also extend the end date
            const currentEndDate = new Date(existingSubscription.end_date);
            if (plan.duration_unit === 'months') {
              currentEndDate.setMonth(currentEndDate.getMonth() + (plan.duration - existingPlanData.duration));
            } else if (plan.duration_unit === 'days') {
              currentEndDate.setDate(currentEndDate.getDate() + (plan.duration - existingPlanData.duration));
            }
            upgradedEndDate = currentEndDate.toISOString().split('T')[0];
            
          } else {
            // No upgrade? This shouldn't happen
            return { success: false, error: 'Invalid upgrade: new plan is not better than existing plan' };
          }

          // Update the existing subscription with new plan and calculated values
          const { data, error } = await supabase
            .from('user_subscriptions')
            .update({ 
              plan_id: planId,
              end_date: upgradedEndDate,
              remaining_classes: finalRemainingClasses, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingSubscription.id)
            .select()
            .single();

          if (error) throw new Error(`Failed to upgrade subscription: ${error.message}`);

          // Create payment record for upgrade
          const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });

          try {
            const existingPlanPrice = existingPlanData.monthly_price || 0;
            const newPlanPrice = plan.monthly_price || 0;
            const priceDifference = newPlanPrice - existingPlanPrice;
            // Payment calculation processed
            // Plan objects processed
            
            // Ensure we have a valid amount (never null or undefined)
            const paymentAmount = Math.max(0, Math.abs(priceDifference) || 0);
            // Final payment amount calculated
            
            // Skip payment record creation if amount is 0 (no price difference)
            if (paymentAmount === 0) {
              // Skipping payment record - no price difference
            } else {
            
            const { data: payment, error: paymentError } = await supabase
              .from('payments')
              .insert({
                user_id: userId,
                subscription_id: generateUUID(),
                amount: paymentAmount, // Ensure this is never null
                payment_method: 'manual',
                status: 'completed',
                payment_date: new Date().toISOString().split('T')[0]
              })
              .select()
              .single();

              if (paymentError) {
                console.error('❌ Failed to create payment record for upgrade:', paymentError);
              } else {
                // Payment record created successfully for upgrade
              }
            }
          } catch (paymentError) {
            console.error('❌ Payment creation error for upgrade:', paymentError);
          }
          
          // Send notification for subscription upgrade
          try {
            let upgradeMessage;
            if (isDurationUpgrade && !isClassUpgrade) {
              upgradeMessage = `Upgraded to ${plan.name}. Subscription extended, remaining classes: ${finalRemainingClasses}`;
            } else if (isClassUpgrade && !isDurationUpgrade) {
              const usedClasses = existingPlanData.monthly_classes - existingSubscription.remaining_classes;
              upgradeMessage = `Upgraded to ${plan.name}. Remaining classes: ${finalRemainingClasses} (${usedClasses} already used)`;
            } else {
              const usedClasses = existingPlanData.monthly_classes - existingSubscription.remaining_classes;
              upgradeMessage = `Upgraded to ${plan.name}. Extended duration and updated classes: ${finalRemainingClasses} (${usedClasses} already used)`;
            }
            
            await supabaseNotificationService.createSubscriptionUpdateNotification(
              userId.toString(),
              'extended', // Use 'extended' instead of 'upgraded' to match allowed types
              upgradeMessage,
              'Reception Staff'
            );
          } catch (notificationError) {
            console.error('❌ Failed to send upgrade notification:', notificationError);
          }
        
          return { 
            success: true, 
            data: { 
              operationType: 'upgraded', 
              upgradeType: isDurationUpgrade && !isClassUpgrade ? 'duration' : 
                          isClassUpgrade && !isDurationUpgrade ? 'classes' : 'both',
              previousPlan: existingSubscription.plan_name,
              newPlan: plan.name,
              newEndDate: upgradedEndDate,
              newRemainingClasses: finalRemainingClasses,
              paymentAmount: Math.abs(plan.monthly_price - existingPlanData.monthly_price),
              subscription: data 
            } 
          };
        }

        // --- ACTION: DOWNGRADE ---
        // This action downgrades the existing subscription plan, preserving used classes and calculating refund
        if (action === 'downgrade' && existingSubscription) {
          // Get existing plan details to understand the downgrade
          const existingPlan = await supabase
            .from('subscription_plans')
            .select('monthly_classes, duration, duration_unit, monthly_price')
            .eq('id', existingSubscription.plan_id)
            .single();

          if (existingPlan.error || !existingPlan.data) {
            return { success: false, error: 'Could not find existing plan details' };
          }

          const existingPlanData = existingPlan.data;
          
          // Calculate used classes and new remaining classes
          const usedClasses = existingPlanData.monthly_classes - existingSubscription.remaining_classes;
          const finalRemainingClasses = Math.max(0, plan.monthly_classes - usedClasses);
          
          // Class downgrade processed

          // Update the existing subscription with new plan and calculated values
          const { data, error } = await supabase
            .from('user_subscriptions')
            .update({ 
              plan_id: planId,
              remaining_classes: finalRemainingClasses, 
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingSubscription.id)
            .select()
            .single();

          if (error) throw new Error(`Failed to downgrade subscription: ${error.message}`);

          // Calculate refund amount (pro-rated for remaining days)
          const endDate = new Date(existingSubscription.end_date);
          const todayDate = new Date();
          const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
          const startDate = new Date(existingSubscription.start_date);
          const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          
          const priceDifference = existingPlanData.monthly_price - plan.monthly_price;
          const refundAmount = totalDays > 0 ? (daysRemaining / totalDays) * priceDifference : priceDifference;
          
          // Refund calculation processed

          // Create negative payment record for refund (if refund amount > 0)
          if (refundAmount > 0) {
            const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });

            try {
              const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .insert({
                  user_id: userId,
                  subscription_id: generateUUID(),
                  amount: -Math.abs(refundAmount), // Negative amount for refund
                  payment_method: 'refund',
                  status: 'completed',
                  payment_date: new Date().toISOString().split('T')[0]
                })
                .select()
                .single();

              if (paymentError) {
                console.error('❌ Failed to create refund record for downgrade:', paymentError);
              }
            } catch (paymentError) {
              console.error('❌ Refund creation error for downgrade:', paymentError);
            }
          }
          
          // Send notification for subscription downgrade
          try {
            const downgradeMessage = `Downgraded to ${plan.name}. Remaining classes: ${finalRemainingClasses} (${usedClasses} already used)${refundAmount > 0 ? `. Refund: ${refundAmount.toFixed(0)} ALL` : ''}`;
            
            await supabaseNotificationService.createSubscriptionUpdateNotification(
              userId.toString(),
              'extended', // Use 'extended' type for downgrade notifications too
              downgradeMessage,
              'Reception Staff'
            );
          } catch (notificationError) {
            console.error('❌ Failed to send downgrade notification:', notificationError);
          }
        
          return { 
            success: true, 
            data: { 
              operationType: 'downgraded',
              previousPlan: existingSubscription.plan_name,
              newPlan: plan.name,
              newRemainingClasses: finalRemainingClasses,
              refundAmount: Math.max(0, refundAmount),
              subscription: data 
            } 
          };
        }

        // --- ACTION: QUEUE, REPLACE, OR NEW ---
        // All these actions involve creating a new subscription record, so we need robust date calculation.
        
        let startDate: Date;
        let operationType: string;

        if (action === 'queue' && existingSubscription) {
          // Start the new subscription the day after the old one ends
          startDate = new Date(existingSubscription.end_date);
          startDate.setDate(startDate.getDate() + 1);
          operationType = 'queued';
        } else {
          // For 'new' or 'replace', the subscription starts today.
          startDate = new Date();
          operationType = existingSubscription ? 'replaced' : 'new';
        }

        // ** SIMPLE END DATE CALCULATION **
        const endDate = SimpleDateCalculator.calculateEndDate(startDate, plan.duration, plan.duration_unit);

        // If replacing, cancel the old subscription first.
        if (operationType === 'replaced' && existingSubscription) {
          const { error: cancelError } = await supabase
            .from('user_subscriptions')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', existingSubscription.id);
          if (cancelError) throw new Error(`Failed to cancel existing subscription for replacement: ${cancelError.message}`);
        }

        // Create the new subscription with correctly calculated dates
        const { data: newSubscription, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
                      start_date: SimpleDateCalculator.toStorageFormat(startDate),
          end_date: endDate,
            remaining_classes: plan.monthly_classes,
            status: 'active',
            notes: notes, // Save the notes from reception
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create new subscription: ${insertError.message}`);
        }

        // **BUSINESS LOGIC: Create payment record only for non-cancelled subscriptions**
        // Cancelled = refunds/mistakes (no payment), Active/Terminated = completed services (payment)
        //console.log('🔄 Creating payment record for subscription assignment...');
        const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        try {
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              user_id: userId,
              subscription_id: generateUUID(), // Placeholder UUID due to schema mismatch
              amount: plan.monthly_price,
              payment_method: 'manual',
              status: 'completed',
              payment_date: SimpleDateCalculator.toStorageFormat(startDate)
            })
            .select()
            .single();

          if (paymentError) {
            console.error('❌ Failed to create payment record:', paymentError);
            // Don't fail the subscription creation if payment fails
          } else {
            //console.log('✅ Payment record created successfully:', payment.id);
          }
        } catch (paymentError) {
          console.error('❌ Payment creation error:', paymentError);
          // Continue with subscription success even if payment fails
        }
        
        // Send notification for new subscription assignment
        try {
          if (operationType === 'new') {
            await supabaseNotificationService.createSubscriptionAssignmentNotification(
              userId.toString(),
              plan.name,
              'Reception Staff'
            );
          } else if (operationType === 'replaced') {
            await supabaseNotificationService.createSubscriptionUpdateNotification(
              userId.toString(),
              'replaced',
              `Your subscription has been replaced with ${plan.name}`,
              'Reception Staff'
            );
          } else if (operationType === 'queued') {
            await supabaseNotificationService.createSubscriptionUpdateNotification(
              userId.toString(),
              'queued',
              `A new ${plan.name} subscription has been queued to start after your current subscription ends`,
              'Reception Staff'
            );
          }
        } catch (notificationError) {
          console.error('❌ Failed to send subscription notification:', notificationError);
          // Don't fail the operation if notification fails
        }
        
        return { success: true, data: { operationType, paymentAmount: plan.monthly_price, subscription: newSubscription } };

      }
      // Fallback to old API (should not be used with current config)
      return { success: false, error: "Legacy API mode not supported for this operation." };

    } catch (error) {
      console.error('❌ Error in assignSubscription:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async getClientSubscriptions(userId: string | number): Promise<ApiResponse<UserSubscription[]>> {
    return apiService.get<UserSubscription[]>(`/api/subscriptions/user/${userId}`);
  }

  async pauseSubscription(id: string | number, pauseDays: number = 30, reason?: string): Promise<ApiResponse<any>> {
    //console.log('🎮 pauseSubscription called with:', { id, pauseDays, reason });
    
    if (this.useSupabase()) {
      try {
        //console.log('🎮 Using Supabase client for pauseSubscription');
        
        // Use Supabase client directly for admin/reception operations
        const { data: subscriptions, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans!inner(name, monthly_price, monthly_classes)')
          .eq('id', id);

        if (fetchError) {
          console.error('❌ Error fetching subscription:', fetchError);
          return {
            success: false,
            error: `Failed to fetch subscription: ${fetchError.message}`
          };
        }

        if (!subscriptions || subscriptions.length === 0) {
          return {
            success: false,
            error: 'Subscription not found'
          };
        }

        const subscription = subscriptions[0];
        
        if (subscription.status !== 'active') {
          return {
            success: false,
            error: 'Can only pause active subscriptions'
          };
        }

        // Update the subscription status to paused
        const { data: updatedData, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'paused',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          return {
            success: false,
            error: `Failed to update subscription: ${updateError.message}`
          };
        }

        // Send notification for subscription pause
        try {
          await supabaseNotificationService.createSubscriptionUpdateNotification(
            subscription.user_id.toString(),
            'paused',
            `Your ${subscription.subscription_plans.name} subscription has been paused for ${pauseDays} days${reason ? `: ${reason}` : ''}`,
            'Reception Staff'
          );
        } catch (notificationError) {
          console.error('❌ Failed to send pause notification:', notificationError);
          // Don't fail the operation if notification fails
        }
        
        //console.log('✅ Subscription paused successfully via Supabase client');
        return {
          success: true,
          data: {
            message: 'Subscription paused successfully',
            pauseDays
          }
        };
      } catch (error) {
        console.error('❌ Error pausing subscription via Supabase:', error);
        return {
          success: false,
          error: `Failed to pause subscription: ${error}`
        };
      }
    }

    // Fallback to REST API
    return apiService.put<any>(`/api/subscriptions/${id}/pause`, {
      pauseDays,
      reason: reason || 'Administrative pause'
    });
  }

  async resumeSubscription(id: string | number, reason?: string): Promise<ApiResponse<any>> {
    //console.log('🎮 resumeSubscription called with:', { id, reason });
    //console.log('🎮 useSupabase() returns:', this.useSupabase());
    
    if (this.useSupabase()) {
      try {
        //console.log('🎮 Using Supabase client for resumeSubscription');
        
        // Update subscription status to 'active'
        const { data, error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*');

        if (error) {
          console.error('❌ Error resuming subscription:', error);
          return {
            success: false,
            error: error.message || 'Failed to resume subscription'
          };
        }

        if (!data || data.length === 0) {
          return {
            success: false,
            error: 'Subscription not found'
          };
        }

        // Send notification for subscription resume
        try {
          // Get subscription details for notification
          const { data: subscriptionDetails } = await supabase
            .from('user_subscriptions')
            .select('*, subscription_plans!inner(name)')
            .eq('id', id)
            .single();
            
          if (subscriptionDetails) {
            await supabaseNotificationService.createSubscriptionUpdateNotification(
              subscriptionDetails.user_id.toString(),
              'resumed',
              `Your ${subscriptionDetails.subscription_plans.name} subscription has been resumed${reason ? `: ${reason}` : ''}`,
              'Reception Staff'
            );
          }
        } catch (notificationError) {
          console.error('❌ Failed to send resume notification:', notificationError);
          // Don't fail the operation if notification fails
        }
        
        //console.log('✅ Subscription resumed successfully:', data[0]);
        return {
          success: true,
          data: data[0]
        };
      } catch (error) {
        console.error('❌ Error in resumeSubscription:', error);
        return {
          success: false,
          error: `Failed to resume subscription: ${error}`
        };
      }
    }

    // Fallback to API service for non-Supabase mode
    return apiService.put<any>(`/api/subscriptions/${id}/resume`, {
      reason: reason || 'Administrative resume'
    });
  }

  async extendSubscription(id: string | number, extensionDays: number, reason?: string): Promise<ApiResponse<any>> {
    //console.log('🎮 extendSubscription called with:', { id, extensionDays, reason });
    //console.log('🎮 useSupabase() returns:', this.useSupabase());
    
    if (this.useSupabase()) {
      try {
        //console.log('🎮 Using Supabase client for extendSubscription');
        
        // First get the current subscription
        const { data: currentSub, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('end_date')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching current subscription:', fetchError);
          return {
            success: false,
            error: fetchError.message || 'Failed to fetch subscription'
          };
        }

        // Calculate new end date
        const currentEndDate = new Date(currentSub.end_date);
        const newEndDate = new Date(currentEndDate.getTime() + (extensionDays * 24 * 60 * 60 * 1000));

        // Update subscription with new end date
        const { data, error } = await supabase
          .from('user_subscriptions')
          .update({
            end_date: newEndDate.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('*');

        if (error) {
          console.error('❌ Error extending subscription:', error);
          return {
            success: false,
            error: error.message || 'Failed to extend subscription'
          };
        }

        if (!data || data.length === 0) {
          return {
            success: false,
            error: 'Subscription not found'
          };
        }

        //console.log('✅ Subscription extended successfully:', data[0]);
        return {
          success: true,
          data: data[0]
        };
      } catch (error) {
        console.error('❌ Error in extendSubscription:', error);
        return {
          success: false,
          error: `Failed to extend subscription: ${error}`
        };
      }
    }

    // Fallback to API service for non-Supabase mode
    return apiService.put<any>(`/api/subscriptions/${id}/extend`, {
      extensionDays,
      reason: reason || 'Administrative extension'
    });
  }

  async addClassesToSubscription(id: string | number, classesToAdd: number, planId?: string | number, paymentAmount?: number, reason?: string): Promise<ApiResponse<any>> {
    //console.log('🎮 addClassesToSubscription called with:', { id, classesToAdd, planId, paymentAmount, reason });
    //console.log('🎮 useSupabase() returns:', this.useSupabase());
    
    if (this.useSupabase()) {
      try {
        //console.log('🎮 Using Supabase client for addClassesToSubscription');
        
        // Use Supabase client directly for admin/reception operations
        const { data: subscriptions, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans!inner(name, monthly_price, monthly_classes)')
          .eq('id', id);

        if (fetchError) {
          console.error('❌ Error fetching subscription:', fetchError);
          return {
            success: false,
            error: `Failed to fetch subscription: ${fetchError.message}`
          };
        }

        if (!subscriptions || subscriptions.length === 0) {
          return {
            success: false,
            error: 'Subscription not found'
          };
        }

        const subscription = subscriptions[0];
        
        if (subscription.status !== 'active') {
          return {
            success: false,
            error: 'Can only add classes to active subscriptions'
          };
        }

        // Calculate new remaining classes
        const newRemainingClasses = subscription.remaining_classes + classesToAdd;
        
        //console.log(`📊 Adding ${classesToAdd} classes: ${subscription.remaining_classes} → ${newRemainingClasses}`);
        
        // Update the subscription using Supabase client
        const { data: updatedData, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            remaining_classes: newRemainingClasses,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('remaining_classes');

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          return {
            success: false,
            error: `Failed to update subscription: ${updateError.message}`
          };
        }

        //console.log('✅ Classes added successfully via Supabase client');
        //console.log('📋 Updated subscription data:', updatedData);
        
        return {
          success: true,
          data: {
            message: 'Classes added successfully',
            oldRemainingClasses: subscription.remaining_classes,
            newRemainingClasses,
            classesAdded: classesToAdd,
            subscriptionId: id
          }
        };
      } catch (error) {
        console.error('❌ Error adding classes via Supabase:', error);
        return {
          success: false,
          error: `Failed to add classes: ${error}`
        };
      }
    }

    // Fallback to REST API (should not be used with current config)
    const requestData: any = {
      classesToAdd,
      planId,
      reason: reason || 'Class extension by reception'
    };
    
    if (paymentAmount !== undefined && paymentAmount !== null) {
      requestData.paymentAmount = paymentAmount;
    }
    
    return apiService.put<any>(`/api/subscriptions/${id}/add-classes`, requestData);
  }

  async removeClassesFromSubscription(id: string | number, classesToRemove: number, reason?: string): Promise<ApiResponse<any>> {
    //console.log('🎮 removeClassesFromSubscription called with:', { id, classesToRemove, reason });
    
    if (this.useSupabase()) {
      try {
        //console.log('🎮 Using Supabase client for removeClassesFromSubscription');
        
        // Use Supabase client directly for admin/reception operations
        const { data: subscriptions, error: fetchError } = await supabase
          .from('user_subscriptions')
          .select('*, subscription_plans!inner(name, monthly_price, monthly_classes)')
          .eq('id', id);

        if (fetchError) {
          console.error('❌ Error fetching subscription:', fetchError);
          return {
            success: false,
            error: `Failed to fetch subscription: ${fetchError.message}`
          };
        }

        if (!subscriptions || subscriptions.length === 0) {
          return {
            success: false,
            error: 'Subscription not found'
          };
        }

        const subscription = subscriptions[0];
        
        if (subscription.status !== 'active') {
          return {
            success: false,
            error: 'Can only remove classes from active subscriptions'
          };
        }

        // Calculate new remaining classes
        const newRemainingClasses = Math.max(0, subscription.remaining_classes - classesToRemove);
        
        // Update the subscription using Supabase client
        const { data: updatedData, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            remaining_classes: newRemainingClasses,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();

        if (updateError) {
          console.error('❌ Error updating subscription:', updateError);
          return {
            success: false,
            error: `Failed to update subscription: ${updateError.message}`
          };
        }

        //console.log('✅ Classes removed successfully via Supabase');
        return {
          success: true,
          data: {
            message: 'Classes removed successfully',
            newRemainingClasses,
            classesRemoved: classesToRemove
          }
        };
      } catch (error) {
        console.error('❌ Error removing classes via Supabase:', error);
        return {
          success: false,
          error: `Failed to remove classes: ${error}`
        };
      }
    }

    // Fallback to REST API
    return apiService.put<any>(`/api/subscriptions/${id}/remove-classes`, {
      classesToRemove,
      reason: reason || 'Class removal by reception'
    });
  }

  async assignSubscriptionToUser(userId: number, planId: number): Promise<ApiResponse<any>> {
    return apiService.post(`/api/subscriptions/assign`, {
      userId,
      planId,
      paymentMethod: 'reception_assignment'
    });
  }

  async getPlanStatistics(): Promise<ApiResponse<{ [planId: number]: { activeSubscriptions: number; totalRevenue: number; averagePrice: number; popularityRank: number } }>> {
    try {
      if (this.useSupabase()) {
        //console.log('🔧 Using Supabase to fetch plan statistics');
        
        // 1. Get all subscription plans with their monthly_price
        const { data: plans, error: plansError } = await supabase
          .from('subscription_plans')
          .select('id, name, monthly_price');

        if (plansError) {
          console.error('❌ Error fetching plans:', plansError);
          return { success: false, error: 'Failed to fetch plans' };
        }

        const statsMap: { [planId: number]: { activeSubscriptions: number; totalRevenue: number; averagePrice: number; popularityRank: number } } = {};
        
        // Initialize stats for all plans, and filter out plans with invalid IDs
        const validPlans = (plans || []).filter(plan => plan.id !== null && plan.id !== undefined);

        for (const plan of validPlans) {
          statsMap[plan.id] = {
            activeSubscriptions: 0,
            totalRevenue: 0,
            averagePrice: plan.monthly_price || 0,
            popularityRank: 0
          };
        }

        // 2. Get all active user subscriptions to count active subscriptions per plan
        const { data: activeUserSubscriptions, error: activeSubsError } = await supabase
          .from('user_subscriptions')
          .select('plan_id')
          .eq('status', 'active');

        if (activeSubsError) {
          console.error('❌ Error fetching active user subscriptions:', activeSubsError);
          return { success: false, error: 'Failed to fetch active subscriptions' };
        }

        // Populate active subscription counts in statsMap
        for (const sub of activeUserSubscriptions || []) {
          if (sub.plan_id && statsMap[sub.plan_id]) {
            statsMap[sub.plan_id].activeSubscriptions++;
          }
        }

        // 3. Get all completed payments and their associated user_subscription_id
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, subscription_id')
          .eq('status', 'completed');

        if (paymentsError) {
          console.error('❌ Error fetching payments:', paymentsError);
          return { success: false, error: 'Failed to fetch payments' };
        }

        // 4. Get all user subscriptions to map payment.subscription_id to plan_id
        const { data: allUserSubscriptions, error: allSubsError } = await supabase
          .from('user_subscriptions')
          .select('id, plan_id');

        if (allSubsError) {
          console.error('❌ Error fetching all user subscriptions for revenue mapping:', allSubsError);
          return { success: false, error: 'Failed to map payments to plans' };
        }

        const subIdToPlanIdMap = new Map<number, number>();
        for (const sub of allUserSubscriptions || []) {
          if (sub.id && sub.plan_id) {
            subIdToPlanIdMap.set(sub.id, sub.plan_id);
          }
        }

        // Populate total revenue in statsMap
        for (const payment of payments || []) {
          if (payment.subscription_id && subIdToPlanIdMap.has(payment.subscription_id)) {
            const planId = subIdToPlanIdMap.get(payment.subscription_id);
            if (planId && statsMap[planId]) {
              statsMap[planId].totalRevenue += (payment.amount || 0);
            }
          }
        }
 
        // Calculate popularity ranks based on active subscriptions
        const finalSortedPlans = Object.entries(statsMap).sort(([, a], [, b]) => b.activeSubscriptions - a.activeSubscriptions);
        finalSortedPlans.forEach(([planIdStr], index) => {
          const planIdNum = parseInt(planIdStr, 10);
          if (!isNaN(planIdNum) && statsMap[planIdNum]) {
            statsMap[planIdNum].popularityRank = index + 1;
          }
        });

        //console.log('✅ Plan statistics fetched successfully:', statsMap);
        return { success: true, data: statsMap };
 
      } else {
        // SQLite fallback - use REST API
        return apiService.get('/api/plans/statistics');
      }
    } catch (error) {
      console.error('❌ Error fetching plan statistics:', error);
      return { success: false, error: 'Failed to fetch plan statistics' };
    }
  }
  // Method to get clients without active subscriptions
  async getClientsWithoutActiveSubscriptions(): Promise<ApiResponse<ClientWithoutSubscription[]>> {
    try {
      if (!this.useSupabase()) {
        return { success: false, error: 'Supabase mode required for this operation' };
      }

      // First, run expiration cleanup to ensure expired subscriptions are marked correctly
      await this.runExpirationCleanup();

      // Get all clients with their latest subscription status
      const { data: clients, error: clientsError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone,
          join_date,
          status,
          role
        `)
        .eq('role', 'client')
        .eq('status', 'active');

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return { success: false, error: clientsError.message };
      }

      if (!clients || clients.length === 0) {
        return { success: true, data: [] };
      }

      // Get all subscriptions to check status
      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          status,
          end_date,
          created_at,
          subscription_plans:plan_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        return { success: false, error: subscriptionsError.message };
      }

      const today = new Date().toISOString().split('T')[0];
      const clientsWithoutActiveSubscriptions: ClientWithoutSubscription[] = [];

      for (const client of clients) {
        // Find all subscriptions for this client
        const clientSubscriptions = subscriptions?.filter(sub => sub.user_id === client.id) || [];
        
        // Check if client has any active subscription
        const hasActiveSubscription = clientSubscriptions.some(sub => 
          sub.status === 'active' && sub.end_date >= today
        );

        if (!hasActiveSubscription) {
          // Find the most recent subscription (if any) for previous subscription info
          const lastSubscription = clientSubscriptions.length > 0 ? clientSubscriptions[0] : null;
          
          clientsWithoutActiveSubscriptions.push({
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            join_date: client.join_date,
            status: client.status,
            has_previous_subscription: clientSubscriptions.length > 0,
            last_subscription: lastSubscription ? {
              plan_name: (lastSubscription.subscription_plans as any)?.name || 'Unknown Plan',
              end_date: lastSubscription.end_date,
              status: lastSubscription.status
            } : undefined
          });
        }
      }

      return { success: true, data: clientsWithoutActiveSubscriptions };
    } catch (error) {
      console.error('Failed to fetch clients without active subscriptions:', error);
      return { success: false, error: 'Failed to fetch clients without active subscriptions' };
    }
  }

  // Helper method to run expiration cleanup for all users
  private async runExpirationCleanup(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get all expired subscriptions that are still marked as active
      const { data: expiredSubs, error: expiredError } = await supabase
        .from('user_subscriptions')
        .select('id, end_date')
        .eq('status', 'active')
        .lt('end_date', today);
      
      if (expiredError) {
        console.error('Error checking for expired subscriptions:', expiredError);
        return;
      }
      
      if (expiredSubs && expiredSubs.length > 0) {
        // Update expired subscriptions to 'expired' status
        const expiredIds = expiredSubs.map(sub => sub.id);
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString() 
          })
          .in('id', expiredIds);
        
        if (updateError) {
          console.error('❌ Error updating expired subscriptions:', updateError);
        } else {
        }
      }
    } catch (error) {
      console.error('Error during expiration cleanup:', error);
    }
  }

  // Get subscription history for a user - NEW METHOD
  async getSubscriptionHistory(): Promise<ApiResponse<UserSubscription[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans (
            name,
            monthly_classes,
            equipment_access,
            monthly_price,
            duration,
            duration_unit,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching subscription history:', error);
        return { success: false, error: error.message };
      }

      // Transform the data to match the expected format
      const transformedSubscriptions = subscriptions?.map(sub => ({
        ...sub,
        plan_name: sub.subscription_plans?.name || 'Unknown Plan',
        monthly_classes: sub.subscription_plans?.monthly_classes || 0,
        equipment_access: sub.subscription_plans?.equipment_access || 'mat',
        monthly_price: sub.subscription_plans?.monthly_price || 0,
        duration: sub.subscription_plans?.duration || 1,
        duration_unit: sub.subscription_plans?.duration_unit || 'months',
        category: sub.subscription_plans?.category || 'group'
      })) || [];

      return { success: true, data: transformedSubscriptions };
    } catch (error) {
      console.error('Error in getSubscriptionHistory:', error);
      return { success: false, error: 'Failed to fetch subscription history' };
    }
  }

  // Automatic daily notification checking
  static lastNotificationCheck: { [key: string]: string } = {};

  async checkAndSendAutomaticNotifications(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const checkKey = 'daily_notification_check';

    // Only run once per day
    if (SubscriptionService.lastNotificationCheck[checkKey] === today) {
      return;
    }

    try {
      console.log('🔔 [DAILY CHECK] Running automatic subscription notifications...');
      
      // Send expiring notifications (5 days warning)
      const expiringResult = await notificationService.sendSubscriptionExpiryNotifications();
      if (expiringResult.success) {
        const expiringCount = expiringResult.data?.notificationCount || 0;
        console.log(`📅 [DAILY CHECK] Sent ${expiringCount} expiring subscription notifications`);
      }

      // Send expired notifications
      const expiredResult = await notificationService.sendSubscriptionExpiredNotifications();
      if (expiredResult.success) {
        const expiredCount = expiredResult.data?.notificationCount || 0;
        console.log(`❌ [DAILY CHECK] Sent ${expiredCount} expired subscription notifications`);
      }

      // Mark as completed for today
      SubscriptionService.lastNotificationCheck[checkKey] = today;
      console.log('✅ [DAILY CHECK] Automatic notification check completed');

    } catch (error) {
      console.error('❌ [DAILY CHECK] Error in automatic notification check:', error);
    }
  }
}

export const subscriptionService = new SubscriptionService(); 