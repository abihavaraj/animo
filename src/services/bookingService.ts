import { supabase, supabaseAdmin } from '../config/supabase.config';
import { notificationService } from './notificationService';
import { pushNotificationService } from './pushNotificationService';

// Define ApiResponse interface locally
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface Booking {
  id: string;
  userId: string;
  classId: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  checkedIn: boolean;
  bookingDate: string;
  createdAt: string;
  updatedAt: string;
  cancelledBy?: 'user' | 'studio' | 'reception';
  
  // Backend fields (snake_case)
  user_id?: string;
  class_id?: string;
  checked_in?: boolean;
  booking_date?: string;
  created_at?: string;
  updated_at?: string;
  cancelled_by?: string;
  
  // Class details from JOIN query
  class_name?: string;
  class_date?: string;
  class_time?: string;
  class_level?: string;
  equipment_type?: string;
  room?: string;
  instructor_name?: string;
  
  class?: {
    id: string;
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
  classId: number | string;
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
  classId: number | string;
}

class BookingService {
  // 🚀 OPTIMIZATION 1: Add date filtering to reduce data fetching
  async getBookings(filters?: BookingFilters & { from?: string; to?: string }): Promise<ApiResponse<Booking[]>> {
    try {
      const bookingQueryStart = Date.now();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      let query = supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          class_id,
          status,
          cancelled_by,
          booking_date,
          created_at,
          classes (
            id,
            name,
            date,
            time,
            duration,
            equipment_type,
            room,
            status,
            users!classes_instructor_id_fkey (name)
          )
        `) // 🚀 Removed unnecessary user join and fields
        .eq('user_id', user.id);
      
      // 🚀 OPTIMIZATION 2: Server-side date filtering
      if (filters?.from) {
        query = query.gte('booking_date', filters.from);
      }
      
      if (filters?.to) {
        query = query.lte('booking_date', filters.to);
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      // 🚀 OPTIMIZATION 3: More efficient ordering and limit
      query = query.order('booking_date', { ascending: false }).limit(50);
      
      const { data, error } = await query;
      const bookingQueryEnd = Date.now();
      
      if (error) {
        console.error('❌ Supabase error fetching bookings:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data as any || [] };
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
      
      // Get class details to check capacity, category, and equipment requirements
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('id, name, capacity, date, time, category, equipment_type, instructor_id')
        .eq('id', bookingData.classId)
        .single();
      
      if (classError) {
        return { success: false, error: 'Class not found' };
      }
      
      // Get user's current subscription to validate personal class access
      const { data: userSubscription, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          id, 
          status, 
          remaining_classes,
          subscription_plans!inner(
            id, 
            name, 
            category, 
            monthly_classes,
            equipment_access
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subscriptionError || !userSubscription) {
        return { success: false, error: 'No active subscription found. Please purchase a subscription plan to book classes.' };
      }
      
      // Check personal subscription restrictions
      const subscriptionCategory = (userSubscription.subscription_plans as any).category;
      const isPersonalSubscription = ['personal', 'personal_duo', 'personal_trio'].includes(subscriptionCategory);
      const isPersonalClass = classDetails.category === 'personal';
      
      if (isPersonalSubscription && !isPersonalClass) {
        return { 
          success: false, 
          error: 'Your personal subscription only allows booking personal/private classes. Please choose a personal training session.' 
        };
      }
      
      if (!isPersonalSubscription && isPersonalClass) {
        return { 
          success: false, 
          error: 'This is a personal training session. You need a personal subscription to book this class.' 
        };
      }
      
      // Check exact capacity matching for personal plans
      if (isPersonalClass) {
        const requiredCapacity = subscriptionCategory === 'personal' ? 1 : 
                                subscriptionCategory === 'personal_duo' ? 2 : 
                                subscriptionCategory === 'personal_trio' ? 3 : 
                                0; // Should not reach here
        
        if (classDetails.capacity !== requiredCapacity) {
          const planName = subscriptionCategory === 'personal' ? 'Personal' :
                          subscriptionCategory === 'personal_duo' ? 'Personal Duo' : 
                          'Personal Trio';
          
          const expectedType = requiredCapacity === 1 ? 'Personal (1 person)' :
                              requiredCapacity === 2 ? 'Personal Duo (2 people)' :
                              'Personal Trio (3 people)';
          
          return { 
            success: false, 
            error: `This personal class is designed for ${classDetails.capacity} people, but your ${planName} subscription is only valid for ${expectedType} classes. Please choose a class that matches your subscription type.` 
          };
        }
      }
      
      // Check if user has remaining classes
      const monthlyClasses = (userSubscription.subscription_plans as any).monthly_classes || 0;
      const remainingClasses = userSubscription.remaining_classes || 0;
      const isUnlimited = monthlyClasses >= 999;
      
      if (!isUnlimited && remainingClasses <= 0) {
        return { 
          success: false, 
          error: 'No remaining classes in your subscription. Please renew or upgrade your plan.' 
        };
      }

      // Check equipment access restrictions
      const userEquipmentAccess = (userSubscription.subscription_plans as any).equipment_access;
      const classEquipmentType = classDetails.equipment_type;
      
      if (!this.isEquipmentAccessAllowed(userEquipmentAccess, classEquipmentType)) {
        const accessMap = {
          'mat': 'Mat-only',
          'reformer': 'Reformer-only', 
          'both': 'Full equipment'
        };
        
        return {
          success: false,
          error: `Equipment access required: This class requires ${accessMap[classEquipmentType] || classEquipmentType} access. Your subscription only includes ${accessMap[userEquipmentAccess] || userEquipmentAccess} access. Please upgrade your plan.`
        };
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
          // The translated notification is already sent in joinWaitlist method
          // No need for additional notification here
          
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
      
      // Update subscription: deduct classes from remaining_classes (unless unlimited)
      if (result && (existingBooking?.status === 'cancelled' || !existingBooking) && !isUnlimited) {
        const creditDeducted = await this.deductClassFromSubscription(user.id);
        if (!creditDeducted) {
          // Delete the booking we just created since credit deduction failed
          await supabase
            .from('bookings')
            .delete()
            .eq('id', result.id);
          
          return { success: false, error: 'Insufficient class credits or subscription not found. Please check your subscription status.' };
        }
      }

      // Send booking confirmation notification only (auto-assignment removed)
      if (result) {
        // Note: Auto-assignment to instructor has been disabled
        // Clients will only be assigned manually by reception
        
        // 1. Get user's notification preferences
        const { data: userSettings } = await notificationService.getNotificationSettings();
        
        // 2. Create translated booking confirmation notification for dashboard
        // Get instructor name
        const { data: instructorData } = await supabase
          .from('users')
          .select('name')
          .eq('id', classDetails.instructor_id)
          .single();
        
        const bookingConfirmationNotification = await notificationService.createTranslatedNotification(
          user.id,
          'class_booked',
          {
            type: 'class_booked',
            className: classDetails.name,
            instructorName: instructorData?.name || 'your instructor',
            date: new Date(classDetails.date).toLocaleDateString(),
            time: classDetails.time
          }
        );

        if (!bookingConfirmationNotification.success) {
          // Silent error handling for production
        }

        // 3. Schedule class reminder ONLY for this specific class (performance optimization)
        await pushNotificationService.scheduleClassReminder(user.id, bookingData.classId);

        // 4. Check if class is now full and send notification to instructor
        const { data: finalBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('class_id', bookingData.classId)
          .eq('status', 'confirmed');
        
        const finalEnrollment = finalBookings?.length || 0;
        
        if (finalEnrollment >= classDetails.capacity) {
          // Send full class notification to instructor
          await notificationService.sendClassFullNotification(
            bookingData.classId,
            classDetails.instructor_id
          );
        }

        // 5. Schedule the reminder using the user's preference
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
      
          }
        }

        // 4. Send notification to instructor about new enrollment
        if (classDetails?.instructor_id) {
          // Get instructor's notification preferences
          const { data: instructorSettings, error: enrollmentSettingsError } = await supabase
            .from('notification_settings')
            .select('new_enrollment_notifications')
            .eq('user_id', classDetails.instructor_id)
            .single();

          // For enrollment notifications, default is false - only send if explicitly enabled
          // If there's an error reading settings (e.g., RLS issues), we can't determine preference so don't send
          const shouldSendEnrollmentNotification = !enrollmentSettingsError && 
            (instructorSettings?.new_enrollment_notifications === true);

          // Silent logging for production

          // Send notification to instructor if they have new enrollment notifications enabled (default false)
          if (shouldSendEnrollmentNotification) {
            // Get student details
            const { data: studentDetails } = await supabase
              .from('users')
              .select('name, email')
              .eq('id', user.id)
              .single();

            const studentName = studentDetails?.name || 'A student';
            
            // Send notification directly to instructor using Supabase
            const { data: notificationData, error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: classDetails.instructor_id,
                type: 'class_update',
                title: 'New Student Enrollment',
                message: `🎉 ${studentName} just enrolled in "${classDetails.name}" on ${new Date(classDetails.date).toLocaleDateString()} at ${classDetails.time}.`,
                scheduled_for: new Date().toISOString(),
                metadata: {
                  class_id: bookingData.classId,
                  notification_type: 'new_enrollment',
                  student_name: studentName
                },
                is_read: false
              })
              .select()
              .single();

            if (notificationError) {
              // Silent error handling for production
            } else {
              // Send PUSH notification to instructor
              try {
                await notificationService.sendPushNotificationToUser(
                  classDetails.instructor_id,
                  'New Student Enrollment',
                  `${studentName} enrolled in "${classDetails.name}"`
                );
              } catch (pushError) {
                // Silent error handling for production
              }
            }

          } else {
            // Silent logging for production
          }
        }
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: 'Failed to create booking' };
    }
  }

  async cancelBooking(id: string): Promise<ApiResponse<Booking>> {
    try {
      console.log('🚀 [CANCEL_TRACKING] Starting cancellation process for booking ID:', id);
      console.log('🚀 [CANCEL_TRACKING] Timestamp:', new Date().toISOString());
      
      // First get the booking details before cancelling
      const { data: originalBooking, error: fetchError } = await supabase
        .from('bookings')
        .select('class_id, user_id, classes(name, date, time)')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('❌ [CANCEL_TRACKING] STEP 1 FAILED - Error fetching original booking:', fetchError);
        console.error('❌ [CANCEL_TRACKING] Database error details:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint
        });
        return { success: false, error: fetchError.message };
      }
      
      
      const { data, error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_by: 'user', // Mark as user-initiated cancellation
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
        console.error('❌ [CANCEL_TRACKING] STEP 2 FAILED - Error updating booking status to cancelled:', error);
        console.error('❌ [CANCEL_TRACKING] Database error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          bookingId: id
        });
        return { success: false, error: error.message };
      }
      
      
      // Restore class back to subscription when booking is cancelled
      if (data && data.user_id) {
        console.log('🚀 [CANCEL_TRACKING] STEP 3 STARTING - Credit refund process for user:', data.user_id);
        try {
          await this.restoreClassToSubscription(data.user_id);
        } catch (refundError) {
          console.error('❌ [CANCEL_TRACKING] STEP 3 FAILED - Credit refund error:', refundError);
          console.error('❌ [CANCEL_TRACKING] Refund error details:', {
            userId: data.user_id,
            bookingId: id,
            error: refundError,
            timestamp: new Date().toISOString()
          });
          // Don't fail the entire cancellation if refund fails - this is the key insight!
          // The booking is already cancelled, but user needs manual credit restoration
        }
      } else {
        console.error('❌ [CANCEL_TRACKING] STEP 3 SKIPPED - No user_id found in cancelled booking data');
        console.error('❌ [CANCEL_TRACKING] Data received:', data);
      }
      
      // Handle waitlist promotion if there's a waitlist for this class
      let waitlistPromoted = false;
      
      if (originalBooking && originalBooking.class_id) {
        console.log('🚀 [CANCEL_TRACKING] STEP 4 STARTING - Waitlist promotion check for class:', originalBooking.class_id);
        try {
          waitlistPromoted = await this.promoteFromWaitlist(originalBooking.class_id);
        } catch (waitlistError) {
          console.error('❌ [CANCEL_TRACKING] STEP 4 FAILED - Waitlist promotion error:', waitlistError);
          // Don't fail cancellation if waitlist promotion fails
        }
      } else {
        console.log('⚠️ [CANCEL_TRACKING] STEP 4 SKIPPED - No class_id for waitlist promotion');
      }

      // Cancel scheduled class reminder notification for the user
      if (originalBooking && originalBooking.user_id && originalBooking.class_id) {
        console.log('🚀 [CANCEL_TRACKING] STEP 5 STARTING - Cancelling scheduled class reminder notification');
        try {
          await pushNotificationService.cancelClassReminder(originalBooking.user_id, originalBooking.class_id);
        } catch (notificationError) {
          console.error('❌ [CANCEL_TRACKING] STEP 5 FAILED - Failed to cancel class reminder notification:', notificationError);
          // Don't fail the booking cancellation if notification cancellation fails
        }
      }

      // Send notification to instructor about cancellation
      if (data && data.classes && data.users) {
        const classDetails = data.classes;
        const studentDetails = data.users;
        
        // Get instructor ID for this class
        const { data: classWithInstructor } = await supabase
          .from('classes')
          .select('instructor_id')
          .eq('id', originalBooking.class_id)
          .single();

        if (classWithInstructor?.instructor_id) {
          // Send cancellation notification to instructor (RLS issues now fixed)
          try {
            await notificationService.sendInstructorCancellationNotification(
              classWithInstructor.instructor_id,
              originalBooking.class_id,
              studentDetails
            );
            console.log('✅ Cancellation notification sent to instructor successfully');
          } catch (notificationError) {
            console.error('❌ Failed to send cancellation notification to instructor:', notificationError);
            // Don't fail the booking cancellation if notification fails
          }
        } else {
          console.log('⚠️ [NOTIFICATION] No instructor found for class, skipping cancellation notification');
        }
      }
      
      // Return data with waitlist promotion info
      console.log('🎉 [CANCEL_TRACKING] CANCELLATION COMPLETED SUCCESSFULLY:', {
        bookingId: id,
        userId: originalBooking.user_id,
        classId: originalBooking.class_id,
        className: (originalBooking.classes as any)?.name,
        waitlistPromoted: waitlistPromoted,
        timestamp: new Date().toISOString(),
        summary: {
          step1_fetch_booking: '✅ SUCCESS',
          step2_update_status: '✅ SUCCESS', 
          step3_refund_credit: '✅ SUCCESS',
          step4_waitlist_promotion: waitlistPromoted ? '✅ PROMOTED' : '✅ NO_PROMOTION'
        }
      });
      
      return { 
        success: true, 
        data: {
          ...data,
          waitlistPromoted
        }
      };
    } catch (error) {
      console.error('💥 [CANCEL_TRACKING] CANCELLATION FAILED WITH EXCEPTION:', error);
      console.error('💥 [CANCEL_TRACKING] Error details:', {
        bookingId: id,
        error: error,
        stack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      });
      return { success: false, error: 'Failed to cancel booking' };
    }
  }

  private async restoreClassToSubscription(userId: string): Promise<void> {
    try {
      console.log('🔍 [REFUND_TRACKING] Starting credit restoration for user:', userId);
      console.log('🔍 [REFUND_TRACKING] Timestamp:', new Date().toISOString());
      
      // First, try to restore to user_subscriptions table (for subscription users)
      // Use the same query logic as deductClassFromSubscription for consistency
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 [REFUND_TRACKING] Querying active subscriptions for user:', userId, 'after date:', today);
      
      const { data: subscriptions, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes, subscription_plans:plan_id(name, duration, duration_unit, monthly_classes)')
        .eq('user_id', userId)
        .gte('end_date', today)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (fetchError) {
        console.error('❌ [REFUND_TRACKING] Error querying subscriptions:', fetchError);
        console.error('❌ [REFUND_TRACKING] Database error details:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
          userId: userId
        });
        throw fetchError;
      }
      
      console.log('📊 [REFUND_TRACKING] Subscriptions query result:', {
        userId: userId,
        subscriptionsFound: subscriptions?.length || 0,
        subscriptions: subscriptions?.map(s => ({
          id: s.id,
          remaining_classes: s.remaining_classes,
          plan_name: (s.subscription_plans as any)?.name
        }))
      });
        
      const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

      if (!fetchError && subscription) {
        // User has a subscription - restore to subscription
        const oldRemainingClasses = subscription.remaining_classes;
        const newRemainingClasses = oldRemainingClasses + 1;
        
        console.log('🔄 [REFUND_TRACKING] SUBSCRIPTION REFUND - Updating subscription:', {
          subscriptionId: subscription.id,
          userId: userId,
          oldRemainingClasses: oldRemainingClasses,
          newRemainingClasses: newRemainingClasses,
          planName: (subscription.subscription_plans as any)?.name
        });
        
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
          console.error('❌ [REFUND_TRACKING] SUBSCRIPTION REFUND FAILED:', updateError);
          console.error('❌ [REFUND_TRACKING] Database error details:', {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            subscriptionId: subscription.id,
            userId: userId
          });
          throw updateError;
        }
        
        const planName = (subscription.subscription_plans as any)?.name || 'Unknown Plan';
        
        return;
      }

      // No subscription found - restore to user's daypass credits
      console.log('🔄 [REFUND_TRACKING] DAYPASS REFUND - No active subscription found, restoring to daypass credits for user:', userId);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credit_balance, remaining_classes')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('❌ [REFUND_TRACKING] DAYPASS REFUND FAILED - Error fetching user data:', userError);
        console.error('❌ [REFUND_TRACKING] Database error details:', {
          message: userError.message,
          code: userError.code,
          details: userError.details,
          hint: userError.hint,
          userId: userId
        });
        throw userError;
      }
      
      const currentCreditBalance = userData.credit_balance || 0;
      const currentRemainingClasses = userData.remaining_classes || 0;
      const newRemainingClasses = currentRemainingClasses + 1;
      
      console.log('🔄 [REFUND_TRACKING] DAYPASS REFUND - Updating user credits:', {
        userId: userId,
        oldRemainingClasses: currentRemainingClasses,
        newRemainingClasses: newRemainingClasses,
        creditBalance: currentCreditBalance
      });
      
      // Restore 1 class to user's daypass credits
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          remaining_classes: newRemainingClasses
        })
        .eq('id', userId);
      
      if (updateUserError) {
        console.error('❌ [REFUND_TRACKING] DAYPASS REFUND FAILED - Error updating user credits:', updateUserError);
        console.error('❌ [REFUND_TRACKING] Database error details:', {
          message: updateUserError.message,
          code: updateUserError.code,
          details: updateUserError.details,
          hint: updateUserError.hint,
          userId: userId
        });
        throw updateUserError;
      }
      
      
    } catch (error) {
      console.error('❌ Error restoring class to subscription/credits:', error);
    }
  }

  private async deductClassFromSubscription(userId: string | number): Promise<boolean> {
    try {
      // Ensure userId is string for Supabase UUID compatibility
      const userIdString = userId.toString();
      
      // Get current auth user for comparison
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Use admin client when looking up different user's data
      const shouldUseAdminContext = authUser?.id !== userIdString;
      const clientToUse = shouldUseAdminContext ? supabaseAdmin : supabase;
      
      // First, try to deduct from user_subscriptions table (for subscription users)
      // Use SAME logic as getCurrentSubscription to find active subscriptions
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      
      // Query for active subscriptions
      const { data: subscriptions, error: fetchError } = await clientToUse
        .from('user_subscriptions')
        .select('id, remaining_classes, status, end_date, subscription_plans:plan_id(name, duration, duration_unit, monthly_classes)')
        .eq('user_id', userIdString)
        .gte('end_date', today) // Include subscriptions that expire today or later
        .eq('status', 'active') // Only active subscriptions
        .order('created_at', { ascending: false })
        .limit(1);
      





      if (!fetchError && subscriptions && subscriptions.length > 0) {
        // User has a subscription - deduct from the first (most recent) one
        const subscription = subscriptions[0];
        
        if (subscription.remaining_classes <= 0) {
          return false; // ❌ Failed - no classes to deduct
        }
        
        const newRemainingClasses = subscription.remaining_classes - 1;
        
        const { data: updateData, error: updateError } = await clientToUse
          .from('user_subscriptions')
          .update({
            remaining_classes: newRemainingClasses,
            updated_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
          .select('remaining_classes')
          .single();
        
        if (updateError) {
          return false; // ❌ Failed - database error
        }
        
        return true; // ✅ Success - deducted from subscription
      }
      
      // No subscription found - user needs an active subscription to book classes
      return false; // ❌ Failed - no active subscription
      
    } catch (error) {
      // Silent error handling for production
      return false; // ❌ Failed - exception occurred
    }
  }

  private async promoteFromWaitlist(classId: number | string): Promise<boolean> {
    try {
      // Check if class is more than 2 hours away (waitlist promotion rule)
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('date, time, name')
        .eq('id', classId)
        .single();
      
      if (classError || !classDetails) {
        return false;
      }
      
      const classDateTime = new Date(`${classDetails.date}T${classDetails.time}`);
      const now = new Date();
      const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilClass < 2) {
        return false;
      }
      
      // First, check how many people are on the waitlist
      const { data: allWaitlistEntries, error: countError } = await supabase
        .from('waitlist')
        .select('id, user_id, position')
        .eq('class_id', classId)
        .order('position', { ascending: true });
      
      if (!allWaitlistEntries || allWaitlistEntries.length === 0) {
        return false;
      }

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
      const { data: existingBookings, error: existingError } = await supabase
        .from('bookings')
        .select('id, user_id, class_id, status')
        .eq('user_id', waitlistEntry.user_id)
        .eq('class_id', classId)
        .eq('status', 'confirmed');
      
      if (existingBookings && existingBookings.length > 0) {
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
      const bookingData = {
        user_id: waitlistEntry.user_id,
        class_id: classId,
        status: 'confirmed',
        booking_date: new Date().toISOString()
      };
      
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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const today = new Date().toISOString().split('T')[0];
      const needsAdminClient = authUser?.id !== waitlistEntry.user_id;
      const clientForQuery = needsAdminClient ? supabaseAdmin : supabase;
      
      const creditDeducted = await this.deductClassFromSubscription(waitlistEntry.user_id);
      
      if (!creditDeducted) {
        console.log(`⚠️ [WAITLIST] User ${waitlistEntry.user_id} has no remaining classes - skipping and trying next person`);
        
        // Delete the booking we just created since user has no credits
        await supabase
          .from('bookings')
          .delete()
          .eq('id', newBooking.id);
        
        // Remove this user from waitlist since they don't have credits
        await supabase
          .from('waitlist')
          .delete()
          .eq('id', waitlistEntry.id);
        
        // Update positions for remaining waitlist entries
        await this.updateWaitlistPositions(classId);
        
        // Try to promote the NEXT person in line who might have credits
        console.log(`🔄 [WAITLIST] Trying to promote next person in line for class ${classId}`);
        return await this.promoteFromWaitlist(classId);
      }
      
      // 📢 Send promotion notification to the specific user
      try {
        const classInfo = waitlistEntry.classes as any;
        if (classInfo) {
          console.log(`📢 [NOTIFICATION] Sending waitlist to booking promotion notification to user ${waitlistEntry.user_id}`);
          console.log(`📢 [NOTIFICATION] Class info:`, classInfo);
          
          // Use translated notification service for proper language support
          const translatedNotification = await notificationService.createTranslatedNotification(
            waitlistEntry.user_id,
            'waitlist_promoted',
            {
              type: 'waitlist_promoted',
              className: classInfo.name,
              date: new Date(classInfo.date).toLocaleDateString(),
              time: classInfo.time
            }
          );

          // Also send push notification to user's mobile device
          if (translatedNotification.success && translatedNotification.data) {
            await notificationService.sendPushNotificationToUser(
              waitlistEntry.user_id,
              translatedNotification.data.title,
              translatedNotification.data.message
            );
          }


          // Schedule class reminder for the promoted user based on their preferences (performance optimization)
          await pushNotificationService.scheduleClassReminder(waitlistEntry.user_id, classId);
          
        }
      } catch (notifyError) {
        console.error('❌ [NOTIFICATION] Failed to send waitlist promotion notification:', notifyError);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error in promoteFromWaitlist:', error);
      return false;
    }
  }

  // 🔧 DEBUG METHOD: Test waitlist promotion for a specific class
  async debugWaitlistPromotion(classId: number): Promise<void> {
    console.log(`🔧 [DEBUG] Testing waitlist promotion for class ${classId}`);
    
    // Check class details
    const { data: classDetails, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();
    
    console.log(`🔧 [DEBUG] Class details:`, { classDetails, error: classError });
    
    // Check current bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('class_id', classId)
      .eq('status', 'confirmed');
    
    console.log(`🔧 [DEBUG] Current bookings:`, { 
      count: bookings?.length || 0, 
      bookings, 
      error: bookingsError 
    });
    
    // Check waitlist
    const { data: waitlist, error: waitlistError } = await supabase
      .from('waitlist')
      .select('*, users(name, email)')
      .eq('class_id', classId)
      .order('position', { ascending: true });
    
    console.log(`🔧 [DEBUG] Waitlist entries:`, { 
      count: waitlist?.length || 0, 
      waitlist, 
      error: waitlistError 
    });
    
    // Test promotion
    const promoted = await this.promoteFromWaitlist(classId);
    console.log(`🔧 [DEBUG] Promotion result:`, promoted);
  }

  private async updateWaitlistPositions(classId: number | string): Promise<void> {
    try {
      console.log(`🔄 [WAITLIST] Updating positions for class ${classId}`);
      
      // Get all remaining waitlist entries for this class
      const { data: waitlistEntries, error } = await supabase
        .from('waitlist')
        .select('id, position, user_id')
        .eq('class_id', classId)
        .order('position', { ascending: true });
      
      if (error) {
        console.error('❌ [WAITLIST] Error fetching waitlist entries:', error);
        return;
      }
      
      
      
      if (waitlistEntries && waitlistEntries.length > 0) {
        // First, update all positions
        const positionUpdates = [];
        const notificationsToSend = [];
        
        for (let i = 0; i < waitlistEntries.length; i++) {
          const newPosition = i + 1;
          const entry = waitlistEntries[i];
          const currentPosition = entry.position;

          if (newPosition !== currentPosition) {
            console.log(`🔄 [WAITLIST] Preparing to update entry ${entry.id}: position ${currentPosition} → ${newPosition}`);
            
            positionUpdates.push({
              id: entry.id,
              position: newPosition,
              user_id: entry.user_id,
              currentPosition,
              newPosition
            });
          }
        }

        // Execute all position updates first
        console.log(`📝 [WAITLIST] Executing ${positionUpdates.length} position updates...`);
        for (const update of positionUpdates) {
          const { error: updateError } = await supabase
            .from('waitlist')
            .update({ position: update.newPosition })
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ [WAITLIST] Error updating position for entry ${update.id}:`, updateError);
          } else {
            // Add to notifications list for later sending
            notificationsToSend.push({
              user_id: update.user_id,
              newPosition: update.newPosition,
              classId
            });
          }
        }

        // Wait a moment for database consistency
        await new Promise(resolve => setTimeout(resolve, 100));

        // Now send all notifications
        console.log(`📢 [WAITLIST] Sending ${notificationsToSend.length} position update notifications...`);
        for (const notification of notificationsToSend) {
          try {
            const { data: classInfo } = await supabase
              .from('classes')
              .select('name, date, time')
              .eq('id', classId)
              .single();

            if (classInfo) {
              console.log(`📢 [WAITLIST] Sending position update notification to user ${notification.user_id}: position #${notification.newPosition}`);
              
              // Use translated notification service for proper language support
              const translatedNotification = await notificationService.createTranslatedNotification(
                notification.user_id,
                'waitlist_moved_up',
                {
                  type: 'waitlist_moved_up',
                  className: classInfo.name,
                  date: new Date(classInfo.date).toLocaleDateString(),
                  time: classInfo.time,
                  newPosition: notification.newPosition
                }
              );

              // Also send push notification to user's mobile device
              if (translatedNotification.success && translatedNotification.data) {
                await notificationService.sendPushNotificationToUser(
                  notification.user_id,
                  translatedNotification.data.title,
                  translatedNotification.data.message
                );
              }
              
            }
          } catch (notifyError) {
            console.warn('⚠️ [WAITLIST] Failed to send position update notification:', notifyError);
          }
        }

      } else {
        console.log(`📭 [WAITLIST] No waitlist entries found for class ${classId}`);
      }
    } catch (error) {
      console.error('❌ [WAITLIST] Error updating waitlist positions:', error);
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

  async getClassAttendees(classId: number | string): Promise<ApiResponse<any[]>> {
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
      
      // ✅ NEW: Check if user has active subscription with remaining classes
      const today = new Date().toISOString().split('T')[0];
      
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          remaining_classes,
          status,
          end_date,
          subscription_plans (
            name,
            duration_unit
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('end_date', today)
        .order('end_date', { ascending: true });
      
      if (subscriptionError) {
        return { success: false, error: 'Failed to verify subscription status' };
      }
      
      if (!subscriptions || subscriptions.length === 0) {
        return { success: false, error: 'You need an active subscription to join the waitlist' };
      }
      
      // Check if user has remaining classes (for monthly/yearly subscriptions)
      const activeSubscription = subscriptions[0];
      const subscriptionPlan = Array.isArray(activeSubscription.subscription_plans) 
        ? activeSubscription.subscription_plans[0] 
        : activeSubscription.subscription_plans;
      const isDayPass = subscriptionPlan?.duration_unit === 'days';
      
      if (!isDayPass && activeSubscription.remaining_classes <= 0) {
        return { success: false, error: 'You have no remaining classes in your subscription to join the waitlist' };
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
      
      // Calculate the next position in waitlist with race condition protection
      const { data: existingWaitlist, error: countError } = await supabase
        .from('waitlist')
        .select('position')
        .eq('class_id', waitlistData.classId)
        .order('position', { ascending: false })
        .limit(1);
      
      if (countError) {
        return { success: false, error: countError.message };
      }
      
      // Calculate next position (highest position + 1, or 1 if no one is on waitlist)
      let nextPosition = existingWaitlist && existingWaitlist.length > 0 
        ? existingWaitlist[0].position + 1 
        : 1;
      
      // Race condition protection: keep trying until we get a unique position
      let insertSuccess = false;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (!insertSuccess && attempts < maxAttempts) {
        attempts++;
        
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
          // Check if it's a position conflict (unique constraint violation)
          if (error.code === '23505' && error.message.includes('position')) {
            nextPosition++;
            continue;
          } else {
            return { success: false, error: error.message };
          }
        } else {
          // Success! Exit the loop
          insertSuccess = true;
          
          // 📱 Send translated waitlist join notification
          try {
            const classInfo = data.classes;
            if (classInfo) {
              // Create translated notification
              await notificationService.createTranslatedNotification(
                user.id,
                'waitlist_joined',
                {
                  type: 'waitlist_joined',
                  className: classInfo.name,
                  date: new Date(classInfo.date).toLocaleDateString('sq-AL', { 
                    day: 'numeric', 
                    month: 'short' 
                  }),
                  time: classInfo.time,
                  position: nextPosition
                }
              );
            }
          } catch (notificationError) {
            // Don't fail the waitlist join if notification fails
            // Silent error handling for production
          }
          
          return { success: true, data };
        }
      }
      
      // If we got here, all attempts failed
      return { success: false, error: 'Failed to join waitlist after multiple attempts' };
    } catch (error) {
      return { success: false, error: 'Failed to join waitlist' };
    }
  }

  async leaveWaitlist(waitlistId: number): Promise<ApiResponse<void>> {
    try {
      // First, get the waitlist entry to know the class_id and position
      const { data: waitlistEntry, error: fetchError } = await supabase
        .from('waitlist')
        .select('class_id, position')
        .eq('id', waitlistId)
        .single();
      
      if (fetchError || !waitlistEntry) {
        return { success: false, error: 'Waitlist entry not found' };
      }
      
      // Delete the waitlist entry
      const { error: deleteError } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', waitlistId);
      
      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
      
      // Use the improved updateWaitlistPositions method to handle position updates and notifications
      console.log(`🔄 [leaveWaitlist] Updating waitlist positions for class ${waitlistEntry.class_id} after removal`);
      await this.updateWaitlistPositions(waitlistEntry.class_id);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to leave waitlist' };
    }
  }

  // 🚀 OPTIMIZATION 4: Simplified waitlist query with date filtering
  async getUserWaitlist(userId?: number | string): Promise<ApiResponse<WaitlistEntry[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const targetUserId = userId ? (typeof userId === 'string' ? userId : userId.toString()) : user.id;
      
      // 🚀 Only load future waitlist entries
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('waitlist')
        .select(`
          id,
          user_id,
          class_id,
          position,
          created_at,
          classes!inner (
            id,
            name,
            date,
            time,
            equipment_type,
            room,
            status,
            users!classes_instructor_id_fkey (name)
          )
        `)
        .eq('user_id', targetUserId)
        .gte('classes.date', today) // 🚀 Server-side date filtering
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ Supabase error fetching waitlist:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, data: data as any || [] };
    } catch (error) {
      console.error('❌ Error in getUserWaitlist:', error);
      return { success: false, error: 'Failed to get user waitlist' };
    }
  }

  async getClassWaitlist(classId: number | string): Promise<ApiResponse<WaitlistEntry[]>> {
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

  // Get all waitlist entries for dashboard
  async getAllWaitlistEntries(): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('waitlist')
        .select(`
          id,
          user_id,
          class_id,
          position,
          created_at,
          users!waitlist_user_id_fkey (name, email),
          classes!waitlist_class_id_fkey (
            id,
            name,
            date,
            time,
            equipment_type,
            room,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching all waitlist entries:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data as any || [] };
    } catch (error) {
      console.error('❌ Error in getAllWaitlistEntries:', error);
      return { success: false, error: 'Failed to get all waitlist entries' };
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

      // Get class details to check if it's a personal class and validate subscription compatibility
      const { data: classDetails, error: classError } = await supabase
        .from('classes')
        .select('id, name, capacity, date, time, category, equipment_type, instructor_id')
        .eq('id', classIdValue)
        .single();

      if (classError || !classDetails) {
        return { success: false, error: 'Class not found' };
      }

      // ALWAYS check class capacity - override only affects subscription rules, not capacity limits
      try {
        // Get current confirmed bookings for this class
        const { data: currentBookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('id')
          .eq('class_id', classIdValue)
          .eq('status', 'confirmed');

        if (bookingsError) {
          console.warn('⚠️ Could not check class capacity:', bookingsError);
          return { 
            success: false, 
            error: 'Cannot verify class capacity. Please contact system administrator.' 
          };
        }

        const currentEnrollment = currentBookings?.length || 0;
        console.log(`🔍 [CAPACITY_CHECK] Class ${classDetails.name}: ${currentEnrollment}/${classDetails.capacity} (Override: ${overrideRestrictions ? 'ON' : 'OFF'})`);

        if (currentEnrollment >= classDetails.capacity) {
          return { 
            success: false, 
            error: `Class is at full capacity (${currentEnrollment}/${classDetails.capacity}). Cannot assign more clients. Add client to waitlist instead.` 
          };
        }
      } catch (capacityError) {
        console.warn('⚠️ Capacity check failed with exception:', capacityError);
        return { 
          success: false, 
          error: 'Cannot verify class capacity. Please try again.' 
        };
      }

      // Declare activeSubscription outside the validation block so it's accessible for both cases
      let activeSubscription = null;

      // Check subscription status when override is OFF - use graceful error handling
      if (!overrideRestrictions) {
        try {
          // Get all active subscriptions and find the one that's not expired
          const { data: subscriptions, error: subscriptionError } = await supabase
            .from('user_subscriptions')
            .select('id, remaining_classes, end_date, subscription_plans:plan_id(name, category, equipment_access)')
            .eq('user_id', userIdValue)
            .eq('status', 'active')
            .order('end_date', { ascending: false });
          
          if (subscriptionError) {
            console.warn('⚠️ Subscription check failed:', subscriptionError);
            return { 
              success: false, 
              error: 'Cannot verify client subscription due to database permissions. Please use override to bypass restrictions or contact system administrator.' 
            };
          }
          
          console.log(`🔍 [bookingService] Found ${subscriptions?.length || 0} subscriptions for user ${userIdValue}:`, 
            subscriptions?.map(sub => ({
              id: sub.id,
              name: (sub.subscription_plans as any)?.name,
              status: 'active', // We only query active ones
              endDate: sub.end_date,
              remaining: sub.remaining_classes
            }))
          );
          
          // Find the most recent active and non-expired subscription
          const now = new Date();
          const today = now.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
          
          // First, auto-expire any subscriptions that have passed their end_date
          const expiredSubs = subscriptions?.filter(sub => sub.end_date < today) || [];
          if (expiredSubs.length > 0) {
            console.log(`🔄 Auto-expiring ${expiredSubs.length} expired subscriptions for user ${userIdValue}`);
            const expiredIds = expiredSubs.map(sub => sub.id);
            await supabase
              .from('user_subscriptions')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString() 
              })
              .in('id', expiredIds);
          }
          
          // Now find the truly active (non-expired) subscription
          activeSubscription = subscriptions?.find(sub => {
            // Compare dates properly - subscription is valid UNTIL the end of its end_date
            const endDateStr = sub.end_date; // Format: "2025-08-13"
            const todayStr = now.toISOString().split('T')[0]; // Format: "2025-08-13"
            const isNotExpired = endDateStr >= todayStr; // Valid on end_date, expires day after
            
            console.log(`🔍 [bookingService] Subscription check:`, {
              id: sub.id,
              name: (sub.subscription_plans as any)?.name,
              endDate: sub.end_date,
              remaining: sub.remaining_classes,
              isNotExpired,
              todayStr,
              comparison: `${endDateStr} >= ${todayStr} = ${isNotExpired}`
            });
            return isNotExpired;
          });
          
          console.log(`🔍 [bookingService] Active subscription found:`, activeSubscription ? {
            id: activeSubscription.id,
            name: activeSubscription.subscription_plans?.name,
            remaining: activeSubscription.remaining_classes
          } : 'NONE');
          
          if (!activeSubscription) {
            return { 
              success: false, 
              error: 'Client does not have an active subscription. Please assign a subscription plan first, or use override to bypass restrictions.' 
            };
          }
          
          const subscription = activeSubscription;
          
          // Check personal class compatibility (same validation as createBooking)
          const subscriptionCategory = (subscription.subscription_plans as any)?.category;
          const isPersonalSubscription = ['personal', 'personal_duo', 'personal_trio'].includes(subscriptionCategory);
          const isPersonalClass = classDetails.category === 'personal';
          
          console.log('🔍 [ASSIGN] Personal class validation:', {
            subscriptionCategory,
            isPersonalSubscription,
            isPersonalClass,
            classCategory: classDetails.category,
            planName: (subscription.subscription_plans as any)?.name
          });
          
          if (isPersonalSubscription && !isPersonalClass) {
            return { 
              success: false, 
              error: 'This client has a personal subscription which only allows booking personal/private classes. Please choose a personal training session, or use override to bypass restrictions.' 
            };
          }
          
          if (!isPersonalSubscription && isPersonalClass) {
            console.log('🚫 [ASSIGN] Blocking non-personal subscription from booking personal class');
            return { 
              success: false, 
              error: 'This is a personal training session. The client needs a personal subscription to book this class, or use override to bypass restrictions.' 
            };
          }
          
          // Check if user has remaining classes
          console.log(`🔍 [bookingService] Checking remaining classes:`, {
            remaining: subscription.remaining_classes,
            planName: subscription.subscription_plans?.name,
            hasClasses: subscription.remaining_classes > 0
          });
          
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
        
        // Track override assignments in memory (since bookings table has no notes column)
        if (result && overrideRestrictions) {
          // Store override booking IDs in a simple memory cache
          if (!global.overrideBookings) {
            global.overrideBookings = new Set();
          }
          global.overrideBookings.add(result.id);
          console.log('🔍 [DEBUG] Tracking override booking:', result.id);
        }

        // Handle subscription deduction only when override is OFF
        if (result && !overrideRestrictions) {
          const creditDeducted = await this.deductClassFromSubscription(userIdValue);
          if (creditDeducted) {
            console.log('✅ Reception assignment: Class deducted from user subscription');
          } else {
            console.warn('⚠️ Reception assignment: Could not deduct class from subscription - booking created but no credit deducted');
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
          cancelled_by: 'reception', // Mark as reception-initiated cancellation
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
      
      // Cancel scheduled class reminder notification for the user
      if (data && data.user_id) {
        console.log('🚀 [ADMIN_CANCEL] Cancelling scheduled class reminder notification for user:', data.user_id);
        try {
          await pushNotificationService.cancelClassReminder(data.user_id, classIdValue);
          console.log('✅ [ADMIN_CANCEL] Class reminder notification cancelled successfully');
        } catch (notificationError) {
          console.error('❌ [ADMIN_CANCEL] Failed to cancel class reminder notification:', notificationError);
          // Don't fail the booking cancellation if notification cancellation fails
        }
      }
      
      // 🔧 SMART REFUND LOGIC: Only refund if the client was actually charged
      if (data && data.user_id) {
        // Check if this booking was assigned with override (no charge)
        const wasOverrideAssignment = global.overrideBookings && global.overrideBookings.has(data.id);
        
        if (wasOverrideAssignment) {
          // Booking was assigned without charge - no refund needed
          console.log('⚠️ Reception cancellation: Booking was assigned without charge (override), no refund given');
          global.overrideBookings.delete(data.id);
          console.log('🗑️ Removed booking from override tracking cache');
        } else {
          // Booking was assigned with charge - refund the credit
          await this.restoreClassToSubscription(data.user_id);
          console.log('✅ Reception cancellation: Class was charged, credit refunded to user subscription');
        }
      }
      
      // 🚨 CRITICAL FIX: Handle waitlist promotion for admin/reception cancellations
      console.log(`🎯 [ADMIN_CANCEL] Starting waitlist promotion check for class ${classIdValue}`);
      
      // Check if there are people on waitlist before promotion attempt
      const { data: waitlistCheck } = await supabase
        .from('waitlist')
        .select('id, user_id, position, users:user_id(name)')
        .eq('class_id', classIdValue)
        .order('position', { ascending: true });
      
      console.log(`🎯 [ADMIN_CANCEL] Found ${waitlistCheck?.length || 0} people on waitlist:`, 
        waitlistCheck?.map(w => ({ position: w.position, name: (w.users as any)?.name })));
      
      const waitlistPromoted = await this.promoteFromWaitlist(classIdValue as number);
      console.log(`🎯 [ADMIN_CANCEL] Waitlist promotion result: ${waitlistPromoted ? 'SUCCESS - Someone was promoted!' : 'NO_PROMOTION - No one promoted'}`);
      
      return { 
        success: true, 
        data: {
          ...data,
          waitlistPromoted
        }
      };
    } catch (error) {
      console.error('❌ Error in cancelClientBooking:', error);
      return { success: false, error: 'Failed to cancel client booking' };
    }
  }

  async removeClientBooking(userId: number | string, classId: number | string): Promise<ApiResponse<any>> {
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
      
      // First get the booking to check if it was an override assignment
      const { data: bookingData, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', userIdValue)
        .eq('class_id', classIdValue)
        .single();
      
      if (fetchError) {
        console.error('Error fetching booking:', fetchError);
        return { success: false, error: `Booking not found: ${fetchError.message}` };
      }
      
      // Delete the booking completely
      const { data, error } = await supabase
        .from('bookings')
        .delete()
        .eq('user_id', userIdValue)
        .eq('class_id', classIdValue)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error removing booking:', error);
        return { success: false, error: `Failed to remove booking: ${error.message}` };
      }
      
      // 🔧 FIX: Always restore class credit for admin/reception client removals
      // This ensures that when reception/admin removes a client (whether originally assigned 
      // with or without override), the user always gets their class credit back
      if (bookingData && bookingData.user_id) {
        await this.restoreClassToSubscription(bookingData.user_id);
        console.log('✅ Client removal: Class credit always refunded to user subscription');
        
        // Clean up override tracking cache if this booking was tracked
        if (global.overrideBookings && global.overrideBookings.has(bookingData.id)) {
          global.overrideBookings.delete(bookingData.id);
          console.log('🗑️ Removed booking from override tracking cache');
        }
      }
      
      // 🚨 Handle waitlist promotion after client removal
      console.log(`🎯 [CLIENT_REMOVAL] Starting waitlist promotion check for class ${classIdValue}`);
      
      // Check if there are people on waitlist before promotion attempt
      const { data: waitlistCheck } = await supabase
        .from('waitlist')
        .select('id, user_id, position, users:user_id(name)')
        .eq('class_id', classIdValue)
        .order('position', { ascending: true });
      
      console.log(`🎯 [CLIENT_REMOVAL] Found ${waitlistCheck?.length || 0} people on waitlist:`, 
        waitlistCheck?.map(w => ({ position: w.position, name: (w.users as any)?.name })));
      
      const waitlistPromoted = await this.promoteFromWaitlist(classIdValue as number);
      console.log(`🎯 [CLIENT_REMOVAL] Waitlist promotion result: ${waitlistPromoted ? 'SUCCESS - Someone was promoted!' : 'NO_PROMOTION - No one promoted'}`);
      
      return { 
        success: true, 
        data: {
          ...data,
          waitlistPromoted
        }
      };
    } catch (error) {
      console.error('❌ Error in removeClientBooking:', error);
      return { success: false, error: 'Failed to remove client booking' };
    }
  }

  // 🚀 OPTIMIZATION 5: Batch waitlist removal
  async batchLeaveWaitlist(waitlistIds: number[]): Promise<ApiResponse<void>> {
    try {
      if (waitlistIds.length === 0) return { success: true };
      
      const { error } = await supabase
        .from('waitlist')
        .delete()
        .in('id', waitlistIds);
      
      if (error) {
        console.error('❌ Error batch removing from waitlist:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error in batchLeaveWaitlist:', error);
      return { success: false, error: 'Failed to remove from waitlist' };
    }
  }

  // 🚀 OPTIMIZATION 6: Background waitlist cleanup
  async cleanupExpiredWaitlistEntries(): Promise<void> {
    try {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
      
      // Remove waitlist entries for classes that started more than 2 hours ago
      await supabase
        .from('waitlist')
        .delete()
        .lt('classes.date', twoHoursAgo.toISOString().split('T')[0]);
        
    } catch (error) {
      console.error('Background waitlist cleanup failed:', error);
    }
  }

  // Helper method to check if user's equipment access allows booking a specific class
  private isEquipmentAccessAllowed(userAccess: string, classEquipment: string): boolean {
    // 'both' access allows everything
    if (userAccess === 'both') {
      return true;
    }
    
    // For specific access, user can only book classes that match their access level
    // OR classes that require 'both' if they have 'both' access
    if (userAccess === classEquipment) {
      return true;
    }
    
    // Special case: if class requires 'both' equipment, user needs 'both' access
    if (classEquipment === 'both' && userAccess !== 'both') {
      return false;
    }
    
    return false;
  }
}

export const bookingService = new BookingService(); 