import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface ChristmasFlipWelcomeTextProps {
  firstName: string;
  style?: any;
}

const ChristmasFlipWelcomeText: React.FC<ChristmasFlipWelcomeTextProps> = ({
  firstName,
  style,
}) => {
  const { t } = useTranslation();
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
  const flipAnimation = useSharedValue(0);
  const glowAnimation = useSharedValue(0);
  const sparkleAnimation = useSharedValue(0);

  useEffect(() => {
    if (isChristmasTheme) {
      // Start the flip animation after a brief delay
      flipAnimation.value = withDelay(
        2000, // Wait 2 seconds before starting
        withRepeat(
          withSequence(
            // Flip to show "From ANIMO"
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.back(1.5)) }),
            // Hold for 2.5 seconds
            withTiming(1, { duration: 2500 }),
            // Flip back to welcome message
            withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.back(1.5)) }),
            // Hold for 4 seconds before repeating
            withTiming(0, { duration: 4000 })
          ),
          -1, // Repeat indefinitely
          false
        )
      );

      // Glow animation
      glowAnimation.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );

      // Sparkle animation
      sparkleAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0, { duration: 1000 })
        ),
        -1,
        false
      );
    }
  }, [isChristmasTheme, firstName]);

  const frontTextStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 0.5, 1], [0, 90, 180]);
    const opacity = interpolate(flipAnimation.value, [0, 0.4, 0.6, 1], [1, 1, 0, 0]);
    const scale = interpolate(flipAnimation.value, [0, 0.2, 0.8, 1], [1, 1.05, 1.05, 1]);
    
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` },
        { scale }
      ],
      opacity,
      position: 'absolute',
      width: '100%',
    };
  });

  const backTextStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 0.5, 1], [180, 90, 0]);
    const opacity = interpolate(flipAnimation.value, [0, 0.4, 0.6, 1], [0, 0, 1, 1]);
    const scale = interpolate(flipAnimation.value, [0, 0.2, 0.8, 1], [1, 1, 1.05, 1]);
    
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateY}deg` },
        { scale }
      ],
      opacity,
      position: 'absolute',
      width: '100%',
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowAnimation.value * 0.3 + 0.1,
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleAnimation.value,
    transform: [{ scale: sparkleAnimation.value * 0.2 + 0.8 }],
  }));

  if (!isChristmasTheme) {
    // Fallback to regular text if not Christmas theme
    return (
      <View style={[styles.container, style]}>
        <Text variant="headlineLarge" style={[styles.fallbackWelcome, { color: christmasColors.text }]}>
          Welcome back, {firstName}!
        </Text>
        <Text variant="bodyLarge" style={[styles.fallbackFrom, { color: christmasColors.textSecondary }]}>
          From ANIMO
        </Text>
      </View>
    );
  }

  const getGradientColors = () => {
    switch (christmasVariant) {
      case 'gold':
        return ['#FFD700', '#FFA500', '#FFD700'];
      case 'red':
        return ['#FF6B6B', '#DC143C', '#FF6B6B'];
      case 'green':
        return ['#32CD32', '#228B22', '#32CD32'];
      case 'celestial':
        return ['#87CEEB', '#4682B4', '#87CEEB'];
      case 'snow':
        return ['#F0F8FF', '#E6F3FF', '#F0F8FF'];
      default:
        return ['#FFD700', '#FFA500', '#FFD700'];
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Glow Effect Background */}
      <Animated.View style={[styles.glowBackground, glowStyle]}>
        <LinearGradient
          colors={[...getGradientColors().map(color => color + '20')]}
          style={styles.glowGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Sparkle Effects */}
      <Animated.View style={[styles.sparkleContainer, sparkleStyle]} pointerEvents="none">
        <Text style={[styles.sparkle, styles.sparkle1]}>✨</Text>
        <Text style={[styles.sparkle, styles.sparkle2]}>⭐</Text>
        <Text style={[styles.sparkle, styles.sparkle3]}>🌟</Text>
        <Text style={[styles.sparkle, styles.sparkle4]}>✨</Text>
      </Animated.View>

      {/* Front side - Welcome message */}
      <Animated.View style={frontTextStyle}>
        <LinearGradient
          colors={getGradientColors()}
          style={styles.textGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.textContainer}>
                         <Text
               variant="headlineMedium"
               style={styles.welcomeText}
             >
               🎄 {t('dashboard.welcomeBack')},
             </Text>
             <Text
               variant="bodyLarge"
               style={styles.nameText}
             >
               {firstName}! ✨
             </Text>
             <Text
               variant="bodySmall"
               style={styles.wishText}
             >
               {t('dashboard.christmasWish')} 🌟
             </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Back side - From ANIMO */}
      <Animated.View style={backTextStyle}>
        <LinearGradient
          colors={getGradientColors()}
          style={styles.textGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.textContainer}>
                         <Text
               variant="bodyLarge"
               style={styles.fromText}
             >
               🎄 With magic from
             </Text>
             <Text
               variant="headlineMedium"
               style={styles.animoText}
             >
               ANIMO ✨
             </Text>
             <Text
               variant="bodySmall"
               style={styles.wishText}
             >
               Wishing you joy! 🌟
             </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  glowBackground: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 20,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 20,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
  },
  sparkle1: {
    top: 10,
    left: 20,
  },
  sparkle2: {
    top: 20,
    right: 30,
  },
  sparkle3: {
    bottom: 15,
    left: 30,
  },
  sparkle4: {
    bottom: 25,
    right: 20,
  },
  textGradient: {
    borderRadius: 15,
    padding: 10,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    paddingHorizontal: 16,
  },
  welcomeText: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  nameText: {
    fontWeight: '700',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  fromText: {
    fontWeight: '300',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
    opacity: 0.9,
  },
  animoText: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
    fontSize: 24,
  },
  fallbackWelcome: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackFrom: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  wishText: {
    fontWeight: '400',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginTop: 2,
    fontStyle: 'italic',
    opacity: 0.95,
    letterSpacing: 0.5,
    fontSize: 12,
  },
});

export default ChristmasFlipWelcomeText;