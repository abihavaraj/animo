import { API_MODE_CONFIG } from '../config/apiMode.config';
import { devLog } from '../utils/devUtils';
import { apiService } from './api';
import { supabaseApiService } from './supabaseApi';

// Unified API Service that switches between REST and Supabase
class UnifiedApiService {
  private currentMode = API_MODE_CONFIG.currentMode;
  private fallbackMode = API_MODE_CONFIG.fallbackMode;

  // Helper to get the appropriate service
  private getService() {
    if (this.currentMode === 'SUPABASE') {
      return supabaseApiService;
    } else {
      return apiService;
    }
  }

  // Helper to get fallback service
  private getFallbackService() {
    if (this.fallbackMode === 'SUPABASE') {
      return supabaseApiService;
    } else {
      return apiService;
    }
  }

  // Generic method with fallback
  private async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      devLog(`🔄 Using ${this.currentMode} API`);
      return await primaryOperation();
    } catch (error) {
      devLog(`⚠️ ${this.currentMode} failed, falling back to ${this.fallbackMode}`);
      return await fallbackOperation();
    }
  }

  // ===== AUTHENTICATION =====
  async signUp(email: string, password: string, userData: any) {
    return this.withFallback(
      () => supabaseApiService.signUp(email, password, userData),
      () => apiService.post('/auth/signup', { email, password, ...userData })
    );
  }

  async signIn(email: string, password: string) {
    return this.withFallback(
      () => supabaseApiService.signIn(email, password),
      () => apiService.post('/auth/signin', { email, password })
    );
  }

  async signOut() {
    return this.withFallback(
      () => supabaseApiService.signOut(),
      () => apiService.post('/auth/signout')
    );
  }

  async getCurrentUser() {
    return this.withFallback(
      () => supabaseApiService.getCurrentUser(),
      () => apiService.get('/auth/me')
    );
  }

  // ===== CLASSES =====
  async getClasses() {
    return this.withFallback(
      () => supabaseApiService.getClasses(),
      () => apiService.get('/classes')
    );
  }

  async getClassById(id: string) {
    return this.withFallback(
      () => supabaseApiService.getClassById(id),
      () => apiService.get(`/classes/${id}`)
    );
  }

  async createClass(classData: any) {
    return this.withFallback(
      () => supabaseApiService.createClass(classData),
      () => apiService.post('/classes', classData)
    );
  }

  async updateClass(id: string, updates: any) {
    return this.withFallback(
      () => supabaseApiService.updateClass(id, updates),
      () => apiService.put(`/classes/${id}`, updates)
    );
  }

  async deleteClass(id: string) {
    return this.withFallback(
      () => supabaseApiService.deleteClass(id),
      () => apiService.delete(`/classes/${id}`)
    );
  }

  // ===== BOOKINGS =====
  async getBookings(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getBookings(userId),
      () => apiService.get(`/bookings${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createBooking(bookingData: any) {
    return this.withFallback(
      () => supabaseApiService.createBooking(bookingData),
      () => apiService.post('/bookings', bookingData)
    );
  }

  async cancelBooking(id: string) {
    return this.withFallback(
      () => supabaseApiService.cancelBooking(id),
      () => apiService.put(`/bookings/${id}/cancel`)
    );
  }

  // ===== USERS =====
  async getUsers() {
    return this.withFallback(
      () => supabaseApiService.getUsers(),
      () => apiService.get('/users')
    );
  }

  async getUserById(id: string) {
    return this.withFallback(
      () => supabaseApiService.getUserById(id),
      () => apiService.get(`/users/${id}`)
    );
  }

  async updateUser(id: string, updates: any) {
    return this.withFallback(
      () => supabaseApiService.updateUser(id, updates),
      () => apiService.put(`/users/${id}`, updates)
    );
  }

  // ===== SUBSCRIPTIONS =====
  async getSubscriptions(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getSubscriptions(userId),
      () => apiService.get(`/subscriptions${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createSubscription(subscriptionData: any) {
    return this.withFallback(
      () => supabaseApiService.createSubscription(subscriptionData),
      () => apiService.post('/subscriptions', subscriptionData)
    );
  }

  // ===== PAYMENTS =====
  async getPayments(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getPayments(userId),
      () => apiService.get(`/payments${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createPayment(paymentData: any) {
    return this.withFallback(
      () => supabaseApiService.createPayment(paymentData),
      () => apiService.post('/payments', paymentData)
    );
  }

  // ===== NOTIFICATIONS =====
  async getNotifications(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getNotifications(userId),
      () => apiService.get(`/notifications${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createNotification(notificationData: any) {
    return this.withFallback(
      () => supabaseApiService.createNotification(notificationData),
      () => apiService.post('/notifications', notificationData)
    );
  }

  // ===== REAL-TIME SUBSCRIPTIONS (Supabase only) =====
  subscribeToClasses(callback: (payload: any) => void) {
    if (this.currentMode === 'SUPABASE') {
      return supabaseApiService.subscribeToClasses(callback);
    } else {
      devLog('⚠️ Real-time subscriptions only available with Supabase');
      return null;
    }
  }

  subscribeToBookings(callback: (payload: any) => void) {
    if (this.currentMode === 'SUPABASE') {
      return supabaseApiService.subscribeToBookings(callback);
    } else {
      devLog('⚠️ Real-time subscriptions only available with Supabase');
      return null;
    }
  }

  subscribeToNotifications(callback: (payload: any) => void) {
    if (this.currentMode === 'SUPABASE') {
      return supabaseApiService.subscribeToNotifications(callback);
    } else {
      devLog('⚠️ Real-time subscriptions only available with Supabase');
      return null;
    }
  }

  // ===== MODE MANAGEMENT =====
  setMode(mode: 'REST' | 'SUPABASE' | 'HYBRID') {
    this.currentMode = mode;
    devLog(`🔄 API mode changed to: ${mode}`);
  }

  getCurrentMode() {
    return this.currentMode;
  }

  isRealTimeEnabled() {
    return API_MODE_CONFIG.enableRealTime && this.currentMode === 'SUPABASE';
  }
}

export const unifiedApiService = new UnifiedApiService();
