import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { PinkOctoberThemeColors, PinkOctoberThemeConfig, getActivePinkOctoberTheme, pinkOctoberThemes } from '../services/pinkOctoberTheme';

interface PinkOctoberContextType {
  isPinkOctoberTheme: boolean;
  pinkOctoberTheme: PinkOctoberThemeConfig | null;
  pinkOctoberColors: PinkOctoberThemeColors | null;
  pinkOctoberVariant: string;
  isPinkOctoberTime: boolean;
  refreshPinkOctoberTheme: () => void;
}

const PinkOctoberContext = createContext<PinkOctoberContextType | undefined>(undefined);

export const usePinkOctoberTheme = () => {
  const context = useContext(PinkOctoberContext);
  if (!context) {
    throw new Error('usePinkOctoberTheme must be used within a PinkOctoberThemeProvider');
  }
  return context;
};

interface PinkOctoberThemeProviderProps {
  children: React.ReactNode;
}

export const PinkOctoberThemeProvider: React.FC<PinkOctoberThemeProviderProps> = ({ children }) => {
  const { currentTheme } = useTheme();
  const [pinkOctoberTheme, setPinkOctoberTheme] = useState<PinkOctoberThemeConfig | null>(null);
  const [pinkOctoberColors, setPinkOctoberColors] = useState<PinkOctoberThemeColors | null>(null);
  const [pinkOctoberVariant, setPinkOctoberVariant] = useState<string>('default');

  // Check if current theme is Pink October
  const isPinkOctoberTheme = currentTheme && (
    currentTheme.name?.toLowerCase().includes('pink_october') ||
    currentTheme.display_name?.toLowerCase().includes('pink october') ||
    currentTheme.display_name?.includes('🌸') ||
    currentTheme.display_name?.includes('Pink October')
  );

  // Check if it's Pink October time (October)
  const isPinkOctoberTime = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
    return month === 10; // October
  };

  const loadPinkOctoberTheme = () => {
    if (isPinkOctoberTheme) {
      const theme = getActivePinkOctoberTheme();
      if (theme) {
        setPinkOctoberTheme(theme);
        setPinkOctoberColors(theme.colors);
        setPinkOctoberVariant('default');
      } else {
        // Fallback to first theme
        const fallbackTheme = pinkOctoberThemes[0];
        setPinkOctoberTheme(fallbackTheme);
        setPinkOctoberColors(fallbackTheme.colors);
        setPinkOctoberVariant('default');
      }
    } else {
      setPinkOctoberTheme(null);
      setPinkOctoberColors(null);
      setPinkOctoberVariant('default');
    }
  };

  const refreshPinkOctoberTheme = () => {
    loadPinkOctoberTheme();
  };

  useEffect(() => {
    loadPinkOctoberTheme();
  }, [currentTheme, isPinkOctoberTheme]);

  const value: PinkOctoberContextType = {
    isPinkOctoberTheme: !!isPinkOctoberTheme,
    pinkOctoberTheme,
    pinkOctoberColors,
    pinkOctoberVariant,
    isPinkOctoberTime: isPinkOctoberTime(),
    refreshPinkOctoberTheme,
  };

  return (
    <PinkOctoberContext.Provider value={value}>
      {children}
    </PinkOctoberContext.Provider>
  );
};

export default PinkOctoberThemeProvider;
