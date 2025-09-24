import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface EidFloatingStarsProps {
  count?: number;
  style?: any;
  animated?: boolean;
}

interface Star {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
}

export const EidFloatingStars: React.FC<EidFloatingStarsProps> = ({ 
  count = 8, 
  style, 
  animated = true 
}) => {
  const { eidColors, isEidMubarakTheme } = useEidMubarakTheme();
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const stars = useRef<Star[]>([]);

  useEffect(() => {
    if (!isEidMubarakTheme || !animated) return;

    // Initialize stars
    stars.current = Array.from({ length: count }, (_, index) => ({
      id: index,
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(Math.random() * screenHeight),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      rotation: new Animated.Value(0),
    }));

    // Animate each star
    stars.current.forEach((star, index) => {
      const delay = index * 200; // Stagger the animations

      // Fade in
      Animated.timing(star.opacity, {
        toValue: 1,
        duration: 1000,
        delay,
        useNativeDriver: true,
      }).start();

      // Scale up
      Animated.timing(star.scale, {
        toValue: 1,
        duration: 1000,
        delay,
        useNativeDriver: true,
      }).start();

      // Continuous floating animation
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(star.y, {
            toValue: star.y._value - 50,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(star.y, {
            toValue: star.y._value + 50,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );

      // Continuous rotation
      const rotateAnimation = Animated.loop(
        Animated.timing(star.rotation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      );

      // Start animations with delay
      setTimeout(() => {
        floatAnimation.start();
        rotateAnimation.start();
      }, delay);

      // Twinkling effect
      const twinkleAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(star.opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(star.opacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      setTimeout(() => {
        twinkleAnimation.start();
      }, delay + 2000);
    });

    return () => {
      stars.current.forEach(star => {
        star.x.stopAnimation();
        star.y.stopAnimation();
        star.opacity.stopAnimation();
        star.scale.stopAnimation();
        star.rotation.stopAnimation();
      });
    };
  }, [isEidMubarakTheme, animated, count, screenWidth, screenHeight]);

  if (!isEidMubarakTheme || !eidColors) {
    return null;
  }

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {stars.current.map((star) => {
        const rotation = star.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={star.id}
            style={[
              styles.star,
              {
                left: star.x,
                top: star.y,
                opacity: star.opacity,
                transform: [
                  { scale: star.scale },
                  { rotate: rotation },
                ],
                backgroundColor: eidColors.star,
              },
            ]}
          >
            <View style={styles.starInner} />
          </Animated.View>
        );
      })}
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
  },
  star: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default EidFloatingStars;
