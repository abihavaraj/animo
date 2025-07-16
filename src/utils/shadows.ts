/**
 * Shadow utility functions for consistent styling across the app
 * Provides both React Native and Web-compatible shadows
 */

export interface ShadowProps {
  elevation?: number;
  shadowColor?: string;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  boxShadow?: string;
}

/**
 * Creates a cross-platform shadow style
 * @param color - Shadow color (hex or rgba)
 * @param opacity - Shadow opacity (0-1)
 * @param offset - Shadow offset {width, height}
 * @param blurRadius - Blur radius
 * @param elevation - Android elevation (optional)
 */
export const createShadow = (
  color: string = '#000',
  opacity: number = 0.06,
  offset: { width: number; height: number } = { width: 0, height: 1 },
  blurRadius: number = 2,
  elevation: number = 1
): ShadowProps => {
  // Convert hex color to rgba if needed
  const getRgbaColor = (hexColor: string, alpha: number): string => {
    if (hexColor.startsWith('rgba')) return hexColor;
    if (hexColor.startsWith('#')) {
      const hex = hexColor.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(0, 0, 0, ${alpha})`;
  };

  return {
    // React Native properties (for mobile)
    elevation,
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: blurRadius,
    // Web property (for React Native Web)
    boxShadow: `${offset.width}px ${offset.height}px ${blurRadius}px ${getRgbaColor(color, opacity)}`,
  };
};

/**
 * Predefined shadow styles for common use cases
 */
export const shadows = {
  // Light card shadow
  card: createShadow('#000', 0.06, { width: 0, height: 1 }, 2, 1),
  
  // Button shadow
  button: createShadow('#000', 0.1, { width: 0, height: 1 }, 2, 2),
  
  // Elevated card shadow
  cardElevated: createShadow('#000', 0.1, { width: 0, height: 2 }, 4, 3),
  
  // Modal shadow
  modal: createShadow('#000', 0.25, { width: 0, height: 4 }, 8, 5),
  
  // Floating action button shadow
  fab: createShadow('#000', 0.3, { width: 0, height: 3 }, 5, 6),
  
  // Accent button shadow (with brand color)
  accent: createShadow('#B7B331', 0.2, { width: 0, height: 1 }, 2, 2),
  
  // No shadow
  none: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    boxShadow: 'none',
  },
};

/**
 * Shadow styles for specific components
 */
export const componentShadows = {
  loginCard: shadows.card,
  loginButton: shadows.accent,
  navigationCard: shadows.cardElevated,
  bottomSheet: shadows.modal,
  classList: shadows.card,
  classItem: shadows.button,
  profileCard: shadows.cardElevated,
  statCard: shadows.card,
  actionButton: shadows.button,
  floatingButton: shadows.fab,
}; 