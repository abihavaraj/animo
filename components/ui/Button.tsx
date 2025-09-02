import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { layout, spacing } from '../../constants/Spacing';

/**
 * ANIMO Pilates Studio - Button Component
 * Mobile Design System v1.1
 */

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'small' | 'medium' | 'large';
  icon?: keyof typeof MaterialIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  onPress,
  style,
  textStyle,
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];
    
    switch (variant) {
      case 'primary':
        return [...baseStyle, styles.primary, disabled && styles.disabled];
      case 'secondary':
        return [...baseStyle, styles.secondary, disabled && styles.disabled];
      case 'destructive':
        return [...baseStyle, styles.destructive, disabled && styles.disabled];
      default:
        return [...baseStyle, styles.primary];
    }
  };

  const getTextStyle = () => {
    const baseTextStyle = [styles.text, styles[`${size}Text`]];
    
    switch (variant) {
      case 'primary':
        return [...baseTextStyle, styles.primaryText];
      case 'secondary':
        return [...baseTextStyle, styles.secondaryText];
      case 'destructive':
        return [...baseTextStyle, styles.destructiveText];
      default:
        return [...baseTextStyle, styles.primaryText];
    }
  };

  const getIconColor = () => {
    if (disabled) return '#999999';
    
    switch (variant) {
      case 'primary':
        return Colors.light.textOnAccent;
      case 'secondary':
        return Colors.light.text;
      case 'destructive':
        return Colors.light.textOnAccent;
      default:
        return Colors.light.textOnAccent;
    }
  };

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {icon && iconPosition === 'left' && (
        <MaterialIcons 
          name={icon} 
          size={iconSize} 
          color={getIconColor()}
          style={styles.iconLeft}
        />
      )}
      
      <Text style={[...getTextStyle(), textStyle]}>
        {loading ? 'Loading...' : children}
      </Text>
      
      {icon && iconPosition === 'right' && (
        <MaterialIcons 
          name={icon} 
          size={iconSize} 
          color={getIconColor()}
          style={styles.iconRight}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius,
    minHeight: 44, // Accessibility minimum
  },
  
  // Sizes
  small: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  large: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.light.accent,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
  },
  secondary: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  destructive: {
    backgroundColor: Colors.light.error,
    elevation: 2,
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.2)',
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: '#E8E6E3',
    elevation: 0,
    shadowOpacity: 0,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mediumText: {
    fontSize: 16,
    lineHeight: 22,
  },
  largeText: {
    fontSize: 18,
    lineHeight: 24,
  },
  
  // Text colors
  primaryText: {
    color: Colors.light.textOnAccent,
  },
  secondaryText: {
    color: Colors.light.text,
  },
  destructiveText: {
    color: Colors.light.textOnAccent,
  },
  
  // Icons
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});

export default Button; 