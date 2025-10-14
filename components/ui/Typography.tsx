import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle } from 'react-native';

/**
 * ANIMO Pilates Studio - Typography Scale
 * Mobile Design System v1.1
 * 
 * Typeface: SF Pro / Roboto system stack. Never mix other fonts.
 */

interface TypographyProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  numberOfLines?: number;
}

// H1: 24px bold - Page titles
export const H1: React.FC<TypographyProps> = ({ 
  children, 
  style, 
  color = '#2C2C2C',
  textAlign = 'left',
  numberOfLines
}) => {
  // Safety check to ensure children is renderable
  if (children === null || children === undefined) {
    return null;
  }
  
  return (
    <Text 
      style={[styles.h1, { color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

// H2: 20px semi-bold - Section / Card headers
export const H2: React.FC<TypographyProps> = ({ 
  children, 
  style, 
  color = '#2C2C2C',
  textAlign = 'left',
  numberOfLines
}) => {
  // Safety check to ensure children is renderable
  if (children === null || children === undefined) {
    return null;
  }
  
  return (
    <Text 
      style={[styles.h2, { color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

// H3: 18px semi-bold - Sub-section headers
export const H3: React.FC<TypographyProps> = ({ 
  children, 
  style, 
  color = '#2C2C2C',
  textAlign = 'left',
  numberOfLines
}) => {
  // Safety check to ensure children is renderable
  if (children === null || children === undefined) {
    return null;
  }
  
  return (
    <Text 
      style={[styles.h3, { color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

// Body: 16px regular - Long-form copy
export const Body: React.FC<TypographyProps> = ({ 
  children, 
  style, 
  color = '#2C2C2C',
  textAlign = 'left',
  numberOfLines
}) => {
  // Safety check to ensure children is renderable
  if (children === null || children === undefined) {
    return null;
  }
  
  return (
    <Text 
      style={[styles.body, { color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

// Caption: 14px medium - Supporting text, labels
export const Caption: React.FC<TypographyProps> = ({ 
  children, 
  style, 
  color = '#666666',
  textAlign = 'left',
  numberOfLines
}) => {
  // Safety check to ensure children is renderable
  if (children === null || children === undefined) {
    return null;
  }
  
  return (
    <Text 
      style={[styles.caption, { color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

// Small: 12px medium - Meta info, helper text
export const Small: React.FC<TypographyProps> = ({ 
  children, 
  style, 
  color = '#999999',
  textAlign = 'left',
  numberOfLines
}) => {
  // Safety check to ensure children is renderable
  if (children === null || children === undefined) {
    return null;
  }
  
  return (
    <Text 
      style={[styles.small, { color, textAlign }, style]}
      numberOfLines={numberOfLines}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700', // Bold
    marginBottom: 8,
  },
  h2: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600', // Semi-bold
    marginBottom: 6,
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600', // Semi-bold
    marginBottom: 4,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400', // Regular
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500', // Medium
    marginBottom: 2,
  },
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500', // Medium
    marginBottom: 2,
  },
});

// Export all components
export default {
  H1,
  H2,
  H3,
  Body,
  Caption,
  Small,
}; 