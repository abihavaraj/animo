export interface NewYearThemeColors {
    // Primary colors
    primary: string;
    secondary: string;
    accent: string;
    
    // Background colors
    background: string;
    surface: string;
    surfaceVariant: string;
    surfaceElevated: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;
    textOnAccent: string;
    
    // UI colors
    border: string;
    borderLight: string;
    divider: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    
    // Special New Year colors
    snow: string;
    star: string;
    gold: string;
    silver: string;
    celebration: string;
    blessing: string;
  }
  
  export interface NewYearThemeConfig {
    name: string;
    displayName: string;
    description: string;
    colors: NewYearThemeColors;
    animations: {
      snowFalling: boolean;
      floatingStars: boolean;
      celebrationParticles: boolean;
    };
    icons: {
      snow: string;
      star: string;
      celebration: string;
      blessing: string;
    };
  }
  
  export const newYearThemes: NewYearThemeConfig[] = [
    {
      name: 'new_year',
      displayName: '🎊 New Year',
      description: 'Celebratory New Year theme with winter wonderland design, perfect for welcoming any new year.',
    colors: {
        // Primary colors
        primary: '#FFD700',
        secondary: '#FFFFFF',
        accent: '#FF6F00',
        
        // Background colors
        background: '#1a1a1a',
        surface: '#2d2d2d',
        surfaceVariant: '#3d3d3d',
        surfaceElevated: '#4d4d4d',
        
        // Text colors
        text: '#FFFFFF',
        textSecondary: '#FFD700',
        textMuted: '#CCCCCC',
        textOnAccent: '#1a1a1a',
        
        // UI colors
        border: '#FFD700',
        borderLight: '#FFA500',
        divider: '#555555',
        error: '#FF6B6B',
        warning: '#FFD93D',
        success: '#6BCF7F',
        info: '#4DABF7',
        
        // Special New Year colors
        snow: '#FFFFFF',
        star: '#FFD700',
        gold: '#FFD700',
        silver: '#C0C0C0',
        celebration: '#FF6F00',
        blessing: '#6BCF7F'
      },
      animations: {
        snowFalling: true,
        floatingStars: true,
        celebrationParticles: true
      },
      icons: {
        snow: '❄️',
        star: '⭐',
        celebration: '🎊',
        blessing: '🎉'
      }
    }
  ];
  
  export const getNewYearTheme = (themeName: string): NewYearThemeConfig | null => {
    return newYearThemes.find(theme => theme.name === themeName) || null;
  };
  
  export const getActiveNewYearTheme = (currentThemeName?: string): NewYearThemeConfig | null => {
    if (!currentThemeName) return null;
    
    // Check if current theme is a New Year theme
    const isNewYearTheme = currentThemeName.toLowerCase().includes('new_year') ||
                           currentThemeName.includes('🎊') ||
                           currentThemeName.includes('New Year');
    
    if (isNewYearTheme) {
      const exactMatch = getNewYearTheme(currentThemeName);
      if (exactMatch) {
        return exactMatch;
      }
      return newYearThemes[0];
    }
    
    return null;
  };
  
  export const isNewYearTheme = (themeName?: string): boolean => {
    if (!themeName) return false;
    return themeName.toLowerCase().includes('new_year') ||
           themeName.includes('🎊') ||
           themeName.includes('New Year');
  };