import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface EidCrescentMoonProps {
  size?: number;
  style?: any;
  animated?: boolean;
}

export const EidCrescentMoon: React.FC<EidCrescentMoonProps> = ({ 
  size = 60, 
  style, 
  animated = true 
}) => {
  const { eidColors, isEidMubarakTheme } = useEidMubarakTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isEidMubarakTheme || !animated) return;

    // Rotation animation
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );

    // Scale animation (gentle pulsing)
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );

    rotateAnimation.start();
    scaleAnimation.start();
    glowAnimation.start();

    return () => {
      rotateAnimation.stop();
      scaleAnimation.stop();
      glowAnimation.stop();
    };
  }, [isEidMubarakTheme, animated, rotateAnim, scaleAnim, glowAnim]);

  if (!isEidMubarakTheme || !eidColors) {
    return null;
  }

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowAnim;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Glow effect */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 1.5,
            height: size * 1.5,
            borderRadius: size * 0.75,
            backgroundColor: eidColors.crescent,
            opacity: glowOpacity,
          },
        ]}
      />
      
      {/* Crescent moon */}
      <Animated.View
        style={[
          styles.crescent,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: eidColors.crescent,
            transform: [
              { rotate },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Inner shadow for crescent effect */}
        <View
          style={[
            styles.crescentShadow,
            {
              width: size * 0.7,
              height: size * 0.7,
              borderRadius: size * 0.35,
              backgroundColor: eidColors.background,
            },
          ]}
        />
        
        {/* Star decoration */}
        <View
          style={[
            styles.star,
            {
              width: size * 0.15,
              height: size * 0.15,
              backgroundColor: eidColors.star,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crescent: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  crescentShadow: {
    position: 'absolute',
    top: '15%',
    left: '15%',
  },
  star: {
    position: 'absolute',
    top: '20%',
    right: '20%',
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
});

export default EidCrescentMoon;
