import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeColor } from '../../hooks/useDynamicThemeColor';
import { Caption } from '../ui/Typography';

interface WomensDayElementsProps {
  showElements?: boolean;
  style?: any;
}

export const WomensDayElements: React.FC<WomensDayElementsProps> = ({ 
  showElements = true, 
  style 
}) => {
  const { currentTheme } = useTheme();
  const accentColor = useThemeColor({}, 'accent');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  
  // Only show elements if Women's Day theme is active
  const isWomensDayTheme = currentTheme?.name === 'womens_day';
  
  if (!isWomensDayTheme || !showElements) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Floating flower elements */}
      <View style={styles.floatingElements}>
        <Animated.View style={[styles.floatingIcon, styles.flower1]}>
          <MaterialIcons name="local-florist" size={16} color={accentColor + '60'} />
        </Animated.View>
        <Animated.View style={[styles.floatingIcon, styles.flower2]}>
          <MaterialIcons name="spa" size={14} color={accentColor + '40'} />
        </Animated.View>
        <Animated.View style={[styles.floatingIcon, styles.flower3]}>
          <MaterialIcons name="eco" size={12} color={accentColor + '50'} />
        </Animated.View>
      </View>
    </View>
  );
};

interface WomensDayHeaderProps {
  title?: string;
  subtitle?: string;
}

export const WomensDayHeader: React.FC<WomensDayHeaderProps> = ({
  title = "Women's Day Celebration",
  subtitle = "Strength • Grace • Empowerment"
}) => {
  const { currentTheme } = useTheme();
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  
  const isWomensDayTheme = currentTheme?.name === 'womens_day';
  
  if (!isWomensDayTheme) {
    return null;
  }

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.iconRow}>
          <MaterialIcons name="favorite" size={20} color={accentColor} />
          <MaterialIcons name="local-florist" size={18} color={primaryColor} />
          <MaterialIcons name="spa" size={16} color={accentColor} />
        </View>
        <Caption style={StyleSheet.flatten([styles.headerTitle, { color: primaryColor }])}>
          {title}
        </Caption>
        <Caption style={StyleSheet.flatten([styles.headerSubtitle, { color: textSecondaryColor }])}>
          {subtitle}
        </Caption>
      </View>
    </View>
  );
};

interface WomensDayBadgeProps {
  text: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  size?: 'small' | 'medium' | 'large';
}

export const WomensDayBadge: React.FC<WomensDayBadgeProps> = ({
  text,
  icon = 'favorite',
  size = 'medium'
}) => {
  const { currentTheme } = useTheme();
  const accentColor = useThemeColor({}, 'accent');
  const surfaceColor = useThemeColor({}, 'surface');
  
  const isWomensDayTheme = currentTheme?.name === 'womens_day';
  
  if (!isWomensDayTheme) {
    return null;
  }

  const sizeStyles = {
    small: { padding: 6, fontSize: 11, iconSize: 12 },
    medium: { padding: 8, fontSize: 12, iconSize: 14 },
    large: { padding: 10, fontSize: 13, iconSize: 16 }
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: accentColor + '15',
        borderColor: accentColor + '30',
        padding: currentSize.padding
      }
    ]}>
      <MaterialIcons 
        name={icon} 
        size={currentSize.iconSize} 
        color={accentColor} 
        style={styles.badgeIcon}
      />
      <Caption style={StyleSheet.flatten([
        styles.badgeText,
        { 
          color: accentColor,
          fontSize: currentSize.fontSize
        }
      ])}>
        {text}
      </Caption>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  floatingElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  floatingIcon: {
    position: 'absolute',
  },
  flower1: {
    top: 20,
    right: 30,
  },
  flower2: {
    top: 60,
    left: 25,
  },
  flower3: {
    bottom: 40,
    right: 50,
  },
  headerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontWeight: '500',
  },
});