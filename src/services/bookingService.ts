import { supabase } from '../config/supabase.config';
import { notificationService } from './notificationService';
import { pushNotificationService } from './pushNotificationService';

// Define ApiResponse interface locally
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

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
  
  // Supabase joined class data (using proper table name 'classes')
  classes?: {
    id: string;
    name: string;
    date: string;
    time: string;
    duration: number;
    category: string;
    capacity: number;
    equipment_type: string;
    room: string;
    status: string;
    instructor_id: string;
    users?: {
      name: string;
    };
  };
  
  // Supabase joined user data
  users?: {
    id: string;
    name: string;
    email: string;
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
          classes (
            id,
            name,
            date,
            time,
            duration,
            category,
            capacity,
            equipment_type,
            room,
            status,
            instructor_id,
            users!classes_instructor_id_fkey (name)
          ),
          users!bookings_user_id_fkey (name, email)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Supabase error fetching bookings:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error in getBookings:', error);
      return { success: false, error: 'Failed to get bookings' };
    }
  }

  async getBookingStatsForUser(userId: number | string): Promise<ApiResponse<any>> {
    try {
      // Simplified query using actual bookings table columns
      let query = supabase
        .from('bookings')
        .select('status, class_id, booking_date, created_at')
        .eq('user_id', userId);
      
      const { data: bookings, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      if (!bookings || bookings.length === 0) {
        return { success: true, data: {
          totalBookings: 0,
          statusBreakdown: {},
          attendanceRate: 0,
          favoriteInstructor: 'N/A',
          lastActivity: null
        }};
      }
      
      const statusBreakdown = bookings.reduce((acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });
      
      const completedBookings = statusBreakdown['completed'] || 0;
      const totalBookings = bookings.length;
      const attendanceRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
      
      // Simplified instructor and activity logic without complex joins
      const favoriteInstructor = 'N/A'; // Would need separate instructor lookup
        
      const lastActivity = bookings
        .filter(b => b.status === 'completed' && b.booking_date)
        .sort((a, b) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())[0];
        
      const lastActivityDetails = lastActivity ? {
        className: `Class ${lastActivity.class_id?.slice(0, 8) || 'Unknown'}`, // Use first 8 chars of class_id
        date: lastActivity.booking_date
      } : null;

      return { 
        success: true, 
        data: {
          totalBookings,
          statusBreakdown,
          attendanceRate,
          favoriteInstructor,
          lastActivity: lastActivityDetails
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to get booking stats' };
    }
  }

  async createBooking(bookingData: BookingRequest): Promise<ApiResponse<Booking | { waitlisted: true, position: number }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Get class details to check capacity
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('id, name, capacity, date, time')
        .eq('id', bookingData.classId)
        .single();
      
      if (classError) {
        return { success: false, error: 'Class not found' };
      }
      
      // Check if there's an existing booking for this user and class
      const { data: existingBooking } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('class_id', bookingData.classId)
        .single();
      
      // If user already has a confirmed booking, don't allow duplicate
      if (existingBooking && existingBooking.status === 'confirmed') {
        return { success: false, error: 'You already have a booking for this class' };
      }
      
      // Check current enrollment
      const { data: currentBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('class_id', bookingData.classId)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        return { success: false, error: 'Failed to check class availability' };
      }
      
      const currentEnrollment = currentBookings?.length || 0;
      
      // If class is full, add to waitlist
      if (currentEnrollment >= classDetails.capacity) {
        const waitlistResult = await this.joinWaitlist({ classId: bookingData.classId });
        if (waitlistResult.success && waitlistResult.data) {
          // Send waitlist notification
          await notificationService.sendClassNotification(
            bookingData.classId,
            'update',
            `You've been added to the waitlist for "${classDetails.name}" on ${new Date(classDetails.date).toLocaleDateString()}. You're position ${waitlistResult.data.position} on the list.`
          );
          
          return { 
            success: true, 
            data: { 
              waitlisted: true, 
              position: waitlistResult.data.position 
            } 
          };
        } else {
          return { success: false, error: waitlistResult.error || 'Failed to join waitlist' };
        }
      }
      
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
          .select('*')
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
          .select('*')
          .single();
        
        if (error) {
          return { success: false, error: error.message };
        }
        
        result = data;
      }
      
      // Update subscription: deduct classes from remaining_classes
      if (result && (existingBooking?.status === 'cancelled' || !existingBooking)) {
        await this.deductClassFromSubscription(user.id);
      }

      // Send booking confirmation notification
      if (result) {
        // 1. Get user's notification preferences
        const { data: userSettings } = await notificationService.getNotificationSettings();
        
        // 2. Send confirmation notification to the specific user
        await notificationService.sendClassNotification(
          bookingData.classId,
          'update',
          `✅ Booking confirmed for "${classDetails.name}" on ${new Date(classDetails.date).toLocaleDateString()} at ${classDetails.time}. See you there!`,
          [user.id]  // Pass the authenticated user ID
        );

        // 3. Schedule class reminder for this user based on their preferences
        await pushNotificationService.scheduleClassReminders(user.id);

        // 3. Schedule the reminder using the user's preference
        if (userSettings && userSettings.enableNotifications) {
          // Get full class details for scheduling
          const { data: fullClassDetails } = await supabase
            .from('classes')
            .select('*')
            .eq('id', bookingData.classId)
            .single();
            
          if (fullClassDetails) {
            await notificationService.scheduleClassNotifications(
              fullClassDetails, 
              userSettings.defaultReminderMinutes
            );
            console.log(`✅ Reminder scheduled for class ${classDetails.name} as per user preference.`);
          }
        }
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to create booking' };
    }
  }

  async cancelBooking(id: number): Promise<ApiResponse<Booking>> {
    try {
      
      // First get the booking details before cancelling
      const { data: originalBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('class_id, user_id, classes(name, date, time)')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('❌ Error fetching original booking:', fetchError);
        return { success: false, error: fetchError.message };
      }
      
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
        console.error('❌ Error cancelling booking:', error);
        return { success: false, error: error.message };
      }
      
      // Restore class back to subscription when booking is cancelled
      if (data && data.user_id) {
        await this.restoreClassToSubscription(data.user_id);
      } else {
        console.error('❌ No user_id found in cancelled booking data');
      }
      
      // Handle waitlist promotion if there's a waitlist for this class
      let waitlistPromoted = false;
      if (originalBooking && originalBooking.class_id) {
        waitlistPromoted = await this.promoteFromWaitlist(originalBooking.class_id);
      }
      
      // Return data with waitlist promotion info
      return { 
        success: true, 
        data: {
          ...data,
          waitlistPromoted
        }
      };
    } catch (error) {
      console.error('❌ Error in cancelBooking:', error);
      return { success: false, error: 'Failed to cancel booking' };
    }
  }

  private async restoreClassToSubscription(userId: string): Promise<void> {
    try {
      // Get the user's active subscription with graceful error handling for RLS
      const { data: subscription, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes, subscription_plans:plan_id(name, duration, duration_unit, monthly_classes)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log('📝 No active subscription found for class refund (user may not have subscription)');
        } else if (fetchError.message?.includes('406') || fetchError.code === '406') {
          console.log('📝 Cannot access subscription data for refund due to database permissions - skipping class restoration');
        } else {
          console.warn('⚠️ Error fetching subscription for refund:', fetchError);
        }
        return;
      }

      if (subscription) {
        // Always restore one class - users deserve their refund!
        const newRemainingClasses = subscription.remaining_classes + 1;
        
        const { data: updateData, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            remaining_classes: newRemainingClasses,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
          .select('remaining_classes')
          .single();
        
        if (updateError) {
          if (updateError.message?.includes('406') || updateError.code === '406') {
            console.log('📝 Cannot update subscription for refund due to database permissions - cancellation still processed');
          } else {
            console.warn('⚠️ Error updating subscription for refund:', updateError);
          }
          return;
        }
        
        const planName = (subscription.subscription_plans as any)?.name || 'Unknown Plan';
        console.log(`✅ SUCCESS: Refunded 1 class to ${planName} subscription!`);
        console.log(`📊 Class count: ${subscription.remaining_classes} → ${updateData?.remaining_classes || newRemainingClasses}`);
      } else {
        console.log('⚠️ No active subscription found for class refund');
        
        // Let's check if there are any subscriptions at all for this user
        const { data: allSubs } = await supabase
          .from('user_subscriptions')
          .select('id, status, remaining_classes, end_date')
          .eq('user_id', userId);
        
      }
    } catch (error) {
      console.error('❌ Error restoring class to subscription:', error);
    }
  }

  private async deductClassFromSubscription(userId: string | number): Promise<void> {
    try {
      // Ensure userId is string for Supabase UUID compatibility
      const userIdString = userId.toString();
      
      // Get the user's active subscription with graceful error handling for RLS
      const { data: subscription, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes, subscription_plans:plan_id(name, duration, duration_unit, monthly_classes)')
        .eq('user_id', userIdString)
        .eq('status', 'active')
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log('📝 No active subscription found for class deduction (user may not have subscription)');
        } else if (fetchError.message?.includes('406') || fetchError.code === '406') {
          console.log('📝 Cannot access subscription data for deduction due to database permissions - assignment still processed');
        } else {
          console.warn('⚠️ Error fetching subscription for deduction:', fetchError);
        }
        return;
      }

      if (subscription) {
        // Check if user has remaining classes
        if (subscription.remaining_classes <= 0) {
          console.warn('⚠️ User has no remaining classes to deduct');
          return;
        }
        
        // Deduct one class
        const newRemainingClasses = subscription.remaining_classes - 1;
        
        const { data: updateData, error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            remaining_classes: newRemainingClasses,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
          .select('remaining_classes')
          .single();
        
        if (updateError) {
          if (updateError.message?.includes('406') || updateError.code === '406') {
            console.log('📝 Cannot update subscription for deduction due to database permissions - assignment still processed');
          } else {
            console.warn('⚠️ Error updating subscription for deduction:', updateError);
          }
          return;
        }
        
        const planName = (subscription.subscription_plans as any)?.name || 'Unknown Plan';
        console.log(`✅ SUCCESS: Deducted 1 class from ${planName} subscription!`);
        console.log(`📊 Class count: ${subscription.remaining_classes} → ${updateData?.remaining_classes || newRemainingClasses}`);
      } else {
        console.log('⚠️ No active subscription found for class deduction');
        
        // Let's check if there are any subscriptions at all for this user
        const { data: allSubs } = await supabase
          .from('user_subscriptions')
          .select('id, status, remaining_classes, end_date')
          .eq('user_id', userIdString);
        
        console.log('📋 All subscriptions for user:', allSubs);
      }
    } catch (error) {
      console.error('❌ Error deducting class from subscription:', error);
    }
  }

  private async promoteFromWaitlist(classId: number): Promise<boolean> {
    try {
      // Get the first person on the waitlist for this class
      const { data: waitlistEntry, error } = await supabase
        .from('waitlist')
        .select(`
          *,
          users!waitlist_user_id_fkey (id, name, email),
          classes (name, date, time)
        `)
        .eq('class_id', classId)
        .order('position', { ascending: true })
        .limit(1)
        .single();
      
      if (error || !waitlistEntry) {
        return false;
      }
      
      // Check if the user already has a booking for this class
      console.log(`🔍 Checking for existing booking: user_id=${waitlistEntry.user_id}, class_id=${classId}`);
      
      const { data: existingBookings, error: existingError } = await supabase
        .from('bookings')
        .select('id, user_id, class_id, status')
        .eq('user_id', waitlistEntry.user_id)
        .eq('class_id', classId)
        .eq('status', 'confirmed');
      
      console.log(`🔍 Existing bookings query result:`, { existingBookings, existingError });
      
      if (existingBookings && existingBookings.length > 0) {
        console.log(`⚠️ User ${waitlistEntry.user_id} already has a booking for class ${classId}, removing from waitlist without creating duplicate booking`);
        
        // Remove the user from waitlist since they already have a booking
        await supabase
          .from('waitlist')
          .delete()
          .eq('id', waitlistEntry.id);
        
        // Update positions for remaining waitlist entries
        await this.updateWaitlistPositions(classId);
        
        // Try to promote the next person in line
        return await this.promoteFromWaitlist(classId);
      }
      
      // Create a booking for the first person on waitlist using upsert to handle race conditions
      console.log(`✅ No existing booking found, creating new booking for user ${waitlistEntry.user_id} class ${classId}`);
      
      const bookingData = {
        user_id: waitlistEntry.user_id,
        class_id: classId,
        status: 'confirmed',
        booking_date: new Date().toISOString()
      };
      
      console.log(`🔍 About to upsert booking (race-condition safe):`, bookingData);
      
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .upsert(bookingData, { 
          onConflict: 'user_id,class_id',
          ignoreDuplicates: false 
        })
        .select('*')
        .single();
      
      if (bookingError) {
        console.error('❌ Error creating booking for waitlist promotion:', bookingError);
        return false;
      }
      
      // Remove the user from the waitlist
      const { error: removeError } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', waitlistEntry.id);
      
      if (removeError) {
        console.error('❌ Error removing from waitlist:', removeError);
        // Even if we can't remove from waitlist, the booking was created
      }
      
      // Update positions for remaining waitlist entries
      await this.updateWaitlistPositions(classId);
      
      // Deduct class from user's subscription
      await this.deductClassFromSubscription(waitlistEntry.user_id);
      
      // Send promotion notification to the specific user
      const classInfo = waitlistEntry.classes as any;
      if (classInfo) {
        await notificationService.sendClassNotification(
          classId,
          'update',
          `🎉 Great news! You've been moved from the waitlist to confirmed for "${classInfo.name}" on ${new Date(classInfo.date).toLocaleDateString()} at ${classInfo.time}. See you there!`,
          [waitlistEntry.user_id]  // Pass the specific user ID
        );

        // Schedule class reminder for the promoted user based on their preferences
        await pushNotificationService.scheduleClassReminders(waitlistEntry.user_id);
      }
      
      console.log(`✅ Successfully promoted user ${waitlistEntry.user_id} from waitlist to booking for class ${classId}`);
      return true;
    } catch (error) {
      console.error('❌ Error in promoteFromWaitlist:', error);
      return false;
    }
  }

  private async updateWaitlistPositions(classId: number): Promise<void> {
    try {
      // Get all remaining waitlist entries for this class
      const { data: waitlistEntries } = await supabase
        .from('waitlist')
        .select('id')
        .eq('class_id', classId)
        .order('position', { ascending: true });
      
      if (waitlistEntries && waitlistEntries.length > 0) {
        // Update positions to be sequential (1, 2, 3, etc.)
        for (let i = 0; i < waitlistEntries.length; i++) {
          await supabase
            .from('waitlist')
            .update({ position: i + 1 })
            .eq('id', waitlistEntries[i].id);
        }
        
      }
    } catch (error) {
      console.error('❌ Error updating waitlist positions:', error);
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
          users!bookings_user_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('class_id', classId)
        .eq('status', 'confirmed');
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Transform the data to flatten user information
      const transformedData = (data || []).map(booking => ({
        ...booking,
        user_name: booking.users?.name,
        user_email: booking.users?.email,
        name: booking.users?.name, // Fallback for compatibility
        email: booking.users?.email // Fallback for compatibility
      }));
      
      return { success: true, data: transformedData };
    } catch (error) {
      return { success: false, error: 'Failed to get class attendees' };
    }
  }

  async getAllBookings(): Promise<ApiResponse<any[]>> {
    try {
      // First get all bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (bookingsError) {
        return { success: false, error: bookingsError.message };
      }

      if (!bookings || bookings.length === 0) {
        return { success: true, data: [] };
      }

      // Get unique user IDs
      const userIds = [...new Set(bookings.map(booking => booking.user_id))];
      
      // Get user information separately
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        // Return bookings without user info rather than failing completely
        return { success: true, data: bookings };
      }

      // Create a map of users for easy lookup
      const userMap = new Map();
      if (users) {
        users.forEach(user => {
          userMap.set(user.id, user);
        });
      }

      // Combine bookings with user information
      const enrichedBookings = bookings.map(booking => {
        const user = userMap.get(booking.user_id);
        return {
          ...booking,
          users: user || null
        };
      });
      
      return { success: true, data: enrichedBookings };
    } catch (error) {
      console.error('Error in getAllBookings:', error);
      return { success: false, error: 'Failed to get all bookings' };
    }
  }

  async updateBookingStatus(bookingId: number, status: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Failed to update booking status' };
    }
  }

  async joinWaitlist(waitlistData: WaitlistRequest): Promise<ApiResponse<WaitlistEntry>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if user is already on waitlist for this class
      const { data: existingEntry } = await supabase
        .from('waitlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('class_id', waitlistData.classId)
        .single();
      
      if (existingEntry) {
        return { success: false, error: 'You are already on the waitlist for this class' };
      }
      
      // Calculate the next position in waitlist
      const { data: existingWaitlist, error: countError } = await supabase
        .from('waitlist')
        .select('position')
        .eq('class_id', waitlistData.classId)
        .order('position', { ascending: false })
        .limit(1);
      
      if (countError) {
        console.error('❌ Error getting waitlist count:', countError);
        return { success: false, error: countError.message };
      }
      
      // Calculate next position (highest position + 1, or 1 if no one is on waitlist)
      const nextPosition = existingWaitlist && existingWaitlist.length > 0 
        ? existingWaitlist[0].position + 1 
        : 1;
      
      const { data, error } = await supabase
        .from('waitlist')
        .insert({
          user_id: user.id,
          class_id: waitlistData.classId,
          position: nextPosition
        })
        .select(`
          *,
          classes (name, date, time, room)
        `)
        .single();
      
      if (error) {
        console.error('❌ Error joining waitlist:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error in joinWaitlist:', error);
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

  async getUserWaitlist(userId?: number | string): Promise<ApiResponse<WaitlistEntry[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Use provided userId or fall back to authenticated user
      const targetUserId = userId ? (typeof userId === 'string' ? userId : userId.toString()) : user.id;
      
      const { data, error } = await supabase
        .from('waitlist')
        .select(`
          *,
          classes (
            id,
            name,
            date,
            time,
            duration,
            category,
            capacity,
            equipment_type,
            room,
            status,
            instructor_id,
            users!classes_instructor_id_fkey (name)
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error fetching waitlist:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error in getUserWaitlist:', error);
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

  // Admin/Reception methods - Simplified approach to avoid RLS issues
  async assignClientToClass(userId: number | string, classId: number | string, notes?: string, overrideRestrictions?: boolean): Promise<ApiResponse<any>> {
    try {
      console.log('🚀 Reception assignment starting...');
      console.log('📋 Parameters:', { userId, classId, overrideRestrictions });
      
      // Handle different ID types - UUIDs stay as strings, numbers stay as numbers
      let userIdValue: number | string;
      let classIdValue: number | string;
      
      if (typeof userId === 'string') {
        // Check if it's a UUID (contains hyphens) or a number string
        if (userId.includes('-')) {
          userIdValue = userId; // Keep UUID as string
        } else {
          userIdValue = parseInt(userId); // Convert number string to number
          if (isNaN(userIdValue)) {
            return { success: false, error: 'Invalid user ID' };
          }
        }
      } else {
        userIdValue = userId;
      }
      
      if (typeof classId === 'string') {
        // Check if it's a UUID (contains hyphens) or a number string
        if (classId.includes('-')) {
          classIdValue = classId; // Keep UUID as string
        } else {
          classIdValue = parseInt(classId); // Convert number string to number
          if (isNaN(classIdValue)) {
            return { success: false, error: 'Invalid class ID' };
          }
        }
      } else {
        classIdValue = classId;
      }

      // Check subscription status when override is OFF - use graceful error handling
      if (!overrideRestrictions) {
        try {
          const { data: subscription, error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .select('id, remaining_classes, subscription_plans:plan_id(name)')
            .eq('user_id', userIdValue)
            .eq('status', 'active')
            .single();
          
          if (subscriptionError && subscriptionError.code === 'PGRST116') {
            // No active subscription found
            return { 
              success: false, 
              error: 'Client does not have an active subscription. Please assign a subscription plan first, or use override to bypass restrictions.' 
            };
          }
          
          if (subscriptionError) {
            console.warn('⚠️ Subscription check failed, but continuing with override logic due to RLS restrictions');
            return { 
              success: false, 
              error: 'Cannot verify client subscription due to database permissions. Please use override to bypass restrictions or contact system administrator.' 
            };
          }
          
          // Check if user has remaining classes
          if (subscription && subscription.remaining_classes <= 0) {
            return { 
              success: false, 
              error: `Client has no remaining classes (${subscription.remaining_classes} left). Please add more classes to their subscription or use override to bypass restrictions.` 
            };
          }
          
          console.log('✅ Subscription check passed:', subscription);
        } catch (subError) {
          console.warn('⚠️ Subscription check failed with exception:', subError);
          return { 
            success: false, 
            error: 'Cannot verify client subscription status. Please use override to bypass restrictions or ensure client has an active subscription.' 
          };
        }
      }
      
      // Create the booking - this is the core operation
      try {
        // First check if booking already exists (graceful handling)
        let existingBooking = null;
        try {
          const { data, error } = await supabase
            .from('bookings')
            .select('id, status')
            .eq('user_id', userIdValue)
            .eq('class_id', classIdValue)
            .single();
          
          if (!error) {
            existingBooking = data;
          }
        } catch (checkError) {
          console.log('📝 No existing booking found, will create new one');
        }

        let result;

        if (existingBooking) {
          // Update existing booking
          const { data, error } = await supabase
            .from('bookings')
            .update({
              status: 'confirmed',
              booking_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingBooking.id)
            .select('*')
            .single();
          
          if (error) {
            console.error('Error updating booking:', error);
            return { success: false, error: `Failed to update booking: ${error.message}` };
          }
          
          result = data;
          console.log('✅ Updated existing booking');
        } else {
          // Create new booking with minimal required fields
          const bookingData: any = {
            user_id: userIdValue,
            class_id: classIdValue,
            status: 'confirmed',
            booking_date: new Date().toISOString()
          };

          const { data, error } = await supabase
            .from('bookings')
            .insert(bookingData)
            .select('*')
            .single();
          
          if (error) {
            console.error('Error creating booking:', error);
            console.error('Booking data attempted:', bookingData);
            return { success: false, error: `Failed to create booking: ${error.message}` };
          }
          
          result = data;
          console.log('✅ Created new booking');
        }
        
        // Handle subscription deduction only when override is OFF
        if (result && !overrideRestrictions) {
          try {
            await this.deductClassFromSubscription(userIdValue);
            console.log('✅ Reception assignment: Class deducted from user subscription');
          } catch (deductError) {
            console.warn('⚠️ Could not deduct class from subscription:', deductError);
            // Don't fail the entire operation if deduction fails
          }
        } else if (result) {
          console.log('✅ Reception assignment: Override enabled, no class deduction');
        }
        
        return { success: true, data: result };
      } catch (bookingError) {
        console.error('❌ Error creating/updating booking:', bookingError);
        return { success: false, error: 'Failed to create booking. Please check class availability and try again.' };
      }
    } catch (error) {
      console.error('❌ Error in assignClientToClass:', error);
      return { success: false, error: 'Failed to assign client to class' };
    }
  }

  async cancelClientBooking(userId: number | string, classId: number | string, notes?: string): Promise<ApiResponse<any>> {
    try {
      // Handle different ID types - UUIDs stay as strings, numbers stay as numbers
      let userIdValue: number | string;
      let classIdValue: number | string;
      
      if (typeof userId === 'string') {
        // Check if it's a UUID (contains hyphens) or a number string
        if (userId.includes('-')) {
          userIdValue = userId; // Keep UUID as string
        } else {
          userIdValue = parseInt(userId); // Convert number string to number
          if (isNaN(userIdValue)) {
            return { success: false, error: 'Invalid user ID' };
          }
        }
      } else {
        userIdValue = userId;
      }
      
      if (typeof classId === 'string') {
        // Check if it's a UUID (contains hyphens) or a number string
        if (classId.includes('-')) {
          classIdValue = classId; // Keep UUID as string
        } else {
          classIdValue = parseInt(classId); // Convert number string to number
          if (isNaN(classIdValue)) {
            return { success: false, error: 'Invalid class ID' };
          }
        }
      } else {
        classIdValue = classId;
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userIdValue)
        .eq('class_id', classIdValue)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error cancelling booking:', error);
        return { success: false, error: `Failed to cancel booking: ${error.message}` };
      }
      
      // 🔧 FIX: Restore class back to user's subscription when reception cancels
      if (data && data.user_id) {
        await this.restoreClassToSubscription(data.user_id);
        console.log('✅ Reception cancellation: Class refunded to user subscription');
      }
      
      return { success: true, data };
    } catch (error) {
      console.error('❌ Error in cancelClientBooking:', error);
      return { success: false, error: 'Failed to cancel client booking' };
    }
  }
}

export const bookingService = new BookingService(); 