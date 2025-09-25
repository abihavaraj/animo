import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { configureFonts, DefaultTheme } from 'react-native-paper';
import { useColorScheme } from '../../hooks/useColorScheme';
import { supabase } from '../config/supabase.config';
import { Colors } from '../constants/Colors';
import { Theme, ThemeColors, themeService } from '../services/themeService';

interface ThemeContextType {
  currentTheme: Theme | null;
  themeColors: ThemeColors;
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
  paperTheme: any; // React Native Paper theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [currentTheme, setCurrentTheme] = useState<Theme | null>(null);
  const [themeColors, setThemeColors] = useState<ThemeColors>(getDefaultThemeColors(systemColorScheme));
  const [isLoading, setIsLoading] = useState(true);
  const [paperTheme, setPaperTheme] = useState({
    ...DefaultTheme,
    fonts: configureFonts({ config: {} }),
  });

  // Get default theme colors from the Colors constant
  function getDefaultThemeColors(colorScheme: 'light' | 'dark' = 'light'): ThemeColors {
    const colors = Colors[colorScheme];
    return {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      textSecondary: colors.textSecondary,
      border: colors.border,
      // Map additional colors needed by the theme service
      textMuted: colors.textMuted,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
      divider: colors.divider,
      tint: colors.tint,
      icon: colors.icon,
      actionPrimary: colors.actionPrimary,
      actionSecondary: colors.actionSecondary,
      surfaceElevated: colors.surfaceElevated,
      surfaceVariant: colors.surfaceVariant,
      textOnAccent: colors.textOnAccent,
      tabIconDefault: colors.tabIconDefault,
      tabIconSelected: colors.tabIconSelected,
    };
  }

  const loadActiveTheme = async () => {
    try {
      setIsLoading(true);
      
      const activeTheme = await themeService.getActiveTheme();
      
      
      if (activeTheme) {
        setCurrentTheme(activeTheme);
        
        // Check if it's a Christmas theme and force dark mode for better visibility
        const isChristmasTheme = activeTheme && (
          activeTheme.name?.toLowerCase().includes('christmas') ||
          activeTheme.display_name?.toLowerCase().includes('christmas') ||
          activeTheme.display_name?.includes('🎄')
        );
        
        
        
        // Check if it's an Eid Mubarak theme
        const isEidMubarakTheme = activeTheme && (
          activeTheme.name?.toLowerCase().includes('eid') ||
          activeTheme.display_name?.toLowerCase().includes('eid') ||
          activeTheme.display_name?.includes('🕌') ||
          activeTheme.display_name?.includes('Eid')
        );
        
        // Check if it's a New Year theme
        const isNewYearTheme = activeTheme && (
          activeTheme.name?.toLowerCase().includes('new_year') ||
          activeTheme.display_name?.toLowerCase().includes('new year') ||
          activeTheme.display_name?.includes('🎊') ||
          activeTheme.display_name?.includes('New Year')
        );
        
        // Check if it's a Pink October theme
        const isPinkOctoberTheme = activeTheme && (
          activeTheme.name?.toLowerCase().includes('pink_october') ||
          activeTheme.display_name?.toLowerCase().includes('pink october') ||
          activeTheme.display_name?.includes('🌸') ||
          activeTheme.display_name?.includes('Pink October')
        );
        
        // Force dark mode for Christmas and New Year themes to make effects visible
        const effectiveColorScheme = (isChristmasTheme || isNewYearTheme) ? 'dark' : systemColorScheme;
        
        // For "default" theme, use the theme colors directly; for others, merge with system defaults
        let mergedColors: ThemeColors;
        
        if (activeTheme.name === 'default') {
          // For default theme, use system colors directly (don't override with database colors)
          const defaultColors = getDefaultThemeColors(systemColorScheme);
          
          
          mergedColors = defaultColors;
          
        } else {
          // For other themes, merge with system defaults
          const defaultColors = getDefaultThemeColors(effectiveColorScheme);
          const themeColors = activeTheme?.colors || {};
          
          
          mergedColors = {
            // Start with default colors (force dark for Christmas themes)
            ...defaultColors,
            // Override with theme-specific colors (only if theme exists)
            ...themeColors,
          };
        }
        
        
        // For Christmas themes (but NOT default theme), force dark backgrounds regardless of theme colors
        if (isChristmasTheme && activeTheme.name !== 'default') {
          
          // Override backgrounds to dark colors for snow visibility
          const darkColors = getDefaultThemeColors('dark');
          mergedColors.background = darkColors.background;
          mergedColors.surface = darkColors.surface;
          mergedColors.surfaceElevated = darkColors.surfaceElevated;
          mergedColors.surfaceVariant = darkColors.surfaceVariant;
          
          // Ensure text colors are light for dark backgrounds
          mergedColors.text = darkColors.text;
          mergedColors.textSecondary = darkColors.textSecondary;
          mergedColors.textMuted = darkColors.textMuted;
          
        }
        
        // For New Year themes (but NOT default theme), force dark backgrounds for winter wonderland effect
        if (isNewYearTheme && activeTheme.name !== 'default') {
          
          // Override backgrounds to dark colors for snow and stars visibility
          const darkColors = getDefaultThemeColors('dark');
          mergedColors.background = darkColors.background;
          mergedColors.surface = darkColors.surface;
          mergedColors.surfaceElevated = darkColors.surfaceElevated;
          mergedColors.surfaceVariant = darkColors.surfaceVariant;
          
          // Ensure text colors are light for dark backgrounds
          mergedColors.text = darkColors.text;
          mergedColors.textSecondary = darkColors.textSecondary;
          mergedColors.textMuted = darkColors.textMuted;
          
          // Apply Christmas-like colors for New Year (white, red, green like Christmas)
          mergedColors.primary = '#FFFFFF'; // White like Christmas
          mergedColors.accent = '#FF6B6B'; // Red like Christmas
          mergedColors.success = '#4CAF50'; // Green like Christmas
          mergedColors.secondary = '#F5F5F5'; // Light gray
          mergedColors.border = '#FFFFFF'; // White borders
          mergedColors.textOnAccent = '#1a1a1a'; // Dark text on light accents
          
        }
        
        // For Pink October themes, apply awareness colors
        if (isPinkOctoberTheme && activeTheme.name !== 'default') {
          // Apply Pink October specific colors
          mergedColors.primary = '#E91E63'; // Pink 500
          mergedColors.accent = '#C2185B'; // Pink 700
          mergedColors.secondary = '#F8BBD9'; // Light pink
          mergedColors.background = '#FCE4EC'; // Pink 50
          mergedColors.surface = '#FFFFFF'; // White
          mergedColors.text = '#1A1A1A'; // Dark text
          mergedColors.textSecondary = '#E91E63'; // Pink secondary
          mergedColors.border = '#E91E63'; // Pink borders
          mergedColors.success = '#4CAF50'; // Green for success
        }
        
        // For Eid Mubarak themes, enhance colors for better festive appearance
        if (isEidMubarakTheme && activeTheme.name !== 'default') {
          // Enhance the theme colors for better festive appearance
          // Keep the original theme colors but ensure good contrast
        }
        
             setThemeColors(mergedColors);
             
             // Update Paper theme with merged colors
             setPaperTheme({
               ...DefaultTheme,
               fonts: configureFonts({ config: {} }),
               colors: {
                 ...DefaultTheme.colors,
                 primary: mergedColors.primary,
                 background: mergedColors.background,
                 surface: mergedColors.surface,
                 onSurface: mergedColors.text,
                 onBackground: mergedColors.text,
               }
             });
      } else {
        // No active theme, use system-aware defaults
        setCurrentTheme(null);
        const defaultColors = getDefaultThemeColors(systemColorScheme);
        setThemeColors(defaultColors);
        
        // Update Paper theme with default colors
        setPaperTheme({
          ...DefaultTheme,
          fonts: configureFonts({ config: {} }),
          colors: {
            ...DefaultTheme.colors,
            primary: defaultColors.primary,
            background: defaultColors.background,
            surface: defaultColors.surface,
            onSurface: defaultColors.text,
            onBackground: defaultColors.text,
          }
        });
      }
    } catch (error) {
      console.error('Error loading active theme:', error);
      // Fallback to system-aware default theme
      setCurrentTheme(null);
      const fallbackColors = getDefaultThemeColors(systemColorScheme);
      setThemeColors(fallbackColors);
      
      // Update Paper theme with fallback colors
      setPaperTheme({
        ...DefaultTheme,
        fonts: configureFonts({ config: {} }),
        colors: {
          ...DefaultTheme.colors,
          primary: fallbackColors.primary,
          background: fallbackColors.background,
          surface: fallbackColors.surface,
          onSurface: fallbackColors.text,
          onBackground: fallbackColors.text,
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTheme = async () => {
    await loadActiveTheme();
  };

  useEffect(() => {
    loadActiveTheme();
    
    // Set up real-time subscription to detect theme changes
    const channel = supabase
      .channel('theme-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'themes'
        },
        (payload) => {
          console.log('🎨 Theme change detected from database:', payload);
          // Refresh theme when any theme changes occur
          loadActiveTheme();
        }
      )
      .subscribe();
    
    // Theme realtime subscription established
    
    // Cleanup function
    return () => {
      // Cleaning up theme realtime subscription
      supabase.removeChannel(channel);
    };
  }, []);

  // Update theme colors when system color scheme changes
  useEffect(() => {
    if (!currentTheme) {
      // Only update if we're using the default theme (no custom theme active)
      setThemeColors(getDefaultThemeColors(systemColorScheme));
    }
  }, [systemColorScheme, currentTheme]);

  const value: ThemeContextType = {
    currentTheme,
    themeColors,
    isLoading,
    refreshTheme,
    paperTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};