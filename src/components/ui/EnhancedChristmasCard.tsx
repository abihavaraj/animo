import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface EnhancedChristmasCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  variant?: 'default' | 'gold' | 'red' | 'green' | 'snow' | 'celestial';
  showGlow?: boolean;
  showParticles?: boolean;
  elevated?: boolean;
}

const EnhancedChristmasCard: React.FC<EnhancedChristmasCardProps> = ({
  children,
  title,
  subtitle,
  style,
  variant,
  showGlow = true,
  showParticles = false,
  elevated = true,
}) => {
  const { currentTheme } = useTheme();
  
  // Check if current theme is Christmas
  const isChristmasTheme = currentTheme && (
    currentTheme.name?.toLowerCase().includes('christmas') ||
    currentTheme.display_name?.toLowerCase().includes('christmas') ||
    currentTheme.display_name?.includes('🎄')
  );
  
  // Default Christmas colors
  const christmasColors = {
    background: '#1A1A1A',
    surface: '#2C2C2C',
    primary: '#D32F2F',
    accent: '#FFD700',
    text: '#FFFFFF',
    textSecondary: '#CCCCCC',
    snow: '#FFFFFF',
    lights: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']
  };
  
  const christmasVariant = variant || 'gold';
  const glow = useSharedValue(0);
  const shimmer = useSharedValue(-1);

  React.useEffect(() => {
    if (isChristmasTheme) {
      glow.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      
      shimmer.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        -1,
        false
      );
    }
  }, [isChristmasTheme]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: showGlow ? (glow.value * 0.5 + 0.2) : 0,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * 300 }],
    opacity: 0.3,
  }));

  if (!isChristmasTheme) {
    return (
      <Card style={[styles.fallbackCard, style]}>
        {title && (
          <Card.Content>
            <Text variant="headlineSmall">{title}</Text>
            {subtitle && <Text variant="bodyMedium">{subtitle}</Text>}
          </Card.Content>
        )}
        <Card.Content>{children}</Card.Content>
      </Card>
    );
  }

  const currentVariant = variant || christmasVariant;
  const cardColors = getCardColors(currentVariant, christmasColors);

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.cardContainer, glowStyle]}>
        <LinearGradient
          colors={cardColors.gradient}
          style={[
            styles.card,
            elevated && styles.elevated,
            {
              shadowColor: cardColors.shadow,
              borderColor: cardColors.border,
            },
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Shimmer Effect */}
          <View style={styles.shimmerContainer}>
            <Animated.View style={[styles.shimmer, shimmerStyle]} />
          </View>

          {/* Header */}
          {title && (
            <View style={styles.header}>
              <Text
                variant="headlineSmall"
                style={[styles.title, { color: cardColors.text }]}
              >
                {title}
              </Text>
              {subtitle && (
                <Text
                  variant="bodyMedium"
                  style={[styles.subtitle, { color: cardColors.textSecondary }]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorations} pointerEvents="none">
            <View style={[styles.cornerDecoration, styles.topLeft, { backgroundColor: cardColors.accent + '30' }]} />
            <View style={[styles.cornerDecoration, styles.topRight, { backgroundColor: cardColors.primary + '30' }]} />
            
            {showParticles && (
              <>
                <View style={[styles.particle, styles.particle1, { backgroundColor: cardColors.accent }]} />
                <View style={[styles.particle, styles.particle2, { backgroundColor: cardColors.primary }]} />
                <View style={[styles.particle, styles.particle3, { backgroundColor: cardColors.accent }]} />
              </>
            )}
          </View>

          {/* Christmas Icons */}
          <View style={styles.iconContainer} pointerEvents="none">
            <Text style={[styles.icon, styles.iconTopLeft, { color: cardColors.accent + '60' }]}>
              {getVariantIcon(currentVariant)}
            </Text>
            <Text style={[styles.icon, styles.iconBottomRight, { color: cardColors.primary + '60' }]}>
              {getVariantIcon(currentVariant)}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const getCardColors = (variant: string, christmasColors: any) => {
  const baseColors = {
    gradient: [christmasColors.surface, christmasColors.surface + 'E6'],
    border: christmasColors.primary + '40',
    shadow: christmasColors.primary,
    text: christmasColors.text,
    textSecondary: christmasColors.textSecondary,
    primary: christmasColors.primary,
    accent: christmasColors.accent,
  };

  switch (variant) {
    case 'gold':
      return {
        ...baseColors,
        gradient: ['#2A2F3E', '#3A3F4E', '#2A2F3E'],
        border: '#FFD700',
        shadow: '#FFD700',
      };
    case 'red':
      return {
        ...baseColors,
        gradient: ['#2E1A1A', '#3E2A2A', '#2E1A1A'],
        border: '#FF4444',
        shadow: '#FF4444',
      };
    case 'green':
      return {
        ...baseColors,
        gradient: ['#1A2E1A', '#2A3E2A', '#1A2E1A'],
        border: '#32CD32',
        shadow: '#32CD32',
      };
    case 'celestial':
      return {
        ...baseColors,
        gradient: ['#1A1F2E', '#2A2F3E', '#1A1F2E'],
        border: '#87CEEB',
        shadow: '#87CEEB',
      };
    case 'snow':
      return {
        ...baseColors,
        gradient: ['#1F1F2E', '#2F2F3E', '#1F1F2E'],
        border: '#E6F3FF',
        shadow: '#E6F3FF',
      };
    default:
      return baseColors;
  }
};

const getVariantIcon = (variant: string): string => {
  switch (variant) {
    case 'gold': return '✨';
    case 'red': return '🎄';
    case 'green': return '🌲';
    case 'celestial': return '⭐';
    case 'snow': return '❄️';
    default: return '🎄';
  }
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  cardContainer: {
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  elevated: {
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 16,
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 100,
    height: '100%',
    overflow: 'hidden',
  },
  shimmer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  header: {
    marginBottom: 16,
    zIndex: 2,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  decorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  cornerDecoration: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  topLeft: {
    top: 10,
    left: 10,
  },
  topRight: {
    top: 10,
    right: 10,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
  particle1: {
    top: 30,
    left: 30,
  },
  particle2: {
    top: 50,
    right: 40,
  },
  particle3: {
    bottom: 30,
    left: 20,
  },
  iconContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  icon: {
    position: 'absolute',
    fontSize: 24,
    opacity: 0.1,
  },
  iconTopLeft: {
    top: 15,
    left: 15,
  },
  iconBottomRight: {
    bottom: 15,
    right: 15,
  },
  fallbackCard: {
    marginVertical: 8,
    elevation: 4,
  },
});

export default EnhancedChristmasCard;
