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
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to create booking' };
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
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to cancel booking' };
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