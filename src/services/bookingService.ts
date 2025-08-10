import { supabase, supabaseAdmin } from '../config/supabase.config';
import { instructorClientService } from './instructorClientService';
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
  
  // Backend fields (snake_case)
  user_id?: string;
  class_id?: string;
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
      const isPersonalSubscription = subscriptionCategory === 'personal';
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
      
      // Update subscription: deduct classes from remaining_classes (unless unlimited)
      if (result && (existingBooking?.status === 'cancelled' || !existingBooking) && !isUnlimited) {
        const creditDeducted = await this.deductClassFromSubscription(user.id);
        if (!creditDeducted) {
          console.error(`❌ CRITICAL: Credit deduction FAILED for booking user ${user.id}`);
          console.error(`❌ Rolling back booking to prevent free class...`);
          
          // Delete the booking we just created since credit deduction failed
          await supabase
            .from('bookings')
            .delete()
            .eq('id', result.id);
          

          return { success: false, error: 'Insufficient class credits or subscription not found. Please check your subscription status.' };
        }
      }

      // Send booking confirmation notification and auto-assign to instructor
      if (result) {
        // Get instructor ID for this class to auto-assign client
        const { data: classWithInstructor } = await supabase
          .from('classes')
          .select('instructor_id')
          .eq('id', bookingData.classId)
          .single();

        if (classWithInstructor?.instructor_id) {
          // Auto-assign client to instructor when booking is confirmed
          await instructorClientService.autoAssignClientToInstructor(
            user.id,
            classWithInstructor.instructor_id,
            bookingData.classId
          );
        }

        // 1. Get user's notification preferences
        const { data: userSettings } = await notificationService.getNotificationSettings();
        
        // 2. Send confirmation notification to the specific user
        // Send notification directly to user using Supabase
        const { data: userNotificationData, error: userNotificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'class_update',
            title: 'Booking Confirmed',
            message: `✅ Booking confirmed for "${classDetails.name}" on ${new Date(classDetails.date).toLocaleDateString()} at ${classDetails.time}. See you there!`,
            scheduled_for: new Date().toISOString(),
            metadata: {
              class_id: bookingData.classId,
              notification_type: 'booking_confirmation'
            },
            is_read: false
          })
          .select()
          .single();

        if (userNotificationError) {
          console.error('❌ Failed to send booking confirmation notification:', userNotificationError);
        } else {
          console.log('✅ Booking confirmation notification sent to user');
        }

        // 3. Schedule class reminder for this user based on their preferences
        await pushNotificationService.scheduleClassReminders(user.id);

        // 4. Check if class is now full and send notification to instructor
        const { data: finalBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('class_id', bookingData.classId)
          .eq('status', 'confirmed');
        
        const finalEnrollment = finalBookings?.length || 0;
        
        if (finalEnrollment >= classDetails.capacity) {
          console.log(`🎉 Class "${classDetails.name}" is now full (${finalEnrollment}/${classDetails.capacity}). Notifying instructor.`);
          
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
            console.log(`✅ Reminder scheduled for class ${classDetails.name} as per user preference.`);
          }
        }

        // 4. Send notification to instructor about new enrollment
        if (classWithInstructor?.instructor_id) {
          // Get instructor's notification preferences
          const { data: instructorSettings } = await supabase
            .from('notification_settings')
            .select('new_enrollment_notifications')
            .eq('user_id', classWithInstructor.instructor_id)
            .single();

          // Send notification to instructor if they have new enrollment notifications enabled
          if (instructorSettings?.new_enrollment_notifications !== false) {
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
                user_id: classWithInstructor.instructor_id,
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
              console.error('❌ Failed to send enrollment notification to instructor:', notificationError);
            } else {
              console.log('✅ New enrollment notification sent to instructor');
            }

            console.log(`✅ New enrollment notification sent to instructor for class ${classDetails.name}`);
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
          // Get instructor's notification preferences
          const { data: instructorSettings, error: settingsError } = await supabase
            .from('notification_settings')
            .select('class_cancellation_notifications')
            .eq('user_id', classWithInstructor.instructor_id)
            .single();

          // Default to sending notifications if settings don't exist or are enabled
          const shouldSendNotification = settingsError || 
            instructorSettings?.class_cancellation_notifications !== false;

          console.log(`📧 [NOTIFICATION] Instructor cancellation notification check:`, {
            instructorId: classWithInstructor.instructor_id,
            settingsError: !!settingsError,
            settingValue: instructorSettings?.class_cancellation_notifications,
            willSend: shouldSendNotification
          });

          // Send notification to instructor if they have cancellation notifications enabled
          if (shouldSendNotification) {
            const studentName = studentDetails.name || 'A student';
            
            // Send notification directly to instructor using Supabase
            const { data: notificationData, error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: classWithInstructor.instructor_id,
                type: 'class_update',
                title: 'Student Cancellation',
                message: `❌ ${studentName} cancelled their booking for "${classDetails.name}" on ${new Date(classDetails.date).toLocaleDateString()} at ${classDetails.time}.`,
                scheduled_for: new Date().toISOString(),
                metadata: {
                  class_id: originalBooking.class_id,
                  notification_type: 'cancellation',
                  student_name: studentName
                },
                is_read: false
              })
              .select()
              .single();

            if (notificationError) {
              console.error('❌ [NOTIFICATION] Failed to send cancellation notification to instructor:', notificationError);
              console.error('❌ [NOTIFICATION] Details:', {
                instructorId: classWithInstructor.instructor_id,
                className: classDetails.name,
                studentName,
                error: notificationError
              });
            } else {
              console.log('✅ [NOTIFICATION] Cancellation notification sent to instructor successfully');
              console.log('✅ [NOTIFICATION] Details:', {
                notificationId: notificationData?.id,
                instructorId: classWithInstructor.instructor_id,
                className: classDetails.name,
                studentName
              });

              // Send PUSH notification to instructor
              try {
                console.log('📱 [NOTIFICATION] Sending push notification to instructor...');
                await notificationService.sendPushNotificationToUser(
                  classWithInstructor.instructor_id,
                  'Student Cancellation',
                  `${studentName} cancelled their booking for "${classDetails.name}"`
                );
                console.log('✅ [NOTIFICATION] Push notification sent to instructor successfully');
              } catch (pushError) {
                console.error('❌ [NOTIFICATION] Error sending push notification to instructor:', pushError);
              }
            }
          } else {
            console.log('📧 [NOTIFICATION] Instructor cancellation notification skipped - disabled in preferences');
          }
        }
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
      // First, try to restore to user_subscriptions table (for subscription users)
      // Use the same query logic as deductClassFromSubscription for consistency
      const today = new Date().toISOString().split('T')[0];
      const { data: subscriptions, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('id, remaining_classes, subscription_plans:plan_id(name, duration, duration_unit, monthly_classes)')
        .eq('user_id', userId)
        .gte('end_date', today)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
        
      const subscription = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

      if (!fetchError && subscription) {
        // User has a subscription - restore to subscription
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
          console.warn('⚠️ Error updating subscription for refund:', updateError);
          return;
        }
        
        const planName = (subscription.subscription_plans as any)?.name || 'Unknown Plan';

        return;
      }

      // No subscription found - restore to user's daypass credits
      console.log('📝 No active subscription found, restoring to daypass credits...');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('credit_balance, remaining_classes')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.warn('⚠️ Error fetching user data for credit restoration:', userError);
        return;
      }
      
      const currentCreditBalance = userData.credit_balance || 0;
      const currentRemainingClasses = userData.remaining_classes || 0;
      
      // Restore 1 class to user's daypass credits
      const newRemainingClasses = currentRemainingClasses + 1;
      
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          remaining_classes: newRemainingClasses
        })
        .eq('id', userId);
      
      if (updateUserError) {
        console.warn('⚠️ Error updating user daypass credits for refund:', updateUserError);
        return;
      }
      
      console.log(`✅ SUCCESS: Refunded 1 class to daypass credits!`);
      console.log(`📊 Daypass class count: ${currentRemainingClasses} → ${newRemainingClasses}`);
      console.log(`💰 Credit balance unchanged: ${currentCreditBalance}`);
      
    } catch (error) {
      console.error('❌ Error restoring class to subscription/credits:', error);
    }
  }

  private async deductClassFromSubscription(userId: string | number): Promise<boolean> {
    try {
      // Ensure userId is string for Supabase UUID compatibility
      const userIdString = userId.toString();
      console.log(`💰 [DEDUCT] Starting credit deduction for user ${userIdString}`);
      
      // CRITICAL DEBUG: Check if ANY subscriptions exist for this user  
      console.log(`🔍 [DEDUCT] BEFORE QUERY: Checking if user has ANY subscriptions...`);
      console.log(`🔍 [DEDUCT] userIdString:`, userIdString);
      console.log(`🔍 [DEDUCT] userIdString type:`, typeof userIdString);
      console.log(`🔍 [DEDUCT] userIdString length:`, userIdString?.length);
      
      // Also try to get current auth user for comparison
      const { data: { user: authUser } } = await supabase.auth.getUser();
      console.log(`🔍 [DEDUCT] COMPARISON - authUser.id:`, authUser?.id);
      console.log(`🔍 [DEDUCT] COMPARISON - authUser matches userIdString:`, authUser?.id === userIdString);
      
      // CRITICAL FIX: If user doesn't match auth context, we need to use admin client
      const shouldUseAdminContext = authUser?.id !== userIdString;
      console.log(`🔍 [DEDUCT] Should use admin context:`, shouldUseAdminContext);
      
      // Use admin client when looking up different user's data
      const clientToUse = shouldUseAdminContext ? supabaseAdmin : supabase;
      console.log(`🔍 [DEDUCT] Using client:`, shouldUseAdminContext ? 'ADMIN' : 'USER');
      
      const { data: allUserSubs, error: allSubsError } = await clientToUse
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userIdString);
      
      console.log(`🔍 [DEDUCT] ALL user subscriptions:`, { 
        userIdString, 
        allUserSubs, 
        allSubsError,
        totalCount: allUserSubs?.length || 0
      });
      
      // First, try to deduct from user_subscriptions table (for subscription users)
      // Use SAME logic as getCurrentSubscription to find active subscriptions
      console.log(`🔍 [DEDUCT] Checking user_subscriptions table...`);
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      
      // CRITICAL FIX: For waitlist promotion, we always query by specific user_id regardless of auth context
      const { data: subscriptions, error: fetchError } = await clientToUse
        .from('user_subscriptions')
        .select('id, remaining_classes, status, end_date, subscription_plans:plan_id(name, duration, duration_unit, monthly_classes)')
        .eq('user_id', userIdString)
        .gte('end_date', today) // Include subscriptions that expire today or later
        .eq('status', 'active') // Only active subscriptions
        .order('created_at', { ascending: false })
        .limit(1);

      console.log(`🔍 [DEDUCT] Subscription query result:`, { 
        subscriptions, 
        error: fetchError,
        foundCount: subscriptions?.length || 0
      });
      





      if (!fetchError && subscriptions && subscriptions.length > 0) {
        // User has a subscription - deduct from the first (most recent) one
        const subscription = subscriptions[0];
        console.log(`📋 [DEDUCT] Found active subscription:`, {
          id: subscription.id,
          planName: (subscription.subscription_plans as any)?.name,
          remainingClasses: subscription.remaining_classes,
          status: subscription.status,
          endDate: subscription.end_date
        });
        
        if (subscription.remaining_classes <= 0) {
          console.warn(`⚠️ [DEDUCT] User has no remaining classes to deduct from subscription`);
          console.warn(`⚠️ [DEDUCT] Remaining classes: ${subscription.remaining_classes}`);
          return false; // ❌ Failed - no classes to deduct
        }
        
        const newRemainingClasses = subscription.remaining_classes - 1;
        console.log(`💰 [DEDUCT] Deducting 1 class: ${subscription.remaining_classes} → ${newRemainingClasses}`);
        
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
          console.warn(`⚠️ [DEDUCT] Error updating subscription for deduction:`, updateError);
          return false; // ❌ Failed - database error
        }
        
        const planName = (subscription.subscription_plans as any)?.name || 'Unknown Plan';
        console.log(`✅ [DEDUCT] SUCCESS: Deducted 1 class from ${planName} subscription!`);
        console.log(`📊 [DEDUCT] Subscription class count: ${subscription.remaining_classes} → ${updateData?.remaining_classes || newRemainingClasses}`);
        return true; // ✅ Success - deducted from subscription
      }
      
      // No subscription found - user needs an active subscription to book classes
      console.log(`❌ [DEDUCT] No active subscription found (error: ${fetchError?.message || 'none'})`);
      console.log(`❌ [DEDUCT] User must have an active subscription in user_subscriptions table to book classes`);
      console.log(`💡 [DEDUCT] Solution: Create a subscription for this user via admin/reception`);
      return false; // ❌ Failed - no active subscription
      
    } catch (error) {
      console.error('❌ Error deducting class from subscription/credits:', error);
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
        console.error(`❌ Credit deduction FAILED for waitlist promotion - rolling back booking`);
        
        // Delete the booking we just created since credit deduction failed
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
        return await this.promoteFromWaitlist(classId);
      }
      
      // 📢 Send promotion notification to the specific user
      try {
        const classInfo = waitlistEntry.classes as any;
        if (classInfo) {
          const message = `🎉 Congratulations! You've been promoted from the waitlist to confirmed for "${classInfo.name}" on ${new Date(classInfo.date).toLocaleDateString()} at ${classInfo.time}. See you there!`;
          
          console.log(`📢 [NOTIFICATION] Sending waitlist to booking promotion notification to user ${waitlistEntry.user_id}`);
          
          await notificationService.sendClassNotification(
            classId,
            'waitlist_promotion',
            message,
            [waitlistEntry.user_id]
          );

          // Schedule class reminder for the promoted user based on their preferences
          await pushNotificationService.scheduleClassReminders(waitlistEntry.user_id);
          
          console.log(`✅ [NOTIFICATION] Waitlist promotion notification sent successfully`);
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
      
      console.log(`📊 [WAITLIST] Found ${waitlistEntries?.length || 0} entries to update`);
      
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
            console.log(`✅ [WAITLIST] Updated entry ${update.id}: position ${update.currentPosition} → ${update.newPosition}`);
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
              const message = `🎯 You've moved to position #${notification.newPosition} on the waitlist for "${classInfo.name}" on ${new Date(classInfo.date).toLocaleDateString()} at ${classInfo.time}.`;
              await notificationService.sendClassNotification(classId, 'update', message, [notification.user_id]);
            }
          } catch (notifyError) {
            console.warn('⚠️ [WAITLIST] Failed to send position update notification:', notifyError);
          }
        }

        console.log(`✅ [WAITLIST] Successfully updated ${waitlistEntries.length} waitlist positions and sent ${notificationsToSend.length} notifications`);
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
        console.error('❌ Error getting waitlist count:', countError);
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
        console.log(`🔄 [joinWaitlist] Attempt ${attempts} with position ${nextPosition}`);
        
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
            console.log(`⚠️ [joinWaitlist] Position ${nextPosition} already taken, trying next position`);
            nextPosition++;
            continue;
          } else {
            console.error('❌ Error joining waitlist:', error);
            return { success: false, error: error.message };
          }
        } else {
          // Success! Exit the loop
          insertSuccess = true;
          
          // 📱 Send waitlist join notification
          try {
            const classInfo = data.classes;
            if (classInfo) {
              const notificationMessage = `🎯 You've been added to the waitlist for "${classInfo.name}" on ${new Date(classInfo.date).toLocaleDateString()} at ${classInfo.time}. You are position #${nextPosition}. We'll notify you if a spot opens up!`;
              
              console.log('📢 [joinWaitlist] Sending waitlist join notification...');
              
              // Send notification to the user who joined the waitlist
              await notificationService.sendClassNotification(
                waitlistData.classId,
                'update',
                notificationMessage,
                [user.id]
              );
              
              console.log(`✅ [joinWaitlist] Waitlist join notification sent to user ${user.id}`);
            }
          } catch (notificationError) {
            // Don't fail the waitlist join if notification fails
            console.error('⚠️ [joinWaitlist] Failed to send notification:', notificationError);
          }
          
          return { success: true, data };
        }
      }
      
      // If we got here, all attempts failed
      return { success: false, error: 'Failed to join waitlist after multiple attempts' };
    } catch (error) {
      console.error('❌ Error in joinWaitlist:', error);
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
      
      // 🚨 CRITICAL FIX: Handle waitlist promotion for admin/reception cancellations
      console.log(`🎯 [ADMIN_CANCEL] Starting waitlist promotion check for class ${classIdValue}`);
      const waitlistPromoted = await this.promoteFromWaitlist(classIdValue as number);
      console.log(`🎯 [ADMIN_CANCEL] Waitlist promotion result: ${waitlistPromoted ? 'SUCCESS' : 'NO_PROMOTION'}`);
      
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