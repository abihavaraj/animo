import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface ChristmasHeaderProps {
  title: string;
  subtitle?: string;
  variant?: 'default' | 'gold' | 'red' | 'green' | 'snow';
  showLights?: boolean;
  showSnow?: boolean;
  style?: ViewStyle;
}

const ChristmasHeader: React.FC<ChristmasHeaderProps> = ({
  title,
  subtitle,
  variant = 'default',
  showLights = true,
  showSnow = false,
  style,
}) => {
  const theme = useTheme();
  const sparkle = useSharedValue(0);
  const glow = useSharedValue(0.5);

  React.useEffect(() => {
    // Sparkle animation
    sparkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    // Glow animation
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  const getVariantColors = () => {
    switch (variant) {
      case 'gold':
        return {
          primary: '#D4A574',
          secondary: '#B8860B',
          accent: '#FFD700',
          background: '#F8F6F3',
        };
      case 'red':
        return {
          primary: '#8B0000',
          secondary: '#B91C1C',
          accent: '#FF6B6B',
          background: '#FEF2F2',
        };
      case 'green':
        return {
          primary: '#2D5016',
          secondary: '#228B22',
          accent: '#32CD32',
          background: '#F8F6F3',
        };
      case 'snow':
        return {
          primary: '#2D5016',
          secondary: '#4A4A4A',
          accent: '#FFFFFF',
          background: '#F8F9FA',
        };
      default:
        return {
          primary: theme.colors.primary,
          secondary: theme.colors.primary,
          accent: theme.colors.accent,
          background: theme.colors.surface,
        };
    }
  };

  const colors = getVariantColors();

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: sparkle.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={[styles.container, style]}>
      {showLights && (
        <View style={styles.lightsContainer}>
          <View style={[styles.light, { backgroundColor: '#FF6B6B' }]} />
          <View style={[styles.light, { backgroundColor: '#4ECDC4' }]} />
          <View style={[styles.light, { backgroundColor: '#FFEAA7' }]} />
          <View style={[styles.light, { backgroundColor: '#DDA0DD' }]} />
          <View style={[styles.light, { backgroundColor: '#96CEB4' }]} />
          <View style={[styles.light, { backgroundColor: '#FFB347' }]} />
        </View>
      )}

      <LinearGradient
        colors={[colors.background, colors.primary + '20']}
        style={styles.header}
      >
        <View style={styles.titleContainer}>
          <Text variant="headlineLarge" style={[styles.title, { color: colors.primary }]}>
            {title}
          </Text>
          
          {subtitle && (
            <Text variant="titleMedium" style={[styles.subtitle, { color: colors.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Decorative elements */}
        <View style={styles.decorations}>
          <Animated.View style={[styles.sparkle, sparkleStyle]}>
            <Text style={[styles.sparkleText, { color: colors.accent }]}>✨</Text>
          </Animated.View>
          
          <Animated.View style={[styles.glow, glowStyle]}>
            <View style={[styles.glowCircle, { backgroundColor: colors.accent + '30' }]} />
          </Animated.View>
        </View>
      </LinearGradient>

      {showSnow && (
        <View style={styles.snowContainer}>
          <View style={[styles.snowflake, { top: 10, left: 30 }]} />
          <View style={[styles.snowflake, { top: 20, left: 80 }]} />
          <View style={[styles.snowflake, { top: 15, left: 120 }]} />
          <View style={[styles.snowflake, { top: 25, left: 200 }]} />
          <View style={[styles.snowflake, { top: 12, left: 250 }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 16,
  },
  lightsContainer: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  light: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  titleContainer: {
    alignItems: 'center',
    zIndex: 2,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.8,
  },
  decorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  sparkleText: {
    fontSize: 24,
  },
  glow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  glowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  snowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  snowflake: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ChristmasHeader;
