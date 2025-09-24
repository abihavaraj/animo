import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface SnowflakeProps {
  size: number;
  delay: number;
  duration: number;
  startX: number;
}

const Snowflake: React.FC<SnowflakeProps> = ({ size, delay, duration, startX }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Start animation after delay
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 500 });
      translateY.value = withRepeat(
        withTiming(height + 100, { duration, easing: Easing.linear }),
        -1,
        false
      );
      
      // Gentle horizontal drift
      translateX.value = withRepeat(
        withTiming(startX + 30, { duration: duration * 2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, startX]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateY.value, [0, height], [0, 360]);
    
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.snowflake, animatedStyle]}>
      <View style={[styles.snowflakeShape, { width: size, height: size }]} />
    </Animated.View>
  );
};

interface ChristmasSnowProps {
  intensity?: 'light' | 'medium' | 'heavy';
  color?: string;
}

const ChristmasSnow: React.FC<ChristmasSnowProps> = ({ 
  intensity = 'medium',
  color = '#FFFFFF'
}) => {
  const snowflakes = useRef<Array<{
    size: number;
    delay: number;
    duration: number;
    startX: number;
  }>>([]);

  useEffect(() => {
    const count = intensity === 'light' ? 15 : intensity === 'medium' ? 25 : 40;
    
    snowflakes.current = Array.from({ length: count }, (_, i) => ({
      size: Math.random() * 8 + 4, // 4-12px
      delay: Math.random() * 3000, // 0-3s delay
      duration: Math.random() * 8000 + 5000, // 5-13s duration
      startX: Math.random() * width, // Random horizontal position
    }));
  }, [intensity]);

  return (
    <View style={styles.container} pointerEvents="none">
      {snowflakes.current.map((snowflake, index) => (
        <Snowflake
          key={index}
          size={snowflake.size}
          delay={snowflake.delay}
          duration={snowflake.duration}
          startX={snowflake.startX}
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
    bottom: 0,
    zIndex: 1000,
  },
  snowflake: {
    position: 'absolute',
  },
  snowflakeShape: {
    backgroundColor: '#FFFFFF',
    borderRadius: 50,
    shadowColor: '#87CEEB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
    // Enhanced border and glow for better visibility
    borderWidth: 1,
    borderColor: 'rgba(135, 206, 235, 0.8)',
    // Add inner glow effect
    shadowColor: '#E6F3FF',
  },
});

export default ChristmasSnow;
