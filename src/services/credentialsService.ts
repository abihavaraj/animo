import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CREDENTIALS_KEY = 'user_credentials';
const SAVE_PREFERENCE_KEY = 'save_password_preference';
const CURRENT_SESSION_KEY = 'current_session_credentials';

export interface SavedCredentials {
  emailOrPhone: string;
  password: string;
}

export interface CredentialsService {
  saveCredentials: (credentials: SavedCredentials) => Promise<void>;
  loadCredentials: () => Promise<SavedCredentials | null>;
  clearCredentials: () => Promise<void>;
  getSavePasswordPreference: () => Promise<boolean>;
  setSavePasswordPreference: (shouldSave: boolean) => Promise<void>;
  saveCurrentSessionCredentials: (credentials: SavedCredentials) => Promise<void>;
  getCurrentSessionCredentials: () => Promise<SavedCredentials | null>;
  clearCurrentSessionCredentials: () => Promise<void>;
}

class CredentialsServiceImpl implements CredentialsService {
  /**
   * Save user credentials securely using iOS Keychain or Android Keystore
   */
  async saveCredentials(credentials: SavedCredentials): Promise<void> {
    try {
      const credentialsJson = JSON.stringify(credentials);
      
      if (Platform.OS === 'web') {
        // For web, use localStorage as secure storage is not available
        localStorage.setItem(CREDENTIALS_KEY, credentialsJson);
      } else {
        // For native platforms, use secure store
        await SecureStore.setItemAsync(CREDENTIALS_KEY, credentialsJson);
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw new Error('Failed to save credentials securely');
    }
  }

  /**
   * Load saved user credentials
   */
  async loadCredentials(): Promise<SavedCredentials | null> {
    try {
      let credentialsJson: string | null = null;
      
      if (Platform.OS === 'web') {
        credentialsJson = localStorage.getItem(CREDENTIALS_KEY);
      } else {
        credentialsJson = await SecureStore.getItemAsync(CREDENTIALS_KEY);
      }
      
      if (!credentialsJson) {
        return null;
      }
      
      return JSON.parse(credentialsJson) as SavedCredentials;
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return null;
    }
  }

  /**
   * Clear saved credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(CREDENTIALS_KEY);
      } else {
        await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
      }
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      // Don't throw error for clearing, as it might not exist
    }
  }

  /**
   * Get user's preference for saving passwords
   */
  async getSavePasswordPreference(): Promise<boolean> {
    try {
      let preference: string | null = null;
      
      if (Platform.OS === 'web') {
        preference = localStorage.getItem(SAVE_PREFERENCE_KEY);
      } else {
        preference = await SecureStore.getItemAsync(SAVE_PREFERENCE_KEY);
      }
      
      return preference === 'true';
    } catch (error) {
      console.error('Failed to get save password preference:', error);
      return false;
    }
  }

  /**
   * Set user's preference for saving passwords
   */
  async setSavePasswordPreference(shouldSave: boolean): Promise<void> {
    try {
      const preferenceValue = shouldSave.toString();
      
      if (Platform.OS === 'web') {
        localStorage.setItem(SAVE_PREFERENCE_KEY, preferenceValue);
      } else {
        await SecureStore.setItemAsync(SAVE_PREFERENCE_KEY, preferenceValue);
      }
    } catch (error) {
      console.error('Failed to set save password preference:', error);
      throw new Error('Failed to save password preference');
    }
  }

  /**
   * Save current session credentials temporarily (for logout saving)
   */
  async saveCurrentSessionCredentials(credentials: SavedCredentials): Promise<void> {
    try {
      const credentialsJson = JSON.stringify(credentials);
      
      if (Platform.OS === 'web') {
        sessionStorage.setItem(CURRENT_SESSION_KEY, credentialsJson);
      } else {
        await SecureStore.setItemAsync(CURRENT_SESSION_KEY, credentialsJson);
      }
    } catch (error) {
      console.error('Failed to save current session credentials:', error);
      throw new Error('Failed to save session credentials');
    }
  }

  /**
   * Get current session credentials
   */
  async getCurrentSessionCredentials(): Promise<SavedCredentials | null> {
    try {
      let credentialsJson: string | null = null;
      
      if (Platform.OS === 'web') {
        credentialsJson = sessionStorage.getItem(CURRENT_SESSION_KEY);
      } else {
        credentialsJson = await SecureStore.getItemAsync(CURRENT_SESSION_KEY);
      }
      
      if (!credentialsJson) {
        return null;
      }
      
      return JSON.parse(credentialsJson) as SavedCredentials;
    } catch (error) {
      console.error('Failed to get current session credentials:', error);
      return null;
    }
  }

  /**
   * Clear current session credentials
   */
  async clearCurrentSessionCredentials(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        sessionStorage.removeItem(CURRENT_SESSION_KEY);
      } else {
        await SecureStore.deleteItemAsync(CURRENT_SESSION_KEY);
      }
    } catch (error) {
      console.error('Failed to clear current session credentials:', error);
      // Don't throw error for clearing, as it might not exist
    }
  }
}

export const credentialsService = new CredentialsServiceImpl();
