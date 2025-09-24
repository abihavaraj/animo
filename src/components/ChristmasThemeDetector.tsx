import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import AdvancedChristmasWrapper from './AdvancedChristmasWrapper';

interface ChristmasThemeDetectorProps {
  children: React.ReactNode;
  fallbackVariant?: 'default' | 'gold' | 'red' | 'green' | 'snow' | 'celestial';
  showSnow?: boolean;
  showLights?: boolean;
  showParticles?: boolean;
  showGradient?: boolean;
}

/**
 * Automatically detects if a Christmas theme is active and applies advanced Christmas design
 * This bridges the gap between the database theme system and the Christmas design components
 */
const ChristmasThemeDetector: React.FC<ChristmasThemeDetectorProps> = ({
  children,
  fallbackVariant = 'gold',
  showSnow = true,
  showLights = true,
  showParticles = true,
  showGradient = true,
}) => {
  const { currentTheme } = useTheme();
  
  // Check if current theme is Christmas
  const isChristmasTheme = currentTheme && (
    currentTheme.name?.toLowerCase().includes('christmas') ||
    currentTheme.display_name?.toLowerCase().includes('christmas') ||
    currentTheme.display_name?.includes('🎄')
  );
  
  // If not a Christmas theme, just return children without Christmas wrapper
  if (!isChristmasTheme) {
    return <>{children}</>;
  }
  
  return (
    <AdvancedChristmasWrapper
      showParticles={showParticles}
      showGradient={showGradient}
    >
      {children}
    </AdvancedChristmasWrapper>
  );
};

export default ChristmasThemeDetector;
