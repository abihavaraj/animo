import moment from 'moment';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase.config';
import i18n from '../i18n';
import { bookingService } from '../services/bookingService';
import { pushNotificationService } from '../services/pushNotificationService';

// Local utility functions
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const weekdayIndex = date.getDay();
  
  // Get localized weekdays from translation
  const currentLang = i18n.language || 'en';
  const weekdaysKey = 'dates.weekdays.short';
  const weekdays = i18n.t(weekdaysKey, { returnObjects: true }) as string[];
  
  // Fallback to English if translation fails
  const fallbackWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const finalWeekdays = Array.isArray(weekdays) ? weekdays : fallbackWeekdays;
  
  const weekday = finalWeekdays[weekdayIndex];
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${weekday} ${day}/${month}/${year}`;
};

const formatTime = (time: string) => {
  // Use Albanian locale and 24-hour format for Albanian language
  const currentLang = i18n.language || 'en';
  if (currentLang === 'sq') {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('sq-AL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Use 24-hour format for Albanian
        timeZone: 'Europe/Tirane'
      });
    } catch (error) {
      // Fallback to simple 24-hour format
      const timeParts = time.split(':');
      if (timeParts.length >= 2) {
        return `${timeParts[0]}:${timeParts[1]}`;
      }
      return time;
    }
  } else {
    // Use 12-hour format for English
    return moment(time, 'HH:mm:ss').format('h:mm A');
  }
};

export interface BookingData {
  id: string | number;
  classId?: string | number;
  class_id?: string | number;
  class_name?: string;
  class_date?: string;
  class_time?: string;
  instructor_name?: string;
}

export interface ClassData {
  id: string | number;
  name: string;
  date: string;
  time: string;
  instructor_name?: string;
  current_capacity?: number;
  max_capacity?: number;
}

export interface TranslationFunctions {
  t: (key: string, params?: any) => string;
}

export interface UnifiedBookingUtils {
  // Validation functions
  isBookable(classDate: string, classTime: string): boolean;
  canCancelBooking(classDate: string, classTime: string): boolean;
  canJoinWaitlist(classDate: string, classTime: string): boolean;
  
  // Action functions
  bookClass(classId: string | number, subscription: any): Promise<boolean>;
  cancelBooking(booking: BookingData, onSuccess?: () => void): Promise<boolean>;
  joinWaitlist(classId: string | number, subscription: any): Promise<boolean>;
  leaveWaitlist(waitlistId: number, className?: string, onSuccess?: () => void): Promise<boolean>;
}

class BookingUtilsService implements UnifiedBookingUtils {
  
  // VALIDATION FUNCTIONS
  
  /**
   * Check if a class is bookable (using Albanian timezone)
   */
  isBookable(classDate: string, classTime: string): boolean {
    try {
      // Get current time in Albanian timezone (Europe/Tirane)
      const now = new Date();
      const currentTimeInAlbania = new Date(now.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));
      
      // Class times are stored as Albanian local time
      const classDateTimeString = `${classDate}T${classTime}`;
      const classDateTime = new Date(classDateTimeString);
      const classTimeInAlbania = new Date(classDateTime.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));

      // Class is in the past
      if (currentTimeInAlbania > classTimeInAlbania) {
        return false;
      }

      // Booking cutoff (15 minutes before class)
      const cutoffTime = new Date(classTimeInAlbania.getTime() - 15 * 60 * 1000);
      if (currentTimeInAlbania > cutoffTime) {
        return false;
      }

      return true;
    } catch (error) {
      // Fallback to original logic
      const now = new Date();
      const classDateTime = new Date(`${classDate}T${classTime}`);
      if (now > classDateTime) return false;
      const cutoffTime = new Date(classDateTime.getTime() - 15 * 60 * 1000);
      if (now > cutoffTime) return false;
      return true;
    }
  }

  /**
   * Check if a class has already passed (considering duration)
   */
  isClassPassed(classDate: string, classTime: string, duration: number = 60): boolean {
    try {
      // Get current time in Albanian timezone (Europe/Tirane)
      const now = new Date();
      const currentTimeInAlbania = new Date(now.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));
      
      // Class times are stored as Albanian local time
      const classDateTimeString = `${classDate}T${classTime}`;
      const classDateTime = new Date(classDateTimeString);
      const classTimeInAlbania = new Date(classDateTime.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));

      // Calculate class end time (add duration in minutes)
      const classEndTime = new Date(classTimeInAlbania.getTime() + duration * 60000);
      
      // Class has passed if current time is after class end time
      return currentTimeInAlbania > classEndTime;
    } catch (error) {
      // Fallback to original logic
      const now = new Date();
      const classDateTime = new Date(`${classDate}T${classTime}`);
      const classEndTime = new Date(classDateTime.getTime() + duration * 60000);
      return now > classEndTime;
    }
  }

  /**
   * Check if a booking can be cancelled (2-hour rule)
   */
  canCancelBooking(classDate: string, classTime: string): boolean {
    // CRITICAL: Always use Albanian timezone for consistency
    // This ensures the 2-hour rule works correctly regardless of user's phone timezone
    
    try {
      // Get current time in Albanian timezone (Europe/Tirane)
      const now = new Date();
      const currentTimeInAlbania = new Date(now.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));
      
      // Class times are stored as Albanian local time, so we need to parse them as such
      // Create class datetime assuming it's in Albanian timezone
      const classDateTimeString = `${classDate}T${classTime}`;
      const classDateTime = new Date(classDateTimeString);
      
      // Convert to Albanian timezone to ensure consistency
      const classTimeInAlbania = new Date(classDateTime.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));
      
      
      // Cannot cancel past classes
      if (currentTimeInAlbania >= classTimeInAlbania) {
        return false;
      }

      // 2-hour cancellation rule using Albanian timezone
      const millisecondsUntilClass = classTimeInAlbania.getTime() - currentTimeInAlbania.getTime();
      const hoursUntilClass = millisecondsUntilClass / (1000 * 60 * 60);
      
      // Timezone check - removed noisy log
      return hoursUntilClass >= 2;
      
    } catch (error) {
      console.error('❌ [TIMEZONE] Error in canCancelBooking timezone calculation:', error);
      // Fallback to original logic if timezone conversion fails
      const now = new Date();
      const classDateTime = new Date(`${classDate}T${classTime}`);
      if (now > classDateTime) return false;
      const hoursUntilClass = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilClass >= 2;
    }
  }

  /**
   * Check if can join waitlist
   */
  canJoinWaitlist(classDate: string, classTime: string): boolean {
    // Same logic as booking - can join waitlist if class is future and not too close
    return this.isBookable(classDate, classTime);
  }

  /**
   * Get hours until class starts (using Albanian timezone)
   */
  private getHoursUntilClass(classDate: string, classTime: string): number {
    try {
      // Use Albanian timezone for consistency
      const now = new Date();
      const currentTimeInAlbania = new Date(now.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));
      
      const classDateTimeString = `${classDate}T${classTime}`;
      const classDateTime = new Date(classDateTimeString);
      const classTimeInAlbania = new Date(classDateTime.toLocaleString("sv-SE", {timeZone: "Europe/Tirane"}));
      
      return (classTimeInAlbania.getTime() - currentTimeInAlbania.getTime()) / (1000 * 60 * 60);
    } catch (error) {
      // Fallback for timezone calculation errors
      const now = new Date();
      const classDateTime = new Date(`${classDate}T${classTime}`);
      return (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    }
  }

  /**
   * Format time remaining until class
   */
  private formatTimeUntilClass(classDate: string, classTime: string): string {
    const hours = this.getHoursUntilClass(classDate, classTime);
    
    if (hours < 1) {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minutes`;
    } else if (hours < 24) {
      return `${Math.floor(hours)} hours`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'}`;
    }
  }

  // ACTION FUNCTIONS

  /**
   * Unified book class function with complete validation
   */
  async bookClass(classId: string | number, subscription: any, classData?: any, t?: any): Promise<boolean> {
    try {
      // Check subscription
      if (!subscription) {
        const title = t ? t('classes.subscriptionRequired') : 'Subscription Required';
        const message = t ? t('classes.needSubscriptionToBook') : 'You need an active subscription plan to book classes. Please contact reception to purchase a plan.';
        Alert.alert(title, message);
        return false;
      }

      if (subscription.status !== 'active') {
        const title = t ? t('classes.subscriptionNotActive') : 'Subscription Not Active';
        const message = t ? t('classes.subscriptionNotActiveDesc') : 'Your subscription is not active. Please contact reception for assistance.';
        Alert.alert(title, message);
        return false;
      }

      // Check remaining classes (with unlimited support)
      const monthlyClasses = subscription.monthly_classes || 0;
      const remainingClasses = subscription.remaining_classes || 0;
      const isUnlimited = monthlyClasses >= 999;
      
      if (!isUnlimited && remainingClasses <= 0) {
        const title = t ? t('classes.noClassesRemaining') : 'No Classes Remaining';
        const message = t ? t('classes.noClassesRemainingDesc') : 'You have no classes remaining in your subscription. Please contact reception to renew or add classes.';
        Alert.alert(title, message);
        return false;
      }

      // Check subscription restrictions based on CLASS CATEGORY and CAPACITY
      if (classData) {
        const subscriptionCategory = subscription.category;
        const classCategory = classData.category;
        const classCapacity = classData.capacity;

        // BUSINESS LOGIC: Check class category and capacity matching
        if (classCategory === 'group') {
          // GROUP classes allow both group subscriptions AND daypass/monthly (which might be categorized as 'group')
          // Only block personal subscription types from group classes
          // Check if it's a daypass (duration = 1 day) - these should be allowed for group classes
          const isDaypass = subscription.duration === 1 && subscription.duration_unit === 'days';
          const isPersonalSubscription = (subscriptionCategory === 'personal' || subscriptionCategory === 'personal_duo' || subscriptionCategory === 'personal_trio') && !isDaypass;
          
          if (isPersonalSubscription) {
            const title = t ? t('equipmentAccess.title') : 'Group Class Access Required';
            const message = t ? t('equipmentAccess.needGroupSubscription') : 'This is a group class. Personal subscriptions cannot book group classes.';
            Alert.alert(title, message);
            return false;
          }
        } else if (classCategory === 'personal') {
          // PERSONAL classes require matching personal subscription based on capacity
          let requiredSubscription = '';
          if (classCapacity === 1) requiredSubscription = 'personal';
          else if (classCapacity === 2) requiredSubscription = 'personal_duo';
          else if (classCapacity === 3) requiredSubscription = 'personal_trio';
          
          if (subscriptionCategory !== requiredSubscription) {
            const title = t ? t('equipmentAccess.personalTrainingSession') : 'Personal Training Session';
            let message = '';
            if (classCapacity === 1) {
              message = t ? t('equipmentAccess.needPersonalSubscription') : 'This is a personal training session (1 person). You need a personal subscription to book this class.';
            } else if (classCapacity === 2) {
              message = 'This is a personal duo session (2 people). You need a personal duo subscription to book this class.';
            } else if (classCapacity === 3) {
              message = 'This is a personal trio session (3 people). You need a personal trio subscription to book this class.';
            }
            Alert.alert(title, message);
            return false;
          }
        }

        // Check equipment access
        const planEquipment = subscription.equipment_access;
        const classEquipmentType = classData.equipment_type || classData.equipmentType || 'mat';
        
        if (!this.isEquipmentAccessAllowed(planEquipment, classEquipmentType)) {
          const title = t ? t('equipmentAccess.title') : 'Equipment Access Required';
          let message;
          
          if (t) {
            const accessMap = {
              'mat': t('equipmentAccess.matOnly'),
              'reformer': t('equipmentAccess.reformerOnly'),
              'both': t('equipmentAccess.fullEquipment')
            };
            message = t('equipmentAccess.requiresAccess', { 
              equipment: accessMap[classEquipmentType] || classEquipmentType, 
              userAccess: accessMap[planEquipment] || planEquipment 
            });
          } else {
            message = `This class requires ${classEquipmentType} access, but your subscription only includes ${planEquipment} access.`;
          }
          
          Alert.alert(title, message);
          return false;
        }
      }

      // Perform booking
      const response = await bookingService.createBooking({ classId: classId.toString() });
      
      if (response.success) {
        // Show success confirmation
        const successTitle = t ? t('classes.bookingConfirmed') : '✅ Booking Confirmed!';
        const className = classData?.name || 'class';
        const classDate = classData?.date ? formatDate(classData.date) : '';
        
        // Handle different time field names (time vs startTime)
        const rawTime = classData?.time || (classData as any)?.startTime || '';
        const classTime = rawTime ? formatTime(rawTime) : '';
        
        // Debug logging for Albanian time formatting
        console.log('🕐 [BOOKING_SUCCESS] Class time data:', {
          classData,
          rawTime,
          formattedTime: classTime,
          language: i18n.language
        });
        
        const successMessage = t ? 
          t('booking.bookingConfirmedMessage', { 
            className, 
            date: classDate, 
            time: classTime 
          }) : 
          `Your booking for ${className} is confirmed${classDate ? ` for ${classDate}` : ''}${classTime ? ` at ${classTime}` : ''}.`;
        
        Alert.alert(successTitle, successMessage);
        return true;
      } else {
        const title = t ? t('classes.bookingFailed') : 'Booking Failed';
        const message = response.error || (t ? t('classes.failedToBookClass') : 'Failed to book class. Please try again.');
        Alert.alert(title, message);
        return false;
      }
    } catch (error) {
      const title = t ? t('alerts.error') : 'Error';
      const message = t ? t('alerts.errorBookingFailed') : 'An error occurred while booking the class. Please try again.';
      Alert.alert(title, message);
      return false;
    }
  }

  /**
   * Helper function for equipment validation
   */
  private isEquipmentAccessAllowed(userAccess: string, classEquipment: string): boolean {
    if (userAccess === 'both') return true;
    return userAccess === classEquipment;
  }

  /**
   * Unified cancel booking function with reminder cleanup
   */
  async cancelBooking(booking: BookingData, onSuccess?: () => void, t?: any): Promise<boolean> {
    try {
      if (!booking.class_date || !booking.class_time) {
        Alert.alert('Error', 'Unable to cancel booking - missing class information.');
        return false;
      }

      if (!this.canCancelBooking(booking.class_date, booking.class_time)) {
        const timeRemaining = this.formatTimeUntilClass(booking.class_date, booking.class_time);
        const title = t ? t('classes.cannotCancel') : 'Cannot Cancel Booking';
        const message = t ? 
          t('classes.cannotCancelDesc', { timeRemaining }) : 
          `Sorry, you cannot cancel this booking. Time remaining: ${timeRemaining}.\n\nOur policy requires cancellations to be made at least 2 hours before the class starts.`;
        Alert.alert(title, message);
        return false;
      }

      const timeDisplay = this.formatTimeUntilClass(booking.class_date, booking.class_time);
      
      return new Promise((resolve) => {
        const title = t ? t('classes.cancelBooking') : 'Cancel Booking';
        const message = t ? 
          t('booking.cancelBookingConfirm', {
            className: booking.class_name,
            date: formatDate(booking.class_date),
            time: formatTime(booking.class_time),
            timeRemaining: timeDisplay
          }) :
          `Are you sure you want to cancel your booking for "${booking.class_name}"?\n\nClass: ${formatDate(booking.class_date)} at ${formatTime(booking.class_time)}\nTime remaining: ${timeDisplay}\n\nYour credit will be refunded to your account.`;
        
        Alert.alert(
          title,
          message,
          [
            { 
              text: t ? t('classes.keepBooking') : 'Keep Booking', 
              style: 'cancel',
              onPress: () => resolve(false)
            },
            { 
              text: t ? t('classes.cancelBooking') : 'Cancel Booking', 
              style: 'destructive',
              onPress: async () => {
                try {
                  // Cancelling booking
                  
                  // Cancel the booking
                  const response = await bookingService.cancelBooking(booking.id.toString());
                  
                  if (response.success) {
                    // Cancel any reminder notifications for this class
                    // Cancelling reminder notifications
                    // Get current user ID from Redux or auth
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user?.id) {
                      await pushNotificationService.cancelClassReminder(
                        user.id,
                        (booking.classId || booking.class_id || booking.id).toString()
                      );
                    }
                    
                    const cancelData = response.data as any;
                    const successTitle = t ? t('classes.bookingCancelled') : 'Booking Cancelled';
                    const successMessage = t ? 
                      (cancelData?.waitlistPromoted ? 
                        t('booking.bookingCancelledWithPromotion') : 
                        t('booking.bookingCancelledSuccess')) :
                      (cancelData?.waitlistPromoted 
                        ? 'Your booking has been cancelled and your credit refunded. Someone from the waitlist has been promoted!'
                        : 'Your booking has been cancelled and your credit has been refunded to your account.');
                    
                    Alert.alert(successTitle, successMessage);
                    
                    onSuccess?.();
                    resolve(true);
                  } else {
                    Alert.alert('Cancellation Failed', response.error || 'Failed to cancel booking. Please try again.');
                    resolve(false);
                  }
                } catch (error) {
                  console.error('❌ [UNIFIED] Error cancelling booking:', error);
                  Alert.alert('Error', 'An error occurred while cancelling the booking. Please try again.');
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('❌ [UNIFIED] Error in cancelBooking:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
      return false;
    }
  }

  /**
   * Unified join waitlist function with complete validation
   */
  async joinWaitlist(classId: string | number, subscription: any, classData?: any, t?: any): Promise<boolean> {
    try {
      // Check subscription
      if (!subscription) {
        const title = t ? t('classes.subscriptionRequired') : 'Subscription Required';
        const message = t ? t('classes.needSubscriptionToBook') : 'You need an active subscription plan to join waitlists. Please contact reception to purchase a plan.';
        Alert.alert(title, message);
        return false;
      }

      if (subscription.status !== 'active') {
        const title = t ? t('classes.subscriptionNotActive') : 'Subscription Not Active';
        const message = t ? t('classes.subscriptionNotActiveDesc') : 'Your subscription is not active. Please contact reception for assistance.';
        Alert.alert(title, message);
        return false;
      }

      // Check subscription restrictions based on CLASS CATEGORY and CAPACITY
      if (classData) {
        const subscriptionCategory = subscription.category;
        const classCategory = classData.category;
        const classCapacity = classData.capacity;


        // BUSINESS LOGIC: Check class category and capacity matching
        if (classCategory === 'group') {
          // GROUP classes allow both group subscriptions AND daypass/monthly (which might be categorized as 'group')
          // Only block personal subscription types from group classes
          // Check if it's a daypass (duration = 1 day) - these should be allowed for group classes
          const isDaypass = subscription.duration === 1 && subscription.duration_unit === 'days';
          const isPersonalSubscription = (subscriptionCategory === 'personal' || subscriptionCategory === 'personal_duo' || subscriptionCategory === 'personal_trio') && !isDaypass;
          
          if (isPersonalSubscription) {
            const title = t ? t('equipmentAccess.title') : 'Group Class Access Required';
            const message = t ? t('equipmentAccess.needGroupSubscription') : 'This is a group class. Personal subscriptions cannot book group classes.';
            Alert.alert(title, message);
            return false;
          }
        } else if (classCategory === 'personal') {
          // PERSONAL classes require matching personal subscription based on capacity
          let requiredSubscription = '';
          if (classCapacity === 1) requiredSubscription = 'personal';
          else if (classCapacity === 2) requiredSubscription = 'personal_duo';
          else if (classCapacity === 3) requiredSubscription = 'personal_trio';
          
          if (subscriptionCategory !== requiredSubscription) {
            const title = t ? t('equipmentAccess.personalTrainingSession') : 'Personal Training Session';
            let message = '';
            if (classCapacity === 1) {
              message = t ? t('equipmentAccess.needPersonalSubscription') : 'This is a personal training session (1 person). You need a personal subscription to book this class.';
            } else if (classCapacity === 2) {
              message = 'This is a personal duo session (2 people). You need a personal duo subscription to book this class.';
            } else if (classCapacity === 3) {
              message = 'This is a personal trio session (3 people). You need a personal trio subscription to book this class.';
            }
            Alert.alert(title, message);
            return false;
          }
        }

        // Check equipment access
        const planEquipment = subscription.equipment_access;
        const classEquipmentType = classData.equipment_type || classData.equipmentType || 'mat';
        
        if (!this.isEquipmentAccessAllowed(planEquipment, classEquipmentType)) {
          const title = t ? t('equipmentAccess.title') : 'Equipment Access Required';
          let message;
          
          if (t) {
            const accessMap = {
              'mat': t('equipmentAccess.matOnly'),
              'reformer': t('equipmentAccess.reformerOnly'),
              'both': t('equipmentAccess.fullEquipment')
            };
            message = t('equipmentAccess.requiresAccess', { 
              equipment: accessMap[classEquipmentType] || classEquipmentType, 
              userAccess: accessMap[planEquipment] || planEquipment 
            });
          } else {
            message = `This class requires ${classEquipmentType} access, but your subscription only includes ${planEquipment} access.`;
          }
          
          Alert.alert(title, message);
          return false;
        }
      }

      // NOTE: This unified utils version should NOT show confirmation dialog
      // The calling screens (Dashboard, Calendar) now handle their own confirmation dialogs
      // This just performs the actual waitlist join operation
      try {
      const response = await bookingService.joinWaitlist({ classId: classId.toString() });
        
        if (response.success) {
          // Show success confirmation with waitlist position
          const successTitle = t ? t('classes.joinedWaitlist') : '📋 Joined Waitlist!';
          const className = classData?.name || 'class';
          const classDate = classData?.date ? formatDate(classData.date) : '';
          const classTime = classData?.time ? formatTime(classData.time) : '';
          const position = response.data?.position || null;
          
          let successMessage;
          if (position) {
            successMessage = t ? 
              t('booking.joinedWaitlistWithPosition', { 
                className, 
                position,
                date: classDate, 
                time: classTime 
              }) : 
              `You've joined the waitlist for ${className}${classDate ? ` on ${classDate}` : ''}${classTime ? ` at ${classTime}` : ''}.\n\nYour position: ${position}`;
          } else {
            successMessage = t ? 
              t('booking.joinedWaitlistMessage', { 
                className, 
                date: classDate, 
                time: classTime 
              }) : 
              `You've joined the waitlist for ${className}${classDate ? ` on ${classDate}` : ''}${classTime ? ` at ${classTime}` : ''}.`;
          }
          
          Alert.alert(successTitle, successMessage);
          return true;
        } else {
          const title = t ? t('classes.failedToJoinWaitlist') : 'Failed to Join Waitlist';
          const message = response.error || (t ? t('classes.unableToJoinWaitlist') : 'Unable to join waitlist. Please try again.');
          Alert.alert(title, message);
          return false;
        }
      } catch (error) {
        console.error('❌ [UNIFIED] Error joining waitlist:', error);
        const title = t ? t('alerts.error') : 'Error';
        const message = t ? t('alerts.errorJoiningWaitlist') : 'An error occurred while joining the waitlist. Please try again.';
        Alert.alert(title, message);
        return false;
      }
    } catch (error) {
      console.error('❌ [UNIFIED] Error in joinWaitlist:', error);
      const title = t ? t('alerts.error') : 'Error';
      const message = t ? t('alerts.errorOccurred') : 'An error occurred. Please try again.';
      Alert.alert(title, message);
      return false;
    }
  }

  /**
   * Unified leave waitlist function
   */
  async leaveWaitlist(waitlistId: number, className?: string, onSuccess?: () => void, t?: any): Promise<boolean> {
    try {
      return new Promise((resolve) => {
        const title = t ? t('classes.leaveWaitlist') : 'Leave Waitlist';
        const message = t ? 
          t('classes.leaveWaitlistConfirm', { className: className ? ` for "${className}"` : '' }) :
          `Are you sure you want to leave the waitlist${className ? ` for "${className}"` : ''}?`;
        
        Alert.alert(
          title,
          message,
          [
            { 
              text: t ? t('common.cancel') : 'Cancel', 
              style: 'cancel',
              onPress: () => resolve(false)
            },
            { 
              text: t ? t('classes.leaveWaitlist') : 'Leave Waitlist', 
              style: 'destructive',
              onPress: async () => {
                try {
      const response = await bookingService.leaveWaitlist(waitlistId);
                  
                  if (response.success) {
                    const successTitle = t ? t('booking.leftWaitlist') : 'Left Waitlist';
                    const successMessage = t ? t('classes.removedFromWaitlist') : 'You have been removed from the waitlist.';
                    Alert.alert(successTitle, successMessage);
                    onSuccess?.();
                    resolve(true);
                  } else {
                    const errorTitle = t ? t('booking.failedToLeaveWaitlist') : 'Failed to Leave Waitlist';
                    const errorMessage = response.error || (t ? t('booking.unableToLeaveWaitlist') : 'Unable to leave waitlist. Please try again.');
                    Alert.alert(errorTitle, errorMessage);
                    resolve(false);
                  }
                } catch (error) {
                  console.error('❌ [UNIFIED] Error leaving waitlist:', error);
                  Alert.alert('Error', 'An error occurred while leaving the waitlist. Please try again.');
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    } catch (error) {
      console.error('❌ [UNIFIED] Error in leaveWaitlist:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
      return false;
    }
  }
}

export const unifiedBookingUtils = new BookingUtilsService();
