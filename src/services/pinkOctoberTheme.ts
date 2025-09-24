export interface PinkOctoberThemeColors {
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
    
    // Special Pink October colors
    pink: string;
    ribbon: string;
    awareness: string;
    hope: string;
    strength: string;
    support: string;
  }
  
  export interface PinkOctoberThemeConfig {
    name: string;
    displayName: string;
    description: string;
    colors: PinkOctoberThemeColors;
    animations: {
      ribbonFloating: boolean;
      awarenessParticles: boolean;
      hopeGlow: boolean;
    };
    icons: {
      ribbon: string;
      awareness: string;
      hope: string;
      strength: string;
      support: string;
      heart: string;
    };
    messages: {
      title: string;
      subtitle: string;
      blessing: string;
      blessingTranslation: string;
      blessingAlbanian: string;
    };
  }
  
  export const pinkOctoberThemes: PinkOctoberThemeConfig[] = [
    {
      name: 'pink_october',
      displayName: '🌸 Pink October',
      description: 'Breast Cancer Awareness Month theme with pink ribbons, hope, and support messages.',
      colors: {
        // Primary colors - Pink theme
        primary: '#E91E63', // Pink 500
        secondary: '#F8BBD9', // Light pink
        accent: '#C2185B', // Pink 700
        
        // Background colors - Soft pink backgrounds
        background: '#FCE4EC', // Pink 50
        surface: '#FFFFFF', // White for cards
        surfaceVariant: '#F8BBD9', // Light pink variant
        surfaceElevated: '#FFFFFF', // White elevated
        
        // Text colors - Dark text for readability
        text: '#1A1A1A', // Dark text
        textSecondary: '#E91E63', // Pink secondary text
        textMuted: '#9E9E9E', // Muted text
        textOnAccent: '#FFFFFF', // White on pink
        
        // UI colors
        border: '#E91E63', // Pink borders
        borderLight: '#F8BBD9', // Light pink borders
        divider: '#F8BBD9', // Light pink dividers
        error: '#F44336', // Red for errors
        warning: '#FF9800', // Orange for warnings
        success: '#4CAF50', // Green for success
        info: '#2196F3', // Blue for info
        
        // Special Pink October colors
        pink: '#E91E63', // Main pink
        ribbon: '#E91E63', // Ribbon pink
        awareness: '#C2185B', // Awareness pink
        hope: '#F8BBD9', // Hope pink
        strength: '#AD1457', // Strength pink
        support: '#F48FB1', // Support pink
      },
      animations: {
        ribbonFloating: true,
        awarenessParticles: true,
        hopeGlow: true,
      },
      icons: {
        ribbon: '🌸',
        awareness: '💗',
        hope: '✨',
        strength: '💪',
        support: '🤝',
        heart: '❤️',
      },
      messages: {
        title: 'Pink October',
        subtitle: 'Breast Cancer Awareness',
        blessing: 'Together We Are Stronger',
        blessingTranslation: 'May hope and strength guide us through every challenge',
        blessingAlbanian: 'Shpresë dhe forcë të na udhëheqin nëpër çdo sfidë',
      },
    },
  ];
  
  export function getActivePinkOctoberTheme(): PinkOctoberThemeConfig | null {
    // For now, return the first theme
    // In the future, this could check for active themes in the database
    return pinkOctoberThemes[0];
  }
  
  export function isPinkOctoberTheme(themeName: string): boolean {
    return themeName?.toLowerCase().includes('pink_october') ||
           themeName?.toLowerCase().includes('pink october') ||
           themeName?.includes('🌸') ||
           themeName?.includes('Pink October');
  }
  