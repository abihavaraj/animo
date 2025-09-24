import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface EidCelebrationParticlesProps {
  count?: number;
  style?: any;
  animated?: boolean;
}

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  color: string;
}

export const EidCelebrationParticles: React.FC<EidCelebrationParticlesProps> = ({ 
  count = 12, 
  style, 
  animated = true 
}) => {
  const { eidColors, isEidMubarakTheme } = useEidMubarakTheme();
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const particles = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isEidMubarakTheme || !animated) return;

    // Initialize particles
    particles.current = Array.from({ length: count }, (_, index) => ({
      id: index,
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(Math.random() * screenHeight),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      rotation: new Animated.Value(0),
      color: index % 3 === 0 ? eidColors.gold : index % 3 === 1 ? eidColors.silver : eidColors.celebration,
    }));

    // Animate each particle
    particles.current.forEach((particle, index) => {
      const delay = index * 100; // Stagger the animations

      // Fade in
      Animated.timing(particle.opacity, {
        toValue: 1,
        duration: 1000,
        delay,
        useNativeDriver: true,
      }).start();

      // Scale up
      Animated.timing(particle.scale, {
        toValue: 1,
        duration: 1000,
        delay,
        useNativeDriver: true,
      }).start();

      // Continuous floating animation
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(particle.y, {
            toValue: particle.y._value - 100,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: particle.y._value + 100,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      );

      // Continuous rotation
      const rotateAnimation = Animated.loop(
        Animated.timing(particle.rotation, {
          toValue: 1,
          duration: 3000,
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
          Animated.timing(particle.opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(particle.opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );

      setTimeout(() => {
        twinkleAnimation.start();
      }, delay + 1000);
    });

    return () => {
      particles.current.forEach(particle => {
        particle.x.stopAnimation();
        particle.y.stopAnimation();
        particle.opacity.stopAnimation();
        particle.scale.stopAnimation();
        particle.rotation.stopAnimation();
      });
    };
  }, [isEidMubarakTheme, animated, count, screenWidth, screenHeight, eidColors]);

  if (!isEidMubarakTheme || !eidColors) {
    return null;
  }

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {particles.current.map((particle) => {
        const rotation = particle.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                left: particle.x,
                top: particle.y,
                opacity: particle.opacity,
                transform: [
                  { scale: particle.scale },
                  { rotate: rotation },
                ],
                backgroundColor: particle.color,
              },
            ]}
          >
            <View style={styles.particleInner} />
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
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default EidCelebrationParticles;
