import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

interface AdvancedPinkOctoberWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showParticles?: boolean;
  showGradient?: boolean;
  showBorder?: boolean;
}

const AdvancedPinkOctoberWrapper: React.FC<AdvancedPinkOctoberWrapperProps> = ({
  children,
  style,
  showParticles = true,
  showGradient = true,
  showBorder = true,
}) => {
  const { currentTheme } = useTheme();
  
  // Check if current theme is Pink October
  const isPinkOctoberTheme = currentTheme && (
    currentTheme.name?.toLowerCase().includes('pink_october') ||
    currentTheme.display_name?.toLowerCase().includes('pink october') ||
    currentTheme.display_name?.includes('🌸') ||
    currentTheme.display_name?.includes('Pink October')
  );
  
  // Pink October colors
  const pinkOctoberColors = {
    background: '#FCE4EC',
    surface: '#FFFFFF',
    primary: '#E91E63',
    accent: '#C2185B',
    text: '#1A1A1A',
    textSecondary: '#E91E63',
    ribbon: '#E91E63',
    awareness: '#C2185B',
    hope: '#F8BBD9',
    strength: '#AD1457',
    support: '#F48FB1'
  };
  
  const pinkOctoberVariant = 'default';
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    if (isPinkOctoberTheme) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }
  }, [isPinkOctoberTheme, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.3 + 0.1,
  }));

  // If not Pink October theme, return children without wrapper
  if (!isPinkOctoberTheme) {
    return <>{children}</>;
  }

  const gradientColors = [
    pinkOctoberColors.background,
    pinkOctoberColors.background + 'E6',
    pinkOctoberColors.background + 'CC',
    pinkOctoberColors.background,
  ] as const;

  const borderGradient = [
    pinkOctoberColors.primary + '80',
    pinkOctoberColors.accent + '80',
    pinkOctoberColors.primary + '80',
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: pinkOctoberColors.background }, style]}>
      {/* Background Gradient */}
      {showGradient && (
        <LinearGradient
          colors={gradientColors}
          style={styles.backgroundGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Animated Border */}
      {showBorder && (
        <Animated.View style={[styles.borderContainer, shimmerStyle]}>
          <LinearGradient
            colors={borderGradient}
            style={styles.topBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
          <LinearGradient
            colors={borderGradient}
            style={styles.bottomBorder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      )}

      {/* Main Content */}
      <View style={[styles.content, { backgroundColor: 'transparent' }]}>
        {children}
      </View>

      {/* Floating Awareness Particles */}
      {showParticles && (
        <View style={styles.particlesContainer} pointerEvents="none">
          {[...Array(12)].map((_, index) => (
            <FloatingParticle
              key={index}
              color={pinkOctoberColors.ribbon}
              delay={index * 300}
              variant={pinkOctoberVariant}
            />
          ))}
        </View>
      )}

      {/* Corner Decorations */}
      <View style={styles.cornerDecorations} pointerEvents="none">
        <View style={[styles.cornerTopLeft, { backgroundColor: pinkOctoberColors.primary + '30' }]} />
        <View style={[styles.cornerTopRight, { backgroundColor: pinkOctoberColors.accent + '30' }]} />
        <View style={[styles.cornerBottomLeft, { backgroundColor: pinkOctoberColors.accent + '30' }]} />
        <View style={[styles.cornerBottomRight, { backgroundColor: pinkOctoberColors.primary + '30' }]} />
      </View>
    </View>
  );
};

interface FloatingParticleProps {
  color: string;
  delay: number;
  variant: string;
}

const FloatingParticle: React.FC<FloatingParticleProps> = ({ color, delay, variant }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      scale.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.sin) }),
        -1,
        true
      );
      
      translateY.value = withRepeat(
        withTiming(-20, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      
      translateX.value = withRepeat(
        withTiming(10, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      
      rotate.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const getParticleIcon = () => {
    const icons = ['🌸', '💗', '✨', '💪', '🤝', '❤️', '🎀', '💕'];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: Math.random() * 300,
          top: Math.random() * 400 + 100,
        },
      ]}
    >
      <View style={[styles.particleIcon, { shadowColor: color }]}>
        <Animated.Text style={[styles.particleText, { color }]}>
          {getParticleIcon()}
        </Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  borderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    pointerEvents: 'none',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
  },
  particle: {
    position: 'absolute',
    zIndex: 500,
  },
  particleIcon: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  particleText: {
    fontSize: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cornerDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
    pointerEvents: 'none',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomRightRadius: 20,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomLeftRadius: 20,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopRightRadius: 20,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopLeftRadius: 20,
  },
});

export default AdvancedPinkOctoberWrapper;
