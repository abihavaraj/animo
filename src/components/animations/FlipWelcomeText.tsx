import React, { useEffect } from 'react';
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

interface FlipWelcomeTextProps {
  firstName: string;
  textColor?: string;
  style?: any;
}

const FlipWelcomeText: React.FC<FlipWelcomeTextProps> = ({
  firstName,
  textColor = '#FFFFFF',
  style,
}) => {
  const flipAnimation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Start the flip animation after a brief delay
    const startAnimation = () => {
      flipAnimation.value = withDelay(
        1500, // Wait 1.5 seconds before starting
        withRepeat(
          withSequence(
            // Flip to show "From ANIMO"
            withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
            // Hold for 2 seconds
            withTiming(1, { duration: 2000 }),
            // Flip back to welcome message
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
            // Hold for 3 seconds before repeating
            withTiming(0, { duration: 3000 })
          ),
          -1, // Repeat indefinitely
          false
        )
      );
    };

    startAnimation();
  }, [firstName]);

  const frontTextStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 0.5, 1], [0, 90, 180]);
    const opacity = interpolate(flipAnimation.value, [0, 0.5, 1], [1, 0, 0]);
    
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` }
      ] as any,
      opacity,
      position: 'absolute' as const,
      width: '100%',
    };
  });

  const backTextStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(flipAnimation.value, [0, 0.5, 1], [180, 90, 0]);
    const opacity = interpolate(flipAnimation.value, [0, 0.5, 1], [0, 0, 1]);
    
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY}deg` }
      ] as any,
      opacity,
      position: 'absolute' as const,
      width: '100%',
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerStyle, style]}>
      {/* Front side - Welcome message */}
      <Animated.View style={frontTextStyle}>
        <View style={styles.textContainer}>
                     <Text
             variant="headlineMedium"
             style={[styles.welcomeText, { color: textColor }]}
           >
             ✨ Welcome back,
           </Text>
           <Text
             variant="bodyLarge"
             style={[styles.nameText, { color: textColor }]}
           >
             {firstName}! 🌟
           </Text>
           <Text
             variant="bodySmall"
             style={[styles.wishText, { color: textColor }]}
           >
             Your wellness journey continues... 💫
           </Text>
        </View>
      </Animated.View>

      {/* Back side - From ANIMO */}
      <Animated.View style={backTextStyle}>
        <View style={styles.textContainer}>
                     <Text
             variant="bodyLarge"
             style={[styles.fromText, { color: textColor }]}
           >
             ✨ With love from
           </Text>
           <Text
             variant="headlineMedium"
             style={[styles.animoText, { color: textColor }]}
           >
             ANIMO 🌟
           </Text>
           <Text
             variant="bodySmall"
             style={[styles.wishText, { color: textColor }]}
           >
             May your dreams come true! 💫
           </Text>
        </View>
      </Animated.View>
    </Animated.View>
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
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
  },
  nameText: {
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  fromText: {
    fontWeight: '300',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 4,
    opacity: 0.9,
  },
  animoText: {
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 2,
    fontSize: 24,
  },
  wishText: {
    fontWeight: '400',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginTop: 2,
    fontStyle: 'italic',
    opacity: 0.9,
    letterSpacing: 0.5,
    fontSize: 12,
  },
});

export default FlipWelcomeText;
