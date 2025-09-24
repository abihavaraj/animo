import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { EidMubarakThemeColors, EidMubarakThemeConfig, eidMubarakThemes, getActiveEidMubarakTheme } from '../services/eidMubarakTheme';

interface EidMubarakContextType {
  isEidMubarakTheme: boolean;
  eidTheme: EidMubarakThemeConfig | null;
  eidColors: EidMubarakThemeColors | null;
  eidVariant: string;
  isEidTime: boolean;
  refreshEidTheme: () => void;
}

const EidMubarakContext = createContext<EidMubarakContextType | undefined>(undefined);

export const useEidMubarakTheme = () => {
  const context = useContext(EidMubarakContext);
  if (!context) {
    throw new Error('useEidMubarakTheme must be used within an EidMubarakThemeProvider');
  }
  return context;
};

interface EidMubarakThemeProviderProps {
  children: React.ReactNode;
}

export const EidMubarakThemeProvider: React.FC<EidMubarakThemeProviderProps> = ({ children }) => {
  const { currentTheme } = useTheme();
  const [eidTheme, setEidTheme] = useState<EidMubarakThemeConfig | null>(null);
  const [eidColors, setEidColors] = useState<EidMubarakThemeColors | null>(null);
  const [eidVariant, setEidVariant] = useState<string>('default');
  const [isEidTime, setIsEidTime] = useState<boolean>(false);

  const checkEidTime = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    
    // Check if it's around Eid or Ramadan time (you can customize this logic)
    // For demo purposes, we'll consider it Islamic time if the theme name contains 'eid' or 'ramadan'
    return currentTheme?.name?.toLowerCase().includes('eid') || 
           currentTheme?.name?.toLowerCase().includes('ramadan') ||
           currentTheme?.display_name?.toLowerCase().includes('eid') ||
           currentTheme?.display_name?.toLowerCase().includes('ramadan') ||
           currentTheme?.display_name?.includes('🕌') ||
           currentTheme?.display_name?.includes('🌙') ||
           currentTheme?.display_name?.includes('Eid') ||
           currentTheme?.display_name?.includes('Ramadan') || false;
  };

  const loadEidTheme = () => {
    try {
      // Check if current theme is an Eid or Ramadan theme using the better detection logic
      const isEidTheme = currentTheme?.name?.toLowerCase().includes('eid') || 
                        currentTheme?.name?.toLowerCase().includes('ramadan') ||
                        currentTheme?.display_name?.toLowerCase().includes('eid') ||
                        currentTheme?.display_name?.toLowerCase().includes('ramadan') ||
                        currentTheme?.display_name?.includes('🕌') ||
                        currentTheme?.display_name?.includes('🌙') ||
                        currentTheme?.display_name?.includes('Eid') ||
                        currentTheme?.display_name?.includes('Ramadan');
      
      if (isEidTheme && currentTheme?.name) {
        // Use the active theme detection which has better logic
        const activeTheme = getActiveEidMubarakTheme(currentTheme.name);
        if (activeTheme) {
          setEidTheme(activeTheme);
          setEidColors(activeTheme.colors);
          setEidVariant(activeTheme.name);
          setIsEidTime(true);
        } else {
          // Fallback to first theme or create a theme from database
          const fallbackTheme = eidMubarakThemes[0];
          setEidTheme(fallbackTheme);
          setEidColors(fallbackTheme.colors);
          setEidVariant(fallbackTheme.name);
          setIsEidTime(true);
        }
      } else {
        // Not an Eid theme
        setEidTheme(null);
        setEidColors(null);
        setEidVariant('default');
        setIsEidTime(false);
      }
    } catch (error) {
      setEidTheme(null);
      setEidColors(null);
      setEidVariant('default');
      setIsEidTime(false);
    }
  };

  useEffect(() => {
    loadEidTheme();
  }, [currentTheme]);

  const refreshEidTheme = () => {
    loadEidTheme();
  };

  const isEidMubarakTheme = eidTheme !== null && isEidTime;

  const contextValue: EidMubarakContextType = {
    isEidMubarakTheme,
    eidTheme,
    eidColors,
    eidVariant,
    isEidTime,
    refreshEidTheme
  };

  return (
    <EidMubarakContext.Provider value={contextValue}>
      {children}
    </EidMubarakContext.Provider>
  );
};

export default EidMubarakThemeProvider;
