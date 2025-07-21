import { supabase } from '../config/supabase.config';
import { ApiResponse } from './api';

export interface Booking {
  id: number;
  userId: number;
  classId: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  checkedIn: boolean;
  bookingDate: string;
  createdAt: string;
  updatedAt: string;
  
  // Backend fields (snake_case)
  user_id?: number;
  class_id?: number;
  checked_in?: boolean;
  booking_date?: string;
  created_at?: string;
  updated_at?: string;
  
  // Class details from JOIN query
  class_name?: string;
  class_date?: string;
  class_time?: string;
  class_level?: string;
  equipment_type?: string;
  room?: string;
  instructor_name?: string;
  
  class?: {
    id: number;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    instructorName: string;
    equipmentType: string;
  };
}

export interface BookingRequest {
  classId: number;
}

export interface BookingFilters {
  status?: string;
  from?: string;
  to?: string;
}

export interface WaitlistEntry {
  id: number;
  userId: number;
  classId: number;
  position: number;
  createdAt: string;
  className?: string;
  classDate?: string;
  classTime?: string;
  classLevel?: string;
  room?: string;
  instructorName?: string;
}

export interface WaitlistRequest {
  classId: number;
}

class BookingService {
  async getBookings(filters?: BookingFilters): Promise<ApiResponse<Booking[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      let query = supabase
        .from('bookings')
        .select(`
          *,
          classes (*),
          users!bookings_user_id_fkey (name, email)
        `)
        .eq('user_id', user.id);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get bookings' };
    }
  }

  async createBooking(bookingData: BookingRequest): Promise<ApiResponse<Booking>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // First, check if there's an existing booking for this user and class
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('class_id', bookingData.classId)
        .single();
      
      let result;
      
      if (existingBooking) {
        // Update existing booking (reactivate if cancelled)
        const { data, error } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            booking_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingBooking.id)
          .select(`
            *,
            classes (*),
            users!bookings_user_id_fkey (name, email)
          `)
          .single();
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        result = data;
      } else {
        // Create new booking
        const { data, error } = await supabase
          .from('bookings')
          .insert({
            user_id: user.id,
            class_id: bookingData.classId,
            status: 'confirmed',
            booking_date: new Date().toISOString()
          })
          .select(`
            *,
            classes (*),
            users!bookings_user_id_fkey (name, email)
          `)
          .single();
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        result = data;
      }
      
      // Update subscription: deduct classes from remaining_classes
      // Only deduct if this is a new booking or reactivating a cancelled one
      if (result && (existingBooking?.status === 'cancelled' || !existingBooking)) {
        await this.deductClassFromSubscription(user.id);
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to create booking' };
    }
  }

  private async deductClassFromSubscription(userId: string): Promise<void> {
    try {
      // Get the user's active subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gt('remaining_classes', 0)
        .single();

      if (subscription && subscription.remaining_classes > 0) {
        // Deduct one class
        await supabase
          .from('user_subscriptions')
          .update({
            remaining_classes: subscription.remaining_classes - 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        
        console.log(`✅ Deducted 1 class from subscription. Remaining: ${subscription.remaining_classes - 1}`);
      }
    } catch (error) {
      console.error('❌ Failed to deduct class from subscription:', error);
      // Don't throw error here to avoid breaking the booking process
    }
  }

  async cancelBooking(id: number): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          classes (*),
          users!bookings_user_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Restore class back to subscription when booking is cancelled
      if (data && data.user_id) {
        await this.restoreClassToSubscription(data.user_id);
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to cancel booking' };
    }
  }

  private async restoreClassToSubscription(userId: string): Promise<void> {
    try {
      // Get the user's active subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes, monthly_classes')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (subscription) {
        // Restore one class (but don't exceed monthly limit)
        const newRemainingClasses = Math.min(
          subscription.remaining_classes + 1,
          subscription.monthly_classes
        );
        
        await supabase
          .from('user_subscriptions')
          .update({
            remaining_classes: newRemainingClasses,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id);
        
        console.log(`✅ Restored 1 class to subscription. Remaining: ${newRemainingClasses}`);
      }
    } catch (error) {
      console.error('❌ Failed to restore class to subscription:', error);
      // Don't throw error here to avoid breaking the cancellation process
    }
  }

  async checkIn(id: number): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          checked_in: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          classes (*),
          users!bookings_user_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to check in' };
    }
  }

  async markCompleted(id: number): Promise<ApiResponse<Booking>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          classes (*),
          users!bookings_user_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to mark as completed' };
    }
  }

  async getClassAttendees(classId: number): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          users!bookings_user_id_fkey (name, email, medical_conditions)
        `)
        .eq('class_id', classId)
        .eq('status', 'confirmed');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get class attendees' };
    }
  }

  async joinWaitlist(waitlistData: WaitlistRequest): Promise<ApiResponse<WaitlistEntry>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          user_id: user.id,
          class_id: waitlistData.classId,
          position: 1 // This should be calculated based on existing waitlist
        })
        .select(`
          *,
          classes (name, date, time, level, room)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to join waitlist' };
    }
  }

  async leaveWaitlist(waitlistId: number): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', waitlistId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to leave waitlist' };
    }
  }

  async getUserWaitlist(userId?: number): Promise<ApiResponse<WaitlistEntry[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const { data, error } = await supabase
        .from('waitlist')
        .select(`
          *,
          classes (name, date, time, level, room)
        `)
        .eq('user_id', user.id);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get user waitlist' };
    }
  }

  async getClassWaitlist(classId: number): Promise<ApiResponse<WaitlistEntry[]>> {
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select(`
          *,
          users!waitlist_user_id_fkey (name, email)
        `)
        .eq('class_id', classId)
        .order('position', { ascending: true });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Failed to get class waitlist' };
    }
  }

  // Admin/Reception methods
  async assignClientToClass(userId: number, classId: number, notes?: string, overrideRestrictions?: boolean): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          class_id: classId,
          status: 'confirmed',
          booking_date: new Date().toISOString(),
          notes: notes || ''
        })
        .select(`
          *,
          classes (*),
          users!bookings_user_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to assign client to class' };
    }
  }

  async cancelClientBooking(userId: number, classId: number, notes?: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          notes: notes || ''
        })
        .eq('user_id', userId)
        .eq('class_id', classId)
        .select(`
          *,
          classes (*),
          users!bookings_user_id_fkey (name, email)
        `)
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to cancel client booking' };
    }
  }
}

export const bookingService = new BookingService(); 