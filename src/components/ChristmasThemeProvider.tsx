import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ChristmasThemeContextType {
  isChristmasTheme: boolean;
  christmasVariant: 'gold' | 'red' | 'green' | 'snow' | 'celestial';
  forceDarkMode: boolean;
  christmasColors: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    text: string;
    textSecondary: string;
    snow: string;
    lights: string[];
  };
}

const ChristmasThemeContext = createContext<ChristmasThemeContextType | undefined>(undefined);

export const useChristmasTheme = () => {
  const context = useContext(ChristmasThemeContext);
  if (!context) {
    throw new Error('useChristmasTheme must be used within ChristmasThemeProvider');
  }
  return context;
};

interface ChristmasThemeProviderProps {
  children: React.ReactNode;
}

export const ChristmasThemeProvider: React.FC<ChristmasThemeProviderProps> = ({ children }) => {
  const { currentTheme } = useTheme();
  const [forceDarkMode, setForceDarkMode] = useState(false);

  // Check if current theme is a Christmas theme
  const isChristmasTheme = currentTheme && (
    currentTheme.name.includes('christmas') ||
    currentTheme.name.includes('Christmas') ||
    currentTheme.display_name.includes('🎄') ||
    currentTheme.display_name.includes('Christmas') ||
    currentTheme.display_name.includes('christmas')
  );

  // Determine Christmas variant
  const getChristmasVariant = (): 'gold' | 'red' | 'green' | 'snow' | 'celestial' => {
    if (!currentTheme) return 'gold';
    
    if (currentTheme.name.includes('gold') || currentTheme.name.includes('magic')) {
      return 'gold';
    } else if (currentTheme.name.includes('red')) {
      return 'red';
    } else if (currentTheme.name.includes('green') || currentTheme.name.includes('forest')) {
      return 'green';
    } else if (currentTheme.name.includes('snow') || currentTheme.name.includes('winter')) {
      return 'snow';
    } else if (currentTheme.name.includes('celestial') || currentTheme.name.includes('blue')) {
      return 'celestial';
    }
    return 'gold';
  };

  const christmasVariant = getChristmasVariant();

  // Enhanced Christmas color schemes with dark mode support
  const getChristmasColors = () => {
    const darkMode = forceDarkMode || isChristmasTheme;
    
    switch (christmasVariant) {
      case 'gold':
        return darkMode ? {
          background: '#0F1419',
          surface: '#1A1F2E',
          primary: '#FFD700',
          accent: '#D4A574',
          text: '#FFFFFF',
          textSecondary: '#C7C7C7',
          snow: '#E6F3FF',
          lights: ['#FFD700', '#FF6B6B', '#4ECDC4', '#96CEB4', '#FFEAA7']
        } : {
          background: '#1A1F2E',
          surface: '#2A2F3E',
          primary: '#D4A574',
          accent: '#FFD700',
          text: '#FFFFFF',
          textSecondary: '#C7C7C7',
          snow: '#E6F3FF',
          lights: ['#FFD700', '#FF6B6B', '#4ECDC4', '#96CEB4', '#FFEAA7']
        };
        
      case 'red':
        return darkMode ? {
          background: '#1A0F0F',
          surface: '#2E1A1A',
          primary: '#FF4444',
          accent: '#8B0000',
          text: '#FFFFFF',
          textSecondary: '#FFB6B6',
          snow: '#FFE6E6',
          lights: ['#FF6B6B', '#FFD700', '#32CD32', '#87CEEB', '#DDA0DD']
        } : {
          background: '#2E1A1A',
          surface: '#3E2A2A',
          primary: '#8B0000',
          accent: '#FF4444',
          text: '#FFFFFF',
          textSecondary: '#FFB6B6',
          snow: '#FFE6E6',
          lights: ['#FF6B6B', '#FFD700', '#32CD32', '#87CEEB', '#DDA0DD']
        };
        
      case 'green':
        return darkMode ? {
          background: '#0F1A0F',
          surface: '#1A2E1A',
          primary: '#32CD32',
          accent: '#2D5016',
          text: '#FFFFFF',
          textSecondary: '#B6FFB6',
          snow: '#E6FFE6',
          lights: ['#32CD32', '#FFD700', '#FF6B6B', '#87CEEB', '#DDA0DD']
        } : {
          background: '#1A2E1A',
          surface: '#2A3E2A',
          primary: '#2D5016',
          accent: '#32CD32',
          text: '#FFFFFF',
          textSecondary: '#B6FFB6',
          snow: '#E6FFE6',
          lights: ['#32CD32', '#FFD700', '#FF6B6B', '#87CEEB', '#DDA0DD']
        };
        
      case 'celestial':
        return darkMode ? {
          background: '#0A0F1A',
          surface: '#1A1F2E',
          primary: '#87CEEB',
          accent: '#1E3A8A',
          text: '#FFFFFF',
          textSecondary: '#B6E6FF',
          snow: '#F0F8FF',
          lights: ['#87CEEB', '#C0C0C0', '#FFD700', '#DDA0DD', '#98FB98']
        } : {
          background: '#1A1F2E',
          surface: '#2A2F3E',
          primary: '#1E3A8A',
          accent: '#87CEEB',
          text: '#FFFFFF',
          textSecondary: '#B6E6FF',
          snow: '#F0F8FF',
          lights: ['#87CEEB', '#C0C0C0', '#FFD700', '#DDA0DD', '#98FB98']
        };
        
      case 'snow':
        return darkMode ? {
          background: '#0F0F1A',
          surface: '#1F1F2E',
          primary: '#E6F3FF',
          accent: '#87CEEB',
          text: '#FFFFFF',
          textSecondary: '#E6F3FF',
          snow: '#FFFFFF',
          lights: ['#E6F3FF', '#87CEEB', '#C0C0C0', '#B0E0E6', '#F0F8FF']
        } : {
          background: '#1F1F2E',
          surface: '#2F2F3E',
          primary: '#2D5016',
          accent: '#E6F3FF',
          text: '#FFFFFF',
          textSecondary: '#E6F3FF',
          snow: '#FFFFFF',
          lights: ['#E6F3FF', '#87CEEB', '#C0C0C0', '#B0E0E6', '#F0F8FF']
        };
        
      default:
        return {
          background: '#1A1F2E',
          surface: '#2A2F3E',
          primary: '#D4A574',
          accent: '#FFD700',
          text: '#FFFFFF',
          textSecondary: '#C7C7C7',
          snow: '#E6F3FF',
          lights: ['#FFD700', '#FF6B6B', '#4ECDC4', '#96CEB4', '#FFEAA7']
        };
    }
  };

  const christmasColors = getChristmasColors();

  // Force dark mode when Christmas theme is active for better snow visibility
  useEffect(() => {
    if (isChristmasTheme) {
      setForceDarkMode(true);
    } else {
      setForceDarkMode(false);
    }
  }, [isChristmasTheme]);

  const value: ChristmasThemeContextType = {
    isChristmasTheme: !!isChristmasTheme,
    christmasVariant,
    forceDarkMode,
    christmasColors,
  };

  return (
    <ChristmasThemeContext.Provider value={value}>
      {children}
    </ChristmasThemeContext.Provider>
  );
};

export default ChristmasThemeProvider;
