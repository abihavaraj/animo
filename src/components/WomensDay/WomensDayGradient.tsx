import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface WomensDayGradientProps {
  children: React.ReactNode;
  style?: any;
}

export const WomensDayGradient: React.FC<WomensDayGradientProps> = ({ children, style }) => {
  const { currentTheme } = useTheme();
  
  const isWomensDayTheme = currentTheme?.name === 'womens_day';
  
  if (!isWomensDayTheme) {
    return <View style={style}>{children}</View>;
  }
  
  return (
    <View style={[styles.gradientContainer, style]}>
      {/* Subtle gradient effect using overlapping views */}
      <View style={[styles.gradientLayer1, StyleSheet.absoluteFill]} />
      <View style={[styles.gradientLayer2, StyleSheet.absoluteFill]} />
      <View style={[styles.gradientLayer3, StyleSheet.absoluteFill]} />
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    position: 'relative',
  },
  gradientLayer1: {
    backgroundColor: 'rgba(139, 90, 107, 0.02)',
    borderRadius: 20,
  },
  gradientLayer2: {
    backgroundColor: 'rgba(212, 113, 154, 0.01)',
    marginTop: 2,
    marginLeft: 2,
    marginRight: 2,
    marginBottom: 2,
    borderRadius: 18,
  },
  gradientLayer3: {
    backgroundColor: 'rgba(139, 90, 107, 0.005)',
    marginTop: 4,
    marginLeft: 4,
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 16,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});
