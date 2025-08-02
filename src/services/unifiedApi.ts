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

  // Generic method with fallback - but skip Supabase if mode is REST
  private async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    // If current mode is REST, only use REST API
    if (this.currentMode === 'REST') {
      devLog(`🔄 Using REST API directly`);
      return await fallbackOperation();
    }
    
    try {
      devLog(`🔄 Using ${this.currentMode} API`);
      return await primaryOperation();
    } catch (error) {
      devLog(`⚠️ ${this.currentMode} failed, falling back to ${this.fallbackMode}`);
      return await fallbackOperation();
    }
  }

  // ===== AUTH =====
  async signUp(email: string, password: string, userData: any) {
    return this.withFallback(
      () => supabaseApiService.signUp(email, password, userData),
      () => apiService.post('/api/auth/signup', { email, password, ...userData })
    );
  }

  async signIn(email: string, password: string) {
    return this.withFallback(
      () => supabaseApiService.signIn(email, password),
      () => apiService.post('/api/auth/signin', { email, password })
    );
  }

  async signOut() {
    return this.withFallback(
      () => supabaseApiService.signOut(),
      () => apiService.post('/api/auth/signout', {})
    );
  }

  async getCurrentUser() {
    return this.withFallback(
      () => supabaseApiService.getCurrentUser(),
      () => apiService.get('/api/auth/me')
    );
  }

  // ===== CLASSES =====
  async getClasses() {
    return this.withFallback(
      () => supabaseApiService.getClasses(),
      () => apiService.get('/api/classes')
    );
  }

  async getClassById(id: string) {
    return this.withFallback(
      () => supabaseApiService.getClassById(id),
      () => apiService.get(`/api/classes/${id}`)
    );
  }

  async createClass(classData: any) {
    return this.withFallback(
      () => supabaseApiService.createClass(classData),
      () => apiService.post('/api/classes', classData)
    );
  }

  async updateClass(id: string, updates: any) {
    return this.withFallback(
      () => supabaseApiService.updateClass(id, updates),
      () => apiService.put(`/api/classes/${id}`, updates)
    );
  }

  async deleteClass(id: string) {
    return this.withFallback(
      () => supabaseApiService.deleteClass(id),
      () => apiService.delete(`/api/classes/${id}`)
    );
  }

  // ===== BOOKINGS =====
  async getBookings(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getBookings(userId),
      () => apiService.get(`/api/bookings${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createBooking(bookingData: any) {
    return this.withFallback(
      () => supabaseApiService.createBooking(bookingData),
      () => apiService.post('/api/bookings', bookingData)
    );
  }

  async cancelBooking(id: string) {
    return this.withFallback(
      () => supabaseApiService.cancelBooking(id),
      () => apiService.put(`/api/bookings/${id}/cancel`, {})
    );
  }

  // ===== USERS =====
  async getUsers() {
    return this.withFallback(
      () => supabaseApiService.getUsers(),
      () => apiService.get('/api/users')
    );
  }

  async getUserById(id: string) {
    return this.withFallback(
      () => supabaseApiService.getUserById(id),
      () => apiService.get(`/api/users/${id}`)
    );
  }

  async updateUser(id: string, updates: any) {
    return this.withFallback(
      () => supabaseApiService.updateUser(id, updates),
      () => apiService.put(`/api/users/${id}`, updates)
    );
  }

  // ===== SUBSCRIPTIONS =====
  async getSubscriptions(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getSubscriptions(userId),
      () => apiService.get(`/api/subscriptions${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async getSubscriptionPlans() {
    return this.withFallback(
      () => supabaseApiService.getSubscriptionPlans(),
      () => apiService.get('/api/plans')
    );
  }

  async createSubscription(subscriptionData: any) {
    return this.withFallback(
      () => supabaseApiService.createSubscription(subscriptionData),
      () => apiService.post('/api/subscriptions', subscriptionData)
    );
  }

  // ===== PAYMENTS =====
  async getPayments(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getPayments(userId),
      () => apiService.get(`/api/payments${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createPayment(paymentData: any) {
    return this.withFallback(
      () => supabaseApiService.createPayment(paymentData),
      () => apiService.post('/api/payments', paymentData)
    );
  }

  // ===== NOTIFICATIONS =====
  async getNotifications(userId?: string) {
    return this.withFallback(
      () => supabaseApiService.getNotifications(userId),
      () => apiService.get(`/api/notifications${userId ? `?userId=${userId}` : ''}`)
    );
  }

  async createNotification(notificationData: any) {
    return this.withFallback(
      () => supabaseApiService.createNotification(notificationData),
      () => apiService.post('/api/notifications', notificationData)
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
  setMode(mode: 'REST' | 'SUPABASE') {
    this.currentMode = mode;
    devLog(`🔄 API mode changed to: ${mode}`);
  }

  getCurrentMode() {
    return this.currentMode;
  }

  isRealTimeEnabled() {
    return this.currentMode === 'SUPABASE';
  }

  // ===== LOGGING AND DEBUGGING =====
  logConfiguration() {
    console.log('🔧 UnifiedAPI Configuration:');
    console.log(`   Current Mode: ${this.currentMode}`);
    console.log(`   Fallback Mode: ${this.fallbackMode}`);
    console.log(`   Enable Fallback: ${API_MODE_CONFIG.enableFallback}`);
    console.log(`   Real-time Enabled: ${this.isRealTimeEnabled()}`);
  }

  // ===== MODE SWITCHING METHODS =====
  switchToRest() {
    this.setMode('REST');
    devLog('🔄 Switched to REST API mode');
  }

  switchToSupabase() {
    this.setMode('SUPABASE');
    devLog('🔄 Switched to Supabase API mode');
  }

  switchToHybrid() {
    // Since we removed HYBRID mode from the config, this will default to current behavior
    // which is to use Supabase with REST fallback
    this.setMode('SUPABASE');
    devLog('🔄 Switched to Hybrid mode (Supabase with REST fallback)');
  }
}

export const unifiedApiService = new UnifiedApiService();
