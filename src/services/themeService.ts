import { supabase } from '../config/supabase.config';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  [key: string]: string; // Allow additional color properties
}

export interface Theme {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  colors: ThemeColors;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateThemeData {
  name: string;
  display_name: string;
  description?: string;
  colors: ThemeColors;
  start_date?: string;
  end_date?: string;
}

export interface UpdateThemeData {
  display_name?: string;
  description?: string;
  is_active?: boolean;
  colors?: ThemeColors;
  start_date?: string;
  end_date?: string;
}

class ThemeService {
  // Get all available themes
  async getAllThemes(): Promise<Theme[]> {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Handle 406 errors gracefully
        if (error.code === '406' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.log('Theme access restricted, returning empty themes list');
          return [];
        }
        console.error('Error fetching themes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.log('Theme service unavailable, returning empty themes list');
      return [];
    }
  }

  // Get currently active theme
  async getActiveTheme(): Promise<Theme | null> {
    try {
      // First, let's see all themes to debug
      const { data: allThemes, error: allError } = await supabase
        .from('themes')
        .select('id, name, display_name, is_active');
      
      // Check user authentication
      const { data: { user } } = await supabase.auth.getUser();
      
      // Try a more specific query for debugging
      if (allError) {
        
        // WORKAROUND: Try to get theme from localStorage cache as fallback
        try {
          const cachedTheme = await this.getCachedTheme();
          if (cachedTheme) {
            return cachedTheme;
          }
        } catch (cacheError) {
        }
        
        return null;
      }
      
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        // Handle specific error types
        if (error.code === 'PGRST116') {
          // No active theme found - this is normal
          return null;
        } else if (error.code === '406' || error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          // HTTP 406 - RLS policy issue, use default theme
          return null;
        }
        return null;
      }

      
      // Cache the theme for future access
      if (data) {
        await this.cacheTheme(data);
      }
      
      return data;
    } catch (error) {
      // Handle network errors or other exceptions
      return null;
    }
  }

  // Switch to a different theme
  async switchTheme(themeName: string): Promise<Theme> {
    try {
      console.log('🔄 ThemeService: Switching theme to:', themeName);
      console.log('🔄 ThemeService: Cache refresh test');
      
      // First, deactivate all themes
      console.log('🔄 ThemeService: Deactivating all themes first...');
      const { error: deactivateError } = await supabase
        .from('themes')
        .update({ is_active: false })
        .neq('name', '');

      if (deactivateError) {
        console.error('Error deactivating themes:', deactivateError);
        throw deactivateError;
      }

      // Then activate the selected theme
      console.log('🎨 ThemeService: Activating theme:', themeName);
      console.log('🎨 ThemeService: Looking for theme with name:', themeName);
      
      const { data, error } = await supabase
        .from('themes')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('name', themeName)
        .select()
        .single();

      if (error) {
        console.error('❌ ThemeService: Error activating theme:', error);
        console.error('❌ ThemeService: Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ ThemeService: Theme activated successfully:', data?.name);
      console.log('✅ ThemeService: Theme data:', data);
      
      // Cache the theme for client access
      await this.cacheTheme(data);
      
      return data;
    } catch (error) {
      console.error('Error in switchTheme:', error);
      throw error;
    }
  }

  // Deactivate all themes (sets default theme)
  async deactivateAllThemes(): Promise<void> {
    try {
      console.log('🔄 ThemeService: Deactivating all themes...');
      const { error } = await supabase
        .from('themes')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all rows

      if (error) {
        console.error('Error deactivating themes:', error);
        throw error;
      }

      console.log('✅ ThemeService: All themes deactivated successfully');
    } catch (error) {
      console.error('Error in deactivateAllThemes:', error);
      throw error;
    }
  }

  // Create new theme
  async createTheme(themeData: CreateThemeData): Promise<Theme> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('themes')
        .insert({
          ...themeData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating theme:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createTheme:', error);
      throw error;
    }
  }

  // Update theme
  async updateTheme(id: string, updates: UpdateThemeData): Promise<Theme> {
    try {
      const { data, error } = await supabase
        .from('themes')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating theme:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateTheme:', error);
      throw error;
    }
  }

  // Delete theme
  async deleteTheme(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('themes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting theme:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteTheme:', error);
      throw error;
    }
  }

  // Get theme by name
  async getThemeByName(name: string): Promise<Theme | null> {
    try {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('name', name)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Theme not found
        }
        console.error('Error fetching theme by name:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getThemeByName:', error);
      return null;
    }
  }

  // Check if user can manage themes
  async canManageThemes(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !data) return false;

      return ['reception', 'admin'].includes(data.role);
    } catch (error) {
      console.error('Error checking theme permissions:', error);
      return false;
    }
  }

  // Cache theme locally to work around RLS restrictions
  async cacheTheme(theme: Theme): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('cached_active_theme', JSON.stringify({
          ...theme,
          cached_at: new Date().toISOString()
        }));
        console.log('💾 [cacheTheme] Theme cached locally:', theme.name);
      }
    } catch (error) {
      console.log('💾 [cacheTheme] Failed to cache theme:', error);
    }
  }

  // Get cached theme as fallback when RLS blocks access
  async getCachedTheme(): Promise<Theme | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = localStorage.getItem('cached_active_theme');
        if (cached) {
          const theme = JSON.parse(cached);
          const cachedAt = new Date(theme.cached_at);
          const now = new Date();
          const hoursSinceCached = (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);
          
          // Use cached theme if it's less than 24 hours old
          if (hoursSinceCached < 24) {
            console.log('💾 [getCachedTheme] Using cached theme:', theme.name);
            return theme;
          } else {
            console.log('💾 [getCachedTheme] Cached theme is too old, clearing cache');
            localStorage.removeItem('cached_active_theme');
          }
        }
      }
      return null;
    } catch (error) {
      console.log('💾 [getCachedTheme] Failed to get cached theme:', error);
      return null;
    }
  }

  // Get default theme colors (fallback)
  getDefaultColors(): ThemeColors {
    return {
      primary: '#6B8E7F',
      secondary: '#FFFFFF',
      accent: '#6B8E7F',
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#2C2C2C',
      textSecondary: '#666666',
      border: '#E8E6E3',
    };
  }

  // Apply theme colors to the current Colors object
  applyThemeColors(colors: ThemeColors) {
    // This would be used to dynamically update the Colors object
    // You can extend this based on how you want to implement dynamic theming
    return {
      ...colors,
      // Add any additional mappings needed
    };
  }
}

export const themeService = new ThemeService();