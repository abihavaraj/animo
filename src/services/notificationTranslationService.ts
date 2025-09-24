import i18n from '../i18n';

// Interface for notification data
export interface NotificationData {
  type: 'waitlist_joined' | 'class_assignment' | 'class_assignment_cancelled' | 'class_booked' | 'class_cancelled_by_studio' | 
        'instructor_change' | 'class_time_change' | 'subscription_expiring' | 'subscription_expired' | 
        'class_full' | 'waitlist_moved_up' | 'waitlist_promoted' | 'class_reminder' | 'welcome';
  className?: string;
  instructorName?: string;
  oldInstructor?: string;
  newInstructor?: string;
  date?: string;
  time?: string;
  oldTime?: string;
  newTime?: string;
  position?: number;
  newPosition?: number;
  planName?: string;
  expiryDate?: string;
  userName?: string;
  minutes?: number;
  staffName?: string;
  creditRestored?: boolean;
}

// Notification translation service
export class NotificationTranslationService {
  
  /**
   * Get translated notification title and body based on type and user language
   */
  static getTranslatedNotification(
    type: NotificationData['type'], 
    data: NotificationData, 
    userLanguage: string = 'en'
  ): { title: string; body: string } {
    
    // Set the language for translation (only if different)
    const currentLang = i18n.language;
    if (currentLang !== userLanguage) {
      i18n.changeLanguage(userLanguage);
    }
    
    let title = '';
    let body = '';
    
    try {
      switch (type) {
        case 'waitlist_joined':
          title = i18n.t('notifications.waitlistJoinedTitle');
          body = i18n.t('notifications.waitlistJoinedBody', {
            className: data.className,
            date: data.date,
            time: data.time,
            position: data.position
          });
          break;
          
        case 'class_assignment':
          title = i18n.t('notifications.classAssignmentTitle');
          body = i18n.t('notifications.classAssignmentBody', {
            className: data.className,
            instructorName: data.instructorName,
            date: data.date,
            time: data.time
          });
          break;
          
        case 'class_assignment_cancelled':
          title = i18n.t('notifications.classAssignmentCancelledTitle');
          const creditMessage = data.creditRestored ? ' Your class credit has been restored.' : '';
          body = i18n.t('notifications.classAssignmentCancelledBody', {
            className: data.className,
            date: data.date,
            time: data.time,
            staffName: data.staffName,
            creditRestored: creditMessage
          });
          break;
          
        case 'class_booked':
          title = i18n.t('notifications.classBookedTitle');
          body = i18n.t('notifications.classBookedBody', {
            className: data.className,
            instructorName: data.instructorName,
            date: data.date,
            time: data.time
          });
          break;
          
        case 'class_cancelled_by_studio':
          title = i18n.t('notifications.classCancelledByStudioTitle');
          body = i18n.t('notifications.classCancelledByStudioBody', {
            className: data.className,
            date: data.date,
            time: data.time
          });
          break;
          
        case 'instructor_change':
          title = i18n.t('notifications.instructorChangeTitle');
          body = i18n.t('notifications.instructorChangeBody', {
            className: data.className,
            date: data.date,
            oldInstructor: data.oldInstructor,
            newInstructor: data.newInstructor
          });
          break;
          
        case 'class_time_change':
          title = i18n.t('notifications.classTimeChangeTitle');
          body = i18n.t('notifications.classTimeChangeBody', {
            className: data.className,
            date: data.date,
            oldTime: data.oldTime,
            newTime: data.newTime
          });
          break;
          
        case 'subscription_expiring':
          title = i18n.t('notifications.subscriptionExpiringTitle');
          body = i18n.t('notifications.subscriptionExpiringBody', {
            planName: data.planName,
            expiryDate: data.expiryDate
          });
          break;
          
        case 'subscription_expired':
          title = i18n.t('notifications.subscriptionExpiredTitle');
          body = i18n.t('notifications.subscriptionExpiredBody', {
            planName: data.planName
          });
          break;
          
        case 'class_full':
          title = i18n.t('notifications.classFullTitle');
          body = i18n.t('notifications.classFullBody', {
            className: data.className,
            date: data.date,
            time: data.time
          });
          break;
          
        case 'waitlist_moved_up':
          title = i18n.t('notifications.waitlistMovedUpTitle');
          body = i18n.t('notifications.waitlistMovedUpBody', {
            className: data.className,
            newPosition: data.newPosition
          });
          break;
          
        case 'waitlist_promoted':
          title = i18n.t('notifications.waitlistPromotedTitle');
          body = i18n.t('notifications.waitlistPromotedBody', {
            className: data.className,
            date: data.date,
            time: data.time
          });
          break;
          
        case 'class_reminder':
          title = i18n.t('notifications.classReminder', { className: data.className });
          body = i18n.t('notifications.classReminderBody', {
            className: data.className,
            instructorName: data.instructorName,
            minutes: data.minutes
          });
          break;
          
        case 'welcome':
          title = i18n.t('notifications.welcomeTitle');
          body = i18n.t('notifications.welcomeBody', {
            userName: data.userName
          });
          break;
          
        default:
          title = i18n.t('notifications.generalNotificationTitle');
          body = 'New notification from Animo Pilates';
      }
    } catch (error) {
      console.error('Error translating notification:', error);
      // Fallback to English
      title = '🧘‍♀️ Animo Pilates';
      body = 'You have a new notification';
    } finally {
      // Restore original language
      i18n.changeLanguage(currentLang);
    }
    
    return { title, body };
  }
  
  /**
   * Get user's preferred language from their database profile
   */
  static async getUserLanguage(userId: string): Promise<string> {
    try {
      // First try to get from database (for server-side)
      const { supabase } = await import('../config/supabase.config');
      const { data: user, error } = await supabase
        .from('users')
        .select('language_preference')
        .eq('id', userId)
        .single();
      
      console.log(`🌍 [getUserLanguage] Database lookup for user ${userId}:`, { user, error });
      
      if (!error && user?.language_preference) {
        console.log(`✅ [getUserLanguage] Found DB language preference: ${user.language_preference}`);
        return user.language_preference;
      }
      
      // Fallback to AsyncStorage (for client-side)
      try {
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const storedLanguage = await AsyncStorage.default.getItem('app_language');
        console.log(`📱 [getUserLanguage] AsyncStorage fallback: ${storedLanguage || 'en'}`);
        return storedLanguage || 'en';
      } catch (asyncError) {
        console.log('Could not get user language from AsyncStorage:', asyncError);
        return 'en';
      }
    } catch (error) {
      console.error('Error getting user language:', error);
      return 'en';
    }
  }
  
  /**
   * Create a notification with translated content
   */
  static async createTranslatedNotification(
    userId: string,
    type: NotificationData['type'],
    data: NotificationData,
    scheduledFor?: Date,
    useCurrentLanguage: boolean = false
  ): Promise<{ title: string; body: string; userLanguage: string }> {
    
    // Get user's preferred language
    let userLanguage = await this.getUserLanguage(userId);
    
    // If useCurrentLanguage is true, prioritize current UI language
    if (useCurrentLanguage) {
      const currentLang = i18n.language;
      console.log(`🌍 [createTranslatedNotification] Using current UI language: ${currentLang} instead of DB: ${userLanguage}`);
      userLanguage = currentLang;
    }
    
    console.log(`🔔 [createTranslatedNotification] User ${userId}, Type: ${type}, Language: ${userLanguage}`);
    
    // Get translated content
    const { title, body } = this.getTranslatedNotification(type, data, userLanguage);
    console.log(`📝 [createTranslatedNotification] Generated content:`, { title, body });
    
    return {
      title,
      body,
      userLanguage
    };
  }
}

export default NotificationTranslationService;
