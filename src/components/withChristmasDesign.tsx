import React from 'react';
import ChristmasThemeDetector from './ChristmasThemeDetector';

interface ChristmasDesignOptions {
  variant?: 'default' | 'gold' | 'red' | 'green' | 'snow' | 'celestial';
  showSnow?: boolean;
  showLights?: boolean;
}

/**
 * Higher-order component that automatically applies Christmas design to any screen
 * when a Christmas theme is active in the database
 * 
 * Usage:
 * export default withChristmasDesign(MyScreen);
 * 
 * Or with options:
 * export default withChristmasDesign(MyScreen, { variant: 'gold', showSnow: true });
 */
export function withChristmasDesign<P extends object>(
  Component: React.ComponentType<P>,
  options: ChristmasDesignOptions = {}
) {
  const WrappedComponent = (props: P) => {
    return (
      <ChristmasThemeDetector
        fallbackVariant={options.variant}
        showSnow={options.showSnow}
        showLights={options.showLights}
      >
        <Component {...props} />
      </ChristmasThemeDetector>
    );
  };

  WrappedComponent.displayName = `withChristmasDesign(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default withChristmasDesign;
