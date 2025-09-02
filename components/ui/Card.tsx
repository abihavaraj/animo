import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { layout, spacing } from '../../constants/Spacing';

/**
 * ANIMO Pilates Studio - Card Component
 * Mobile Design System v1.1
 */

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  style,
}) => {
  const getCardStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.card];
    
    // Add variant styles
    if (variant === 'elevated') {
      baseStyle.push(styles.elevated);
    }
    
    // Add padding styles
    switch (padding) {
      case 'none':
        break;
      case 'small':
        baseStyle.push(styles.paddingSmall);
        break;
      case 'medium':
        baseStyle.push(styles.paddingMedium);
        break;
      case 'large':
        baseStyle.push(styles.paddingLarge);
        break;
    }
    
    return baseStyle;
  };

  return (
    <View style={[...getCardStyle(), style]}>
      {children}
    </View>
  );
};

interface CardContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const CardContent: React.FC<CardContentProps> = ({ children, style }) => (
  <View style={[styles.content, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
    elevation: 1,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
  },
  elevated: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
  },
  
  // Padding variants
  paddingSmall: {
    padding: spacing.sm,
  },
  paddingMedium: {
    padding: spacing.md,
  },
  paddingLarge: {
    padding: spacing.lg,
  },
  
  // Content wrapper
  content: {
    gap: spacing.sm,
  },
});

export default Card; 