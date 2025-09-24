import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface LightProps {
  color: string;
  delay: number;
  position: number;
}

const ChristmasLight: React.FC<LightProps> = ({ color, delay, position }) => {
  const opacity = useSharedValue(0.3);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
      scale.value = withRepeat(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.light, animatedStyle, { left: position }]}>
      <View style={[styles.lightBulb, { backgroundColor: color }]} />
      <View style={[styles.lightGlow, { backgroundColor: color }]} />
    </Animated.View>
  );
};

interface ChristmasLightsProps {
  colors?: string[];
  intensity?: 'subtle' | 'medium' | 'bright';
}

const ChristmasLights: React.FC<ChristmasLightsProps> = ({ 
  colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
  intensity = 'medium'
}) => {
  const lights = useRef<Array<{
    color: string;
    delay: number;
    position: number;
  }>>([]);

  useEffect(() => {
    const lightCount = intensity === 'subtle' ? 8 : intensity === 'medium' ? 12 : 16;
    const spacing = width / lightCount;
    
    lights.current = Array.from({ length: lightCount }, (_, i) => ({
      color: colors[i % colors.length],
      delay: i * 200, // Staggered animation
      position: i * spacing + spacing / 2,
    }));
  }, [colors, intensity]);

  return (
    <View style={styles.container} pointerEvents="none">
      {lights.current.map((light, index) => (
        <ChristmasLight
          key={index}
          color={light.color}
          delay={light.delay}
          position={light.position}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    zIndex: 999,
  },
  light: {
    position: 'absolute',
    top: 20,
    width: 12,
    height: 12,
  },
  lightBulb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lightGlow: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    opacity: 0.3,
  },
});

export default ChristmasLights;
