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
import ChristmasLights from './animations/ChristmasLights';
import ChristmasSnow from './animations/ChristmasSnow';

interface AdvancedChristmasWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showParticles?: boolean;
  showGradient?: boolean;
  showBorder?: boolean;
}

const AdvancedChristmasWrapper: React.FC<AdvancedChristmasWrapperProps> = ({
  children,
  style,
  showParticles = true,
  showGradient = true,
  showBorder = true,
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
  
  const christmasVariant = 'gold';
  const shimmer = useSharedValue(0);

  React.useEffect(() => {
    if (isChristmasTheme) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }
  }, [isChristmasTheme, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.3 + 0.1,
  }));

  // If not Christmas theme, return children without wrapper
  if (!isChristmasTheme) {
    return <>{children}</>;
  }

  const gradientColors = [
    christmasColors.background,
    christmasColors.background + 'E6',
    christmasColors.background + 'CC',
    christmasColors.background,
  ] as const;

  const borderGradient = [
    christmasColors.primary + '80',
    christmasColors.accent + '80',
    christmasColors.primary + '80',
  ] as const;

  return (
    <View style={[styles.container, { backgroundColor: christmasColors.background }, style]}>
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

      {/* Christmas Lights */}
      <ChristmasLights
        colors={christmasColors.lights}
        intensity="bright"
      />

      {/* Main Content with Dark Theme */}
      <View style={[styles.content, { backgroundColor: 'transparent' }]}>
        {children}
      </View>

      {/* Christmas Snow with better visibility */}
      <ChristmasSnow
        intensity="medium"
        color={christmasColors.snow}
      />

      {/* Floating Particles */}
      {showParticles && (
        <View style={styles.particlesContainer} pointerEvents="none">
          {[...Array(8)].map((_, index) => (
            <FloatingParticle
              key={index}
              color={christmasColors.accent}
              delay={index * 500}
              variant={christmasVariant}
            />
          ))}
        </View>
      )}

      {/* Corner Decorations */}
      <View style={styles.cornerDecorations} pointerEvents="none">
        <View style={[styles.cornerTopLeft, { backgroundColor: christmasColors.primary + '30' }]} />
        <View style={[styles.cornerTopRight, { backgroundColor: christmasColors.accent + '30' }]} />
        <View style={[styles.cornerBottomLeft, { backgroundColor: christmasColors.accent + '30' }]} />
        <View style={[styles.cornerBottomRight, { backgroundColor: christmasColors.primary + '30' }]} />
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
    switch (variant) {
      case 'gold': return '✨';
      case 'red': return '🎄';
      case 'green': return '🌟';
      case 'snow': return '❄️';
      case 'celestial': return '⭐';
      default: return '✨';
    }
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
    fontSize: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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

export default AdvancedChristmasWrapper;
