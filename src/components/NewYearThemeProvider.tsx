import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { NewYearThemeColors, NewYearThemeConfig, getActiveNewYearTheme, newYearThemes } from '../services/newYearTheme';

interface NewYearContextType {
  isNewYearTheme: boolean;
  newYearTheme: NewYearThemeConfig | null;
  newYearColors: NewYearThemeColors | null;
  newYearVariant: string;
  isNewYearTime: boolean;
  refreshNewYearTheme: () => void;
}

const NewYearContext = createContext<NewYearContextType | undefined>(undefined);

export const useNewYearTheme = () => {
  const context = useContext(NewYearContext);
  if (!context) {
    throw new Error('useNewYearTheme must be used within a NewYearThemeProvider');
  }
  return context;
};

interface NewYearThemeProviderProps {
  children: React.ReactNode;
}

export const NewYearThemeProvider: React.FC<NewYearThemeProviderProps> = ({ children }) => {
  const { currentTheme } = useTheme();
  const [newYearTheme, setNewYearTheme] = useState<NewYearThemeConfig | null>(null);
  const [newYearColors, setNewYearColors] = useState<NewYearThemeColors | null>(null);
  const [newYearVariant, setNewYearVariant] = useState<string>('default');
  const [isNewYearTime, setIsNewYearTime] = useState<boolean>(false);

  const checkNewYearTime = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    
    // Check if it's around New Year time (December 15 - January 15)
    return (currentMonth === 12 && currentDay >= 15) || 
           (currentMonth === 1 && currentDay <= 15) ||
           currentTheme?.name?.toLowerCase().includes('new_year') ||
           currentTheme?.display_name?.toLowerCase().includes('new year') ||
           currentTheme?.display_name?.includes('🎊') ||
           currentTheme?.display_name?.includes('New Year') || false;
  };

  const loadNewYearTheme = () => {
    try {
      // Check if current theme is a New Year theme
      const isNewYearTheme = currentTheme?.name?.toLowerCase().includes('new_year') ||
                            currentTheme?.display_name?.toLowerCase().includes('new year') ||
                            currentTheme?.display_name?.includes('🎊') ||
                            currentTheme?.display_name?.includes('New Year');
      
      if (isNewYearTheme && currentTheme?.name) {
        // Use the active theme detection
        const activeTheme = getActiveNewYearTheme(currentTheme.name);
        if (activeTheme) {
          setNewYearTheme(activeTheme);
          setNewYearColors(activeTheme.colors);
          setNewYearVariant(activeTheme.name);
          setIsNewYearTime(true);
        } else {
          // Fallback to first theme
          const fallbackTheme = newYearThemes[0];
          setNewYearTheme(fallbackTheme);
          setNewYearColors(fallbackTheme.colors);
          setNewYearVariant(fallbackTheme.name);
          setIsNewYearTime(true);
        }
      } else {
        // Not a New Year theme
        setNewYearTheme(null);
        setNewYearColors(null);
        setNewYearVariant('default');
        setIsNewYearTime(false);
      }
    } catch (error) {
      setNewYearTheme(null);
      setNewYearColors(null);
      setNewYearVariant('default');
      setIsNewYearTime(false);
    }
  };

  useEffect(() => {
    loadNewYearTheme();
  }, [currentTheme]);

  const refreshNewYearTheme = () => {
    loadNewYearTheme();
  };

  const isNewYearTheme = newYearTheme !== null && isNewYearTime;

  const contextValue: NewYearContextType = {
    isNewYearTheme,
    newYearTheme,
    newYearColors,
    newYearVariant,
    isNewYearTime,
    refreshNewYearTheme
  };

  return (
    <NewYearContext.Provider value={contextValue}>
      {children}
    </NewYearContext.Provider>
  );
};

export default NewYearThemeProvider;
