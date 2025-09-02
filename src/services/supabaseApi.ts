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
  private handleResponse<T>(data: any, error: any): SupabaseResponse<T> {
    if (error) {
      devLog('❌ Supabase error:', error);
      
      // Handle specific error types
      let errorMessage = 'Supabase operation failed';
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials.';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: data as T,
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

  async signIn(emailOrPhone: string, password: string) {
    try {
      devLog('🔐 Attempting Supabase sign in for:', emailOrPhone);
      
      let actualEmail = emailOrPhone;
      
      // Check if input is a phone number or email
      const isPhoneNumber = this.isPhoneNumber(emailOrPhone);
      
      if (isPhoneNumber) {
        devLog('📱 Input detected as phone number, looking up email...');
        
        // Look up user by phone to get their email
        const { data: userData, error: lookupError } = await this.supabase
          .from('users')
          .select('email, phone')
          .eq('phone', emailOrPhone)
          .single();
        
        if (lookupError || !userData) {
          devLog('❌ Phone number not found in database:', lookupError);
          return this.handleResponse(null, { 
            message: 'No account found with this phone number. Please check your phone number or contact reception.' 
          });
        }
        
        actualEmail = userData.email;
        devLog('✅ Found email for phone number:', actualEmail);
      } else {
        devLog('📧 Input detected as email address');
      }
      
      // Now authenticate with Supabase using the email
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: actualEmail,
        password,
      });
      
      if (error) {
        devLog('❌ Supabase sign in error:', error);
        return this.handleResponse(null, error);
      } else if (data) {
        devLog('✅ Supabase sign in successful for user:', data.user?.email);
        
        // After successful auth, fetch complete user profile from users table
        try {
          devLog('🔍 Fetching user profile from database...');
          const { data: userProfile, error: profileError } = await this.supabase
            .from('users')
            .select('*')
            .eq('email', actualEmail)
            .single();
          
          if (profileError) {
            devLog('⚠️ Could not fetch user profile from database:', profileError);
            // Fall back to auth data
            const formattedData = {
              user: data.user,
              token: data.session?.access_token
            };
            return this.handleResponse(formattedData, null);
          }
          
          if (userProfile) {
            devLog('✅ User profile fetched from database, role:', userProfile.role);
            
            // Merge auth user with database profile
            const enrichedUser = {
              ...data.user,
              // Override with database fields
              name: userProfile.name,
              role: userProfile.role,
              phone: userProfile.phone,
              emergency_contact: userProfile.emergency_contact,
              medical_conditions: userProfile.medical_conditions,
              referral_source: userProfile.referral_source,
              join_date: userProfile.join_date,
              status: userProfile.status,
              created_at: userProfile.created_at,
              updated_at: userProfile.updated_at,
              // Also set in user_metadata for compatibility
              user_metadata: {
                ...data.user.user_metadata,
                name: userProfile.name,
                role: userProfile.role,
                phone: userProfile.phone,
                emergency_contact: userProfile.emergency_contact,
                medical_conditions: userProfile.medical_conditions,
                referral_source: userProfile.referral_source
              }
            };
            
            const formattedData = {
              user: enrichedUser,
              token: data.session?.access_token
            };
            
            return this.handleResponse(formattedData, null);
          }
        } catch (dbError) {
          devLog('❌ Database lookup error:', dbError);
          // Fall back to auth data
        }
        
        // Fallback: Format the response to match what the auth service expects
        const formattedData = {
          user: data.user,
          token: data.session?.access_token
        };
        
        return this.handleResponse(formattedData, null);
      }
      
      return this.handleResponse(null, error);
    } catch (networkError) {
      devLog('❌ Network error during sign in:', networkError);
      return {
        success: false,
        error: 'Network error. Please check your internet connection and try again.',
      };
    }
  }

  // Helper method to detect if input is a phone number
  private isPhoneNumber(input: string): boolean {
    // Remove all non-digit characters except + for international numbers
    const cleaned = input.replace(/[^\d+]/g, '');
    
    // Check for common phone number patterns
    // This handles: +1234567890, 1234567890, +355691234567, etc.
    const phonePatterns = [
      /^\+?[1-9]\d{6,14}$/, // International format
      /^\d{10}$/,           // US 10-digit
      /^\+\d{10,15}$/       // International with +
    ];
    
    return phonePatterns.some(pattern => pattern.test(cleaned)) && 
           !input.includes('@'); // Make sure it's not an email
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return this.handleResponse(null, error);
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        return this.handleResponse(null, error);
      }
      
      if (!user) {
        return this.handleResponse(null, { message: 'No authenticated user' });
      }

      // Fetch complete user profile from database to get the correct role
      try {
        devLog('🔍 getCurrentUser: Fetching complete user profile from database...');
        const { data: userProfile, error: profileError } = await this.supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (profileError) {
          devLog('⚠️ getCurrentUser: Could not fetch user profile from database:', profileError);
          // Fall back to auth user data
          return this.handleResponse(user, null);
        }
        
        if (userProfile) {
          devLog('✅ getCurrentUser: User profile fetched from database, role:', userProfile.role);
          
          // Merge auth user with database profile
          const enrichedUser = {
            ...user,
            // Override with database fields
            name: userProfile.name,
            role: userProfile.role,
            phone: userProfile.phone,
            emergency_contact: userProfile.emergency_contact,
            medical_conditions: userProfile.medical_conditions,
            referral_source: userProfile.referral_source,
            join_date: userProfile.join_date,
            status: userProfile.status,
            created_at: userProfile.created_at,
            updated_at: userProfile.updated_at,
            // Also set in user_metadata for compatibility
            user_metadata: {
              ...user.user_metadata,
              name: userProfile.name,
              role: userProfile.role,
              phone: userProfile.phone,
              emergency_contact: userProfile.emergency_contact,
              medical_conditions: userProfile.medical_conditions,
              referral_source: userProfile.referral_source
            }
          };
          
          return this.handleResponse(enrichedUser, null);
        }
      } catch (dbError) {
        devLog('❌ getCurrentUser: Database lookup error:', dbError);
        // Fall back to auth user data
      }
      
      // Fallback: return auth user data
      return this.handleResponse(user, null);
    } catch (error) {
      devLog('❌ getCurrentUser: Error getting current user:', error);
      return this.handleResponse(null, error);
    }
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
      .select(`
        *,
        classes(id, name, date, time, duration, category, instructor_id),
        users(id, name, email, phone)
      `)
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    // Transform the data to match expected format for activities
    if (data && Array.isArray(data)) {
      const transformedData = data.map(booking => ({
        ...booking,
        user_name: booking.users?.name,
        user_email: booking.users?.email,
        class_name: booking.classes?.name,
        class_date: booking.classes?.date,
        class_time: booking.classes?.time,
        class_duration: booking.classes?.duration,
        class_category: booking.classes?.category,
        instructor_id: booking.classes?.instructor_id
      }));
      return this.handleResponse(transformedData, error);
    }
    
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

  async getSubscriptionPlans() {
    const { data, error } = await this.supabase
      .from(API_CONFIG.ENDPOINTS.PLANS)
      .select('*')
      .eq('is_active', true)
      .order('monthly_price', { ascending: true });
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

