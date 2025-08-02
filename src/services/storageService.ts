import { Platform } from 'react-native';

interface StorageInterface {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class StorageService implements StorageInterface {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web platform - use localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } else {
        // React Native - use AsyncStorage
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem(key, value);
        } catch (error) {
          // Fallback if AsyncStorage is not available
          console.warn('AsyncStorage not available, using memory storage');
          this.memoryStorage[key] = value;
        }
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      // Fallback to memory storage
      this.memoryStorage[key] = value;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Web platform - use localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } else {
        // React Native - use AsyncStorage
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          return await AsyncStorage.getItem(key);
        } catch (error) {
          // Fallback if AsyncStorage is not available
          console.warn('AsyncStorage not available, using memory storage');
          return this.memoryStorage[key] || null;
        }
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      // Fallback to memory storage
      return this.memoryStorage[key] || null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web platform - use localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } else {
        // React Native - use AsyncStorage
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.removeItem(key);
        } catch (error) {
          // Fallback if AsyncStorage is not available
          console.warn('AsyncStorage not available, using memory storage');
          delete this.memoryStorage[key];
        }
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      // Fallback to memory storage
      delete this.memoryStorage[key];
    }
  }

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web platform - use localStorage
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
        }
      } else {
        // React Native - use AsyncStorage
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.clear();
        } catch (error) {
          // Fallback if AsyncStorage is not available
          console.warn('AsyncStorage not available, using memory storage');
          this.memoryStorage = {};
        }
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      // Fallback to memory storage
      this.memoryStorage = {};
    }
  }

  // Memory storage fallback for when other storage methods fail
  private memoryStorage: { [key: string]: string } = {};

  // Utility methods for common storage patterns
  async setObject(key: string, value: any): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage setObject error:', error);
      throw error;
    }
  }

  async getObject<T>(key: string): Promise<T | null> {
    try {
      const value = await this.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Storage getObject error:', error);
      return null;
    }
  }

  // Check if storage is available
  isAvailable(): boolean {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && !!window.localStorage;
    } else {
      try {
        require('@react-native-async-storage/async-storage');
        return true;
      } catch {
        return false;
      }
    }
  }

  // Get storage type being used
  getStorageType(): 'localStorage' | 'asyncStorage' | 'memory' {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return 'localStorage';
    } else if (Platform.OS !== 'web') {
      try {
        require('@react-native-async-storage/async-storage');
        return 'asyncStorage';
      } catch {
        return 'memory';
      }
    }
    return 'memory';
  }
}

export const storageService = new StorageService(); 