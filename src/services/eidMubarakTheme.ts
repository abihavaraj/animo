export interface EidMubarakThemeColors {
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
    
    // Special Eid colors
    crescent: string;
    star: string;
    henna: string;
    gold: string;
    silver: string;
    celebration: string;
    blessing: string;
  }
  
  export interface EidMubarakThemeConfig {
    name: string;
    displayName: string;
    description: string;
    colors: EidMubarakThemeColors;
    animations: {
      crescentMoon: boolean;
      floatingStars: boolean;
      hennaPatterns: boolean;
      celebrationParticles: boolean;
    };
    icons: {
      crescentMoon: string;
      star: string;
      henna: string;
      mosque: string;
      prayer: string;
    };
  }
  
  export const eidMubarakThemes: EidMubarakThemeConfig[] = [
    {
      name: 'eid_mubarak_2025',
      displayName: '🕌 Eid Mubarak 2025',
      description: 'Beautiful Eid Mubarak theme with professional design, perfect for reception portal with elegant animations.',
      colors: {
        // Primary colors - Deep Islamic green and gold
        primary: '#1B5E20',
        secondary: '#2E7D32',
        accent: '#FFD700',
        
        // Background colors - Soft, warm tones
        background: '#F8F6F0',
        surface: '#FFFFFF',
        surfaceVariant: '#F5F5F5',
        surfaceElevated: '#FFFFFF',
        
        // Text colors - Rich, readable tones
        text: '#1B5E20',
        textSecondary: '#2E7D32',
        textMuted: '#66BB6A',
        textOnAccent: '#1B5E20',
        
        // UI colors - Harmonious palette
        border: '#C8E6C9',
        borderLight: '#E8F5E8',
        divider: '#E0F2E0',
        error: '#D32F2F',
        warning: '#FF9800',
        success: '#4CAF50',
        info: '#2196F3',
        
        // Special Eid colors
        crescent: '#FFD700',
        star: '#FFD700',
        henna: '#D84315',
        gold: '#FFD700',
        silver: '#C0C0C0',
        celebration: '#E91E63',
        blessing: '#1B5E20'
      },
      animations: {
        crescentMoon: true,
        floatingStars: true,
        hennaPatterns: true,
        celebrationParticles: true
      },
      icons: {
        crescentMoon: '🌙',
        star: '⭐',
        henna: '🖐️',
        mosque: '🕌',
        prayer: '🤲'
      }
    },
    {
      name: 'ramadan_2025',
      displayName: '🌙 Ramadan 2025',
      description: 'Sacred Ramadan theme with peaceful colors and spiritual elements, perfect for the holy month.',
      colors: {
        // Primary colors - Deep blue and silver
        primary: '#1565C0',
        secondary: '#1976D2',
        accent: '#C0C0C0',
        
        // Background colors - Calm, spiritual tones
        background: '#F3F5F7',
        surface: '#FFFFFF',
        surfaceVariant: '#F8F9FA',
        surfaceElevated: '#FFFFFF',
        
        // Text colors - Professional, readable
        text: '#1565C0',
        textSecondary: '#1976D2',
        textMuted: '#90CAF9',
        textOnAccent: '#1565C0',
        
        // UI colors - Spiritual palette
        border: '#BBDEFB',
        borderLight: '#E3F2FD',
        divider: '#E1F5FE',
        error: '#D32F2F',
        warning: '#FF9800',
        success: '#4CAF50',
        info: '#2196F3',
        
        // Special Ramadan colors
        crescent: '#C0C0C0',
        star: '#C0C0C0',
        henna: '#8D6E63',
        gold: '#FFD700',
        silver: '#C0C0C0',
        celebration: '#9C27B0',
        blessing: '#4CAF50'
      },
      animations: {
        crescentMoon: true,
        floatingStars: true,
        hennaPatterns: false,
        celebrationParticles: false
      },
      icons: {
        crescentMoon: '🌙',
        star: '✨',
        henna: '🖐️',
        mosque: '🕌',
        prayer: '🤲'
      }
    },
    {
      name: 'new_year_2025',
      displayName: '🎊 New Year 2025',
      description: 'Celebratory New Year theme with festive colors and joyful animations, perfect for welcoming the new year.',
      colors: {
        // Primary colors
        primary: '#E91E63',
        secondary: '#F06292',
        accent: '#FF4081',
        
        // Background colors
        background: '#FFF3E0',
        surface: '#FFFFFF',
        surfaceVariant: '#FFF8E1',
        surfaceElevated: '#FFFFFF',
        
        // Text colors
        text: '#C2185B',
        textSecondary: '#E91E63',
        textMuted: '#F8BBD9',
        textOnAccent: '#FFFFFF',
        
        // UI colors
        border: '#F8BBD9',
        borderLight: '#FCE4EC',
        divider: '#F3E5F5',
        error: '#D32F2F',
        warning: '#FF9800',
        success: '#4CAF50',
        info: '#2196F3',
        
        // Special New Year colors
        crescent: '#FFD700',
        star: '#FFD700',
        henna: '#FF6F00',
        gold: '#FFD700',
        silver: '#C0C0C0',
        celebration: '#E91E63',
        blessing: '#4CAF50'
      },
      animations: {
        crescentMoon: true,
        floatingStars: true,
        hennaPatterns: false,
        celebrationParticles: true
      },
      icons: {
        crescentMoon: '🎊',
        star: '✨',
        henna: '🎉',
        mosque: '🏆',
        prayer: '🎈'
      }
    }
  ];
  
  export const getEidMubarakTheme = (themeName: string): EidMubarakThemeConfig | null => {
    return eidMubarakThemes.find(theme => theme.name === themeName) || null;
  };
  
  export const getActiveEidMubarakTheme = (currentThemeName?: string): EidMubarakThemeConfig | null => {
    if (!currentThemeName) return null;
    
    // Check if current theme is a celebration theme (Eid, Ramadan, or New Year)
    const isCelebrationTheme = currentThemeName.toLowerCase().includes('eid') || 
                               currentThemeName.toLowerCase().includes('ramadan') ||
                               currentThemeName.toLowerCase().includes('new_year') ||
                               currentThemeName.includes('🕌') ||
                               currentThemeName.includes('🌙') ||
                               currentThemeName.includes('🎊') ||
                               currentThemeName.includes('Eid') ||
                               currentThemeName.includes('Ramadan') ||
                               currentThemeName.includes('New Year');
    
    if (isCelebrationTheme) {
      // First try to find exact match
      const exactMatch = getEidMubarakTheme(currentThemeName);
      if (exactMatch) {
        return exactMatch;
      }
      
      // If no exact match, find by theme type
      if (currentThemeName.toLowerCase().includes('ramadan')) {
        return eidMubarakThemes.find(theme => theme.name === 'ramadan_2025') || eidMubarakThemes[0];
      } else if (currentThemeName.toLowerCase().includes('eid')) {
        return eidMubarakThemes.find(theme => theme.name === 'eid_mubarak_2025') || eidMubarakThemes[0];
      } else if (currentThemeName.toLowerCase().includes('new_year')) {
        return eidMubarakThemes.find(theme => theme.name === 'new_year_2025') || eidMubarakThemes[0];
      }
      
      // Fallback to first theme
      return eidMubarakThemes[0];
    }
    
    return null;
  };
  
  export const isEidMubarakTheme = (themeName?: string): boolean => {
    if (!themeName) return false;
    return themeName.toLowerCase().includes('eid') || 
           themeName.toLowerCase().includes('ramadan') ||
           themeName.toLowerCase().includes('new_year') ||
           themeName.includes('🕌') ||
           themeName.includes('🌙') ||
           themeName.includes('🎊') ||
           themeName.includes('Eid') ||
           themeName.includes('Ramadan') ||
           themeName.includes('New Year');
  };