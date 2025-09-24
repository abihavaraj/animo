import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import AdvancedNewYearWrapper from './AdvancedNewYearWrapper';

interface NewYearDesignOptions {
  variant?: 'gold' | 'red' | 'green' | 'snow' | 'celestial';
  showSnow?: boolean;
  showLights?: boolean;
  showParticles?: boolean;
  showGradient?: boolean;
  showBorder?: boolean;
}

/**
 * Higher-Order Component that applies New Year design to any screen
 * 
 * Usage:
 * export default withNewYearDesign(MyScreen, { variant: 'gold', showSnow: true });
 * 
 * @param WrappedComponent - The component to wrap
 * @param options - New Year design options
 * @returns Enhanced component with New Year design
 */
export function withNewYearDesign<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: NewYearDesignOptions = {}
) {
  const {
    variant = 'gold',
    showSnow = true,
    showLights = true,
    showParticles = true,
    showGradient = true,
    showBorder = true,
  } = options;

  const NewYearEnhancedComponent: React.FC<P> = (props) => {
    const { currentTheme } = useTheme();
    
    // Check if current theme is New Year
    const isNewYearTheme = currentTheme && (
      currentTheme.name?.toLowerCase().includes('new_year') ||
      currentTheme.display_name?.toLowerCase().includes('new year') ||
      currentTheme.display_name?.includes('🎊') ||
      currentTheme.display_name?.includes('New Year')
    );

    // If not New Year theme, return original component
    if (!isNewYearTheme) {
      return <WrappedComponent {...props} />;
    }

    // Wrap with New Year design
    return (
      <AdvancedNewYearWrapper
        showParticles={showParticles}
        showGradient={showGradient}
        showBorder={showBorder}
      >
        <WrappedComponent {...props} />
      </AdvancedNewYearWrapper>
    );
  };

  // Set display name for debugging
  NewYearEnhancedComponent.displayName = `withNewYearDesign(${WrappedComponent.displayName || WrappedComponent.name})`;

  return NewYearEnhancedComponent;
}

export default withNewYearDesign;
