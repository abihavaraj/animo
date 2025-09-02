import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ScreenSize {
  width: number;
  height: number;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
  isTablet: boolean;
}

export interface ResponsiveModalDimensions {
  width: number | `${number}%`;
  maxWidth: number;
  minHeight: number;
  maxHeight: number | `${number}%`;
  margin: number;
  padding: number;
}

// Screen size breakpoints
const BREAKPOINTS = {
  small: 360,    // Small phones (Galaxy S series, iPhone SE)
  medium: 400,   // Standard phones (iPhone 12/13/14)
  large: 480,    // Large phones (iPhone Pro Max, Galaxy Note)
  tablet: 768    // Tablets
};

export const getScreenSize = (): ScreenSize => {
  return {
    width: screenWidth,
    height: screenHeight,
    isSmall: screenWidth < BREAKPOINTS.small,
    isMedium: screenWidth >= BREAKPOINTS.small && screenWidth < BREAKPOINTS.large,
    isLarge: screenWidth >= BREAKPOINTS.large && screenWidth < BREAKPOINTS.tablet,
    isTablet: screenWidth >= BREAKPOINTS.tablet
  };
};

export const getResponsiveModalDimensions = (
  modalType: 'small' | 'medium' | 'large' | 'fullscreen' = 'medium'
): ResponsiveModalDimensions => {
  const screenSize = getScreenSize();
  const isAndroid = Platform.OS === 'android';
  
  // Base configurations for different modal types
  const configs = {
    small: {
      width: screenSize.isSmall ? '90%' as const : screenSize.isMedium ? '85%' as const : '75%' as const,
      maxWidth: screenSize.isSmall ? 320 : screenSize.isMedium ? 350 : 380,
      minHeight: 200,
      maxHeight: screenSize.isSmall ? '60%' as const : '70%' as const,
      margin: screenSize.isSmall ? 16 : 20,
      padding: screenSize.isSmall ? 16 : 20
    },
    medium: {
      width: screenSize.isSmall ? '95%' as const : screenSize.isMedium ? '90%' as const : '80%' as const,
      maxWidth: screenSize.isSmall ? 340 : screenSize.isMedium ? 380 : 420,
      minHeight: screenSize.isSmall ? 300 : 350,
      maxHeight: screenSize.isSmall ? '80%' as const : '85%' as const,
      margin: screenSize.isSmall ? 12 : 16,
      padding: screenSize.isSmall ? 16 : 20
    },
    large: {
      width: screenSize.isSmall ? '98%' as const : screenSize.isMedium ? '95%' as const : '90%' as const,
      maxWidth: screenSize.isSmall ? screenWidth - 20 : screenSize.isMedium ? 450 : 500,
      minHeight: screenSize.isSmall ? 400 : 500,
      maxHeight: screenSize.isSmall ? '90%' as const : '85%' as const,
      margin: screenSize.isSmall ? 8 : 12,
      padding: screenSize.isSmall ? 16 : 20
    },
    fullscreen: {
      width: '100%' as const,
      maxWidth: screenWidth,
      minHeight: screenHeight * 0.9,
      maxHeight: '95%' as const,
      margin: 0,
      padding: screenSize.isSmall ? 16 : 20
    }
  };

  const baseConfig = configs[modalType];
  
  // Android-specific adjustments for edge-to-edge compatibility
  if (isAndroid) {
    return {
      ...baseConfig,
      // Slightly reduce sizes on Android to account for edge-to-edge display
      margin: baseConfig.margin + (screenSize.isSmall ? 4 : 8),
      maxHeight: typeof baseConfig.maxHeight === 'string' ? 
        `${parseInt(baseConfig.maxHeight) - 5}%` as const : 
        baseConfig.maxHeight * 0.95
    };
  }

  return baseConfig;
};

export const getResponsiveFontSize = (baseSize: number): number => {
  const screenSize = getScreenSize();
  
  if (screenSize.isSmall) {
    return Math.max(12, baseSize - 2);
  } else if (screenSize.isLarge || screenSize.isTablet) {
    return baseSize + 1;
  }
  
  return baseSize;
};

export const getResponsiveSpacing = (baseSpacing: number): number => {
  const screenSize = getScreenSize();
  
  if (screenSize.isSmall) {
    return Math.max(4, baseSpacing - 2);
  } else if (screenSize.isLarge || screenSize.isTablet) {
    return baseSpacing + 2;
  }
  
  return baseSpacing;
};

export const getResponsiveIconSize = (baseSize: number): number => {
  const screenSize = getScreenSize();
  
  if (screenSize.isSmall) {
    return Math.max(16, baseSize - 2);
  } else if (screenSize.isTablet) {
    return baseSize + 4;
  }
  
  return baseSize;
};

// Screen orientation utilities
export const isLandscape = (): boolean => {
  return screenWidth > screenHeight;
};

export const isPortrait = (): boolean => {
  return screenHeight > screenWidth;
};

// Safe area utilities for Android edge-to-edge
export const getSafeAreaPadding = () => {
  const screenSize = getScreenSize();
  const isAndroid = Platform.OS === 'android';
  
  if (isAndroid) {
    return {
      paddingTop: screenSize.isSmall ? 24 : 32, // Status bar
      paddingBottom: screenSize.isSmall ? 16 : 24, // Navigation bar
      paddingHorizontal: 0
    };
  }
  
  return {
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0
  };
};

export default {
  getScreenSize,
  getResponsiveModalDimensions,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getResponsiveIconSize,
  isLandscape,
  isPortrait,
  getSafeAreaPadding
};
