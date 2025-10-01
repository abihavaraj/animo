import i18n from '../i18n';

// Interface for notification data
export interface NotificationData {
  type: 'waitlist_joined' | 'class_assignment' | 'class_assignment_cancelled' | 'class_booked' | 'class_cancelled_by_studio' | 
        'instructor_change' | 'class_time_change' | 'subscription_expiring' | 'subscription_expired' | 
        'class_full' | 'waitlist_moved_up' | 'waitlist_promoted' | 'class_reminder' | 'welcome' |
        'student_joined_class' | 'student_cancelled_booking';
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
  studentName?: string;
}

// 🚀 OPTIMIZATION: Cache for user languages and translations
interface TranslationCache {
  [key: string]: { title: string; body: string };
}

interface UserLanguageCache {
  [userId: string]: { language: string; timestamp: number };
}

// Notification translation service
export class NotificationTranslationService {
  // 🚀 OPTIMIZATION: Static caches for performance
  private static userLanguageCache: UserLanguageCache = {};
  private static translationCache: TranslationCache = {};
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Get translated notification title and body based on type and user language
   * 🚀 OPTIMIZED: Minimal language switching + caching
   */
  static getTranslatedNotification(
    type: NotificationData['type'], 
    data: NotificationData, 
    userLanguage: string = 'en'
  ): { title: string; body: string } {
    
    // 🚨 SAFETY CHECK: Ensure userLanguage is supported
    const supportedLanguages = ['en', 'sq'];
    if (!supportedLanguages.includes(userLanguage)) {
      console.log(`🌐 [TRANSLATION_DEBUG] Unsupported language ${userLanguage}, using English fallback`);
      userLanguage = 'en';
    }
    
    // 🚀 OPTIMIZATION: Cache key for translation
    const cacheKey = `${type}_${userLanguage}_${JSON.stringify(data)}`;
    
    // Check cache first
    if (this.translationCache[cacheKey]) {
      return this.translationCache[cacheKey];
    }
    
    // 🚀 OPTIMIZATION: Only switch language if absolutely necessary
    const currentLang = i18n.language;
    const needsLanguageSwitch = currentLang !== userLanguage;
    
    console.log(`🌐 [TRANSLATION_DEBUG] Translating ${type} notification for language: ${userLanguage} (current: ${currentLang}, switch needed: ${needsLanguageSwitch})`);
    
    
    if (needsLanguageSwitch) {
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
          const creditMessage = data.creditRestored ? ` ${i18n.t('notifications.classCreditRestored')}` : '';
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
          
        case 'student_joined_class':
          title = i18n.t('notifications.studentJoinedClassTitle');
          body = i18n.t('notifications.studentJoinedClassBody', {
            studentName: data.studentName,
            className: data.className,
            date: data.date,
            time: data.time
          });
          break;
          
        case 'student_cancelled_booking':
          title = i18n.t('notifications.studentCancelledBookingTitle');
          body = i18n.t('notifications.studentCancelledBookingBody', {
            studentName: data.studentName,
            className: data.className,
            date: data.date,
            time: data.time
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
      // 🚀 OPTIMIZATION: Restore original language to minimize switching
      if (needsLanguageSwitch) {
        i18n.changeLanguage(currentLang);
      }
    }
    
    // 🚀 OPTIMIZATION: Cache the result
    const result = { title, body };
    this.translationCache[cacheKey] = result;
    
    return result;
  }
  
  /**
   * Get user's preferred language from their database profile
   * 🚀 OPTIMIZED: Caching to avoid repeated DB calls
   */
  static async getUserLanguage(userId: string): Promise<string> {
    const now = Date.now();
    
    // 🚀 OPTIMIZATION: Check cache first
    const cached = this.userLanguageCache[userId];
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`🌐 [LANG_DEBUG] Using cached language for user ${userId}: ${cached.language}`);
      return cached.language;
    }
    
    try {
      // First try to get from database (for server-side)
      const { supabase } = await import('../config/supabase.config');
      const { data: user, error } = await supabase
        .from('users')
        .select('language_preference')
        .eq('id', userId)
        .single();
      
      let userLanguage = 'en'; // default
      
      if (!error && user?.language_preference) {
        userLanguage = user.language_preference;
        console.log(`🌐 [LANG_DEBUG] Got language from database for user ${userId}: ${userLanguage}`);
      } else {
        console.log(`🌐 [LANG_DEBUG] Database lookup failed for user ${userId}, error:`, error);
        // 🚨 CRITICAL FIX: Never use AsyncStorage fallback for other users' notifications
        // AsyncStorage contains the current app user's language (e.g., reception staff), 
        // NOT the target notification recipient's language preference
        userLanguage = 'en'; // Always fallback to English if database lookup fails
        console.log(`🌐 [LANG_DEBUG] Using English fallback for user ${userId} - no AsyncStorage fallback to avoid using wrong user's language`);
      }
      
      // 🚨 ADDITIONAL SAFETY CHECK: Ensure language is supported
      const supportedLanguages = ['en', 'sq'];
      if (!supportedLanguages.includes(userLanguage)) {
        console.log(`🌐 [LANG_DEBUG] Unsupported language ${userLanguage} for user ${userId}, fallback to English`);
        userLanguage = 'en';
      }
      
      // 🚀 OPTIMIZATION: Cache the result
      this.userLanguageCache[userId] = {
        language: userLanguage,
        timestamp: now
      };
      
      console.log(`🌐 [LANG_DEBUG] Final language for user ${userId}: ${userLanguage}`);
      return userLanguage;
    } catch (error) {
      console.error('Error getting user language:', error);
      console.log(`🌐 [LANG_DEBUG] Exception fallback to English for user ${userId}`);
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
      // Using current UI language instead of DB
      userLanguage = currentLang;
    }
    
    // Creating translated notification - removed noisy logs
    
    // Get translated content
    const { title, body } = this.getTranslatedNotification(type, data, userLanguage);
    // Generated notification content
    
    return {
      title,
      body,
      userLanguage
    };
  }
  
  /**
   * 🚀 OPTIMIZATION: Cache management methods
   */
  static clearCache(): void {
    this.userLanguageCache = {};
    this.translationCache = {};
  }
  
  static clearUserLanguageCache(userId?: string): void {
    if (userId) {
      delete this.userLanguageCache[userId];
      console.log(`🌐 [LANG_DEBUG] Cleared language cache for user ${userId}`);
    } else {
      this.userLanguageCache = {};
      console.log(`🌐 [LANG_DEBUG] Cleared all language cache`);
    }
  }
  
  /**
   * 🚨 DEBUGGING METHOD: Force refresh user language from database
   * This bypasses cache and forces a fresh database lookup
   */
  static async refreshUserLanguage(userId: string): Promise<string> {
    // Clear cache for this user first
    this.clearUserLanguageCache(userId);
    
    // Force fresh lookup
    return await this.getUserLanguage(userId);
  }
  
  /**
   * 🔧 DEBUGGING/ADMIN METHOD: Check and fix user language preference
   * This helps identify sync issues between UI and database
   */
  static async debugUserLanguage(userId: string): Promise<{ 
    databaseLanguage: string | null, 
    recommendedAction: string,
    fixed?: boolean 
  }> {
    try {
      console.log(`🔍 [LANG_DEBUG] Checking language preference for user ${userId}`);
      
      const { supabase } = await import('../config/supabase.config');
      const { data: user, error } = await supabase
        .from('users')
        .select('language_preference, name, email')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error(`❌ [LANG_DEBUG] Database error for user ${userId}:`, error);
        return {
          databaseLanguage: null,
          recommendedAction: `Database error: ${error.message}`
        };
      }
      
      const databaseLang = user?.language_preference;
      console.log(`🔍 [LANG_DEBUG] User ${user?.name || user?.email || userId} has database language: ${databaseLang}`);
      
      // Clear cache to force fresh lookup
      this.clearUserLanguageCache(userId);
      
      return {
        databaseLanguage: databaseLang,
        recommendedAction: databaseLang === 'sq' 
          ? `User has Albanian (sq) in database. If they want English, update their language preference in the app.`
          : `User has ${databaseLang || 'null'} in database. This looks correct for English users.`
      };
      
    } catch (error) {
      console.error(`❌ [LANG_DEBUG] Exception checking user language:`, error);
      return {
        databaseLanguage: null,
        recommendedAction: `Exception: ${error}`
      };
    }
  }
  
  /**
   * 🔧 ADMIN METHOD: Force update user language preference
   * Use this to fix sync issues between UI and database
   */
  static async forceUpdateUserLanguage(userId: string, newLanguage: 'en' | 'sq'): Promise<{ success: boolean, message: string }> {
    try {
      console.log(`🔧 [LANG_FIX] Force updating user ${userId} language to ${newLanguage}`);
      
      const { supabase } = await import('../config/supabase.config');
      const { data, error } = await supabase
        .from('users')
        .update({ language_preference: newLanguage })
        .eq('id', userId)
        .select('name, email')
        .single();
      
      if (error) {
        console.error(`❌ [LANG_FIX] Failed to update language for user ${userId}:`, error);
        return {
          success: false,
          message: `Database error: ${error.message}`
        };
      }
      
      // Clear cache to ensure fresh lookup
      this.clearUserLanguageCache(userId);
      
      const userName = data?.name || data?.email || userId;
      console.log(`✅ [LANG_FIX] Successfully updated ${userName} language to ${newLanguage}`);
      
      return {
        success: true,
        message: `Successfully updated ${userName} language preference to ${newLanguage}`
      };
      
    } catch (error) {
      console.error(`❌ [LANG_FIX] Exception updating user language:`, error);
      return {
        success: false,
        message: `Exception: ${error}`
      };
    }
  }
  
  /**
   * 🚀 OPTIMIZATION: Batch translation for multiple notifications
   */
  static async batchTranslateNotifications(
    notifications: Array<{
      userId: string;
      type: NotificationData['type'];
      data: NotificationData;
    }>
  ): Promise<Array<{ title: string; body: string; userLanguage: string }>> {
    
    // Group by userId to minimize language lookups
    const userGroups = new Map<string, typeof notifications>();
    notifications.forEach(notif => {
      if (!userGroups.has(notif.userId)) {
        userGroups.set(notif.userId, []);
      }
      userGroups.get(notif.userId)!.push(notif);
    });
    
    const results: Array<{ title: string; body: string; userLanguage: string }> = [];
    
    // Process each user group in parallel
    const userPromises = Array.from(userGroups.entries()).map(async ([userId, userNotifications]) => {
      const userLanguage = await this.getUserLanguage(userId);
      
      return userNotifications.map(notif => {
        const { title, body } = this.getTranslatedNotification(notif.type, notif.data, userLanguage);
        return { title, body, userLanguage };
      });
    });
    
    const userResults = await Promise.all(userPromises);
    return userResults.flat();
  }
}

export default NotificationTranslationService;
