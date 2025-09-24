import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';
import ChristmasLights from './animations/ChristmasLights';
import ChristmasSnow from './animations/ChristmasSnow';

interface ChristmasThemeWrapperProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'red' | 'green' | 'snow' | 'celestial';
  showSnow?: boolean;
  showLights?: boolean;
  snowIntensity?: 'light' | 'medium' | 'heavy';
  lightsIntensity?: 'subtle' | 'medium' | 'bright';
  style?: ViewStyle;
}

const ChristmasThemeWrapper: React.FC<ChristmasThemeWrapperProps> = ({
  children,
  variant = 'default',
  showSnow = true,
  showLights = true,
  snowIntensity = 'medium',
  lightsIntensity = 'medium',
  style,
}) => {
  const theme = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'gold':
        return {
          background: '#FEFCF9',
          surface: '#F8F6F3',
          primary: '#D4A574',
          accent: '#B8860B',
        };
      case 'red':
        return {
          background: '#FEF2F2',
          surface: '#FFFFFF',
          primary: '#8B0000',
          accent: '#B91C1C',
        };
      case 'green':
        return {
          background: '#F8F6F3',
          surface: '#FFFFFF',
          primary: '#2D5016',
          accent: '#228B22',
        };
      case 'snow':
        return {
          background: '#F8F9FA',
          surface: '#FFFFFF',
          primary: '#2D5016',
          accent: '#4A4A4A',
        };
      case 'celestial':
        return {
          background: '#F8FAFC',
          surface: '#FFFFFF',
          primary: '#1E3A8A',
          accent: '#C0C0C0',
        };
      default:
        return {
          background: theme.colors.background,
          surface: theme.colors.surface,
          primary: theme.colors.primary,
          accent: theme.colors.accent,
        };
    }
  };

  const colors = getVariantColors();

  const getLightColors = () => {
    switch (variant) {
      case 'gold':
        return ['#FFD700', '#D4A574', '#B8860B', '#FFA500'];
      case 'red':
        return ['#FF6B6B', '#8B0000', '#B91C1C', '#FFB6C1'];
      case 'green':
        return ['#32CD32', '#2D5016', '#228B22', '#90EE90'];
      case 'snow':
        return ['#FFFFFF', '#F0F0F0', '#E0E0E0', '#D0D0D0'];
      case 'celestial':
        return ['#87CEEB', '#1E3A8A', '#C0C0C0', '#B0C4DE'];
      default:
        return ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      {/* Christmas Lights */}
      {showLights && (
        <ChristmasLights 
          colors={getLightColors()} 
          intensity={lightsIntensity} 
        />
      )}

      {/* Main Content */}
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {children}
      </View>

      {/* Christmas Snow */}
      {showSnow && (
        <ChristmasSnow intensity={snowIntensity} />
      )}

      {/* Decorative Border */}
      <View style={[styles.border, { backgroundColor: colors.primary + '20' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    zIndex: 1001,
  },
});

export default ChristmasThemeWrapper;
