import { API_CONFIG } from '../config/api.config';
import { supabase } from '../config/supabase.config';
import { devLog } from '../utils/devUtils';

// Types for Supabase responses
interface SupabaseResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class SupabaseApiService {
  private supabase = supabase;

  // Generic method to handle Supabase responses
  private handleResponse<T>(response: any, error: any): SupabaseResponse<T> {
    if (error) {
      devLog('❌ Supabase error:', error);
      return {
        success: false,
        error: error.message || 'Supabase operation failed',
      };
    }

    return {
      success: true,
      data: response.data as T,
    };
  }

  // ===== AUTHENTICATION =====
  async signUp(email: string, password: string, userData: any) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return this.handleResponse(data, error);
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    return this.handleResponse(data, error);
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return this.handleResponse(null, error);
  }

  async getCurrentUser() {
    const { data: { user }, error } = await this.supabase.auth.getUser();
    return this.handleResponse(user, error);
  }

  // ===== CLASSES =====
  async getClasses() {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.CLASSES)
      .select('*')
      .order('created_at', { ascending: false });
    return this.handleResponse(data, error);
  }

  async getClassById(id: string) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.CLASSES)
      .select('*')
      .eq('id', id)
      .single();
    return this.handleResponse(data, error);
  }

  async createClass(classData: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.CLASSES)
      .insert(classData)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  async updateClass(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.CLASSES)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  async deleteClass(id: string) {
    const { error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.CLASSES)
      .delete()
      .eq('id', id);
    return this.handleResponse(null, error);
  }

  // ===== BOOKINGS =====
  async getBookings(userId?: string) {
    let query = this.supabase
      .from(API_CONFIG.ENDPOINTS.BOOKINGS)
      .select('*, classes(*)')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    return this.handleResponse(data, error);
  }

  async createBooking(bookingData: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.BOOKINGS)
      .insert(bookingData)
      .select('*, classes(*)')
      .single();
    return this.handleResponse(data, error);
  }

  async cancelBooking(id: string) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.BOOKINGS)
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  // ===== USERS =====
  async getUsers() {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.USERS)
      .select('*')
      .order('created_at', { ascending: false });
    return this.handleResponse(data, error);
  }

  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.USERS)
      .select('*')
      .eq('id', id)
      .single();
    return this.handleResponse(data, error);
  }

  async updateUser(id: string, updates: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.USERS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  // ===== SUBSCRIPTIONS =====
  async getSubscriptions(userId?: string) {
    let query = this.supabase
      .from(API_CONFIG.ENDPOINTS.SUBSCRIPTIONS)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    return this.handleResponse(data, error);
  }

  async createSubscription(subscriptionData: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.SUBSCRIPTIONS)
      .insert(subscriptionData)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  // ===== PAYMENTS =====
  async getPayments(userId?: string) {
    let query = this.supabase
      .from(API_CONFIG.ENDPOINTS.PAYMENTS)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    return this.handleResponse(data, error);
  }

  async createPayment(paymentData: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.PAYMENTS)
      .insert(paymentData)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  // ===== NOTIFICATIONS =====
  async getNotifications(userId?: string) {
    let query = this.supabase
      .from(API_CONFIG.ENDPOINTS.NOTIFICATIONS)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    return this.handleResponse(data, error);
  }

  async createNotification(notificationData: any) {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.NOTIFICATIONS)
      .insert(notificationData)
      .select()
      .single();
    return this.handleResponse(data, error);
  }

  // ===== REAL-TIME SUBSCRIPTIONS =====
  subscribeToTable(table: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(table)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table }, 
        callback
      )
      .subscribe();
  }

  // Subscribe to specific events
  subscribeToClasses(callback: (payload: any) => void) {
    return this.subscribeToTable(API_CONFIG.ENDPOINTS.CLASSES, callback);
  }

  subscribeToBookings(callback: (payload: any) => void) {
    return this.subscribeToTable(API_CONFIG.ENDPOINTS.BOOKINGS, callback);
  }

  subscribeToNotifications(callback: (payload: any) => void) {
    return this.subscribeToTable(API_CONFIG.ENDPOINTS.NOTIFICATIONS, callback);
  }
}

export const supabaseApiService = new SupabaseApiService();
export type { SupabaseResponse };
