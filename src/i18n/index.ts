import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import en from './en.json';
import sq from './sq.json';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Define supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip' }
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

// 🚨 SYNC FUNCTION: Ensure AsyncStorage and database language preferences match
const syncLanguageWithDatabase = async (asyncStorageLanguage: string) => {
  try {
    const { supabase } = await import('../config/supabase.config');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return; // Not logged in, skip sync
    
    // Get current database language preference
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('language_preference')
      .eq('id', user.id)
      .single();
    
    if (error || !dbUser) return; // Database error, skip sync
    
    const databaseLanguage = dbUser.language_preference;
    
    // If they don't match, update database to match AsyncStorage (UI preference)
    if (databaseLanguage !== asyncStorageLanguage) {
      console.log(`🔄 [LANG_SYNC] Detected mismatch: UI=${asyncStorageLanguage}, DB=${databaseLanguage}`);
      console.log(`🔄 [LANG_SYNC] Updating database to match UI preference: ${asyncStorageLanguage}`);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ language_preference: asyncStorageLanguage })
        .eq('id', user.id);
      
      if (!updateError) {
        // Clear notification cache to use updated language
        try {
          const { NotificationTranslationService } = await import('../services/notificationTranslationService');
          NotificationTranslationService.clearUserLanguageCache(user.id);
          console.log(`✅ [LANG_SYNC] Synchronized language preference to ${asyncStorageLanguage}`);
        } catch (cacheError) {
          // Silent cache error
        }
      } else {
        console.error(`❌ [LANG_SYNC] Failed to update database:`, updateError);
      }
    }
  } catch (error) {
    // Silent sync error - don't disrupt app functionality
    console.log(`🔄 [LANG_SYNC] Sync error (ignored):`, error);
  }
};

// Language detection function
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      // Try to get saved language from AsyncStorage
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) {
        
        // 🚨 SYNC CHECK: Ensure database and AsyncStorage are synchronized
        // This prevents notifications using wrong language
        setTimeout(async () => {
          try {
            await syncLanguageWithDatabase(savedLanguage);
          } catch (syncError) {
            // Silent sync error
          }
        }, 1000); // Small delay to not block app startup
        
        callback(savedLanguage);
        return;
      }
      
      // Default to English if no saved language
      callback('en');
    } catch (error) {
      console.log('Error detecting language:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    } catch (error) {
      // Silent error handling
    }
  }
};

// Initialize i18n
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sq: { translation: sq }
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false // React already does escaping
    },
    react: {
      useSuspense: false // Important for React Native
    }
  });

// Helper function to change language
export const changeLanguage = async (languageCode: SupportedLanguage) => {
  try {
    console.log('Changing language to:', languageCode);
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
    
    // Also save to user profile for server-side notifications
    try {
      const { supabase } = await import('../config/supabase.config');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ language_preference: languageCode })
          .eq('id', user.id);
        
        if (!updateError) {
          // 🚨 CRITICAL: Clear notification language cache when user changes language
          // This ensures notifications will use the new language immediately
          try {
            const { NotificationTranslationService } = await import('../services/notificationTranslationService');
            NotificationTranslationService.clearUserLanguageCache(user.id);
            console.log(`🌐 [LANG_CHANGE] Cleared notification cache for user ${user.id} after language change to ${languageCode}`);
          } catch (cacheError) {
            // Silent cache clear error
          }
        }
      }
    } catch (dbError) {
      // Silent error handling
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function to get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  const currentLang = i18n.language as SupportedLanguage;
  return currentLang;
};

// Helper function to get language name
export const getLanguageName = (code: SupportedLanguage): string => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language?.nativeName || language?.name || code;
};

export default i18n;
