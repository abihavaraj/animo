import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface EidLanternGlowProps {
  size?: number;
  style?: any;
  animated?: boolean;
}

export const EidLanternGlow: React.FC<EidLanternGlowProps> = ({ 
  size = 80, 
  style, 
  animated = true 
}) => {
  const { eidColors, isEidMubarakTheme } = useEidMubarakTheme();
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isEidMubarakTheme || !animated) return;

    // Glow animation
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );

    // Scale animation (gentle swaying)
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    // Rotation animation (gentle swaying)
    const rotationAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(rotationAnim, {
          toValue: -1,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    glowAnimation.start();
    scaleAnimation.start();
    rotationAnimation.start();

    return () => {
      glowAnimation.stop();
      scaleAnimation.stop();
      rotationAnimation.stop();
    };
  }, [isEidMubarakTheme, animated, glowAnim, scaleAnim, rotationAnim]);

  if (!isEidMubarakTheme || !eidColors) {
    return null;
  }

  const rotation = rotationAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: size * 0.9,
            backgroundColor: eidColors.lantern,
            opacity: glowAnim,
          },
        ]}
      />
      
      {/* Middle glow */}
      <Animated.View
        style={[
          styles.middleGlow,
          {
            width: size * 1.4,
            height: size * 1.4,
            borderRadius: size * 0.7,
            backgroundColor: eidColors.lantern,
            opacity: glowAnim,
          },
        ]}
      />
      
      {/* Lantern */}
      <Animated.View
        style={[
          styles.lantern,
          {
            width: size,
            height: size,
            borderRadius: size * 0.1,
            backgroundColor: eidColors.lantern,
            transform: [
              { scale: scaleAnim },
              { rotate: rotation },
            ],
          },
        ]}
      >
        {/* Lantern pattern */}
        <View style={styles.lanternPattern}>
          <View style={[styles.patternLine, { backgroundColor: eidColors.gold }]} />
          <View style={[styles.patternLine, { backgroundColor: eidColors.gold }]} />
          <View style={[styles.patternLine, { backgroundColor: eidColors.gold }]} />
        </View>
        
        {/* Lantern icon */}
        <Text style={[styles.lanternIcon, { fontSize: size * 0.4, color: eidColors.gold }]}>
          🏮
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerGlow: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleGlow: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lantern: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  lanternPattern: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  patternLine: {
    width: '100%',
    height: 2,
    borderRadius: 1,
  },
  lanternIcon: {
    textAlign: 'center',
  },
});

export default EidLanternGlow;
