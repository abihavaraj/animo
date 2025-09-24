import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface EidHennaPatternsProps {
  style?: any;
  animated?: boolean;
}

interface Pattern {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
}

export const EidHennaPatterns: React.FC<EidHennaPatternsProps> = ({ 
  style, 
  animated = true 
}) => {
  const { eidColors, isEidMubarakTheme } = useEidMubarakTheme();
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const patterns = useRef<Pattern[]>([]);

  useEffect(() => {
    if (!isEidMubarakTheme || !animated) return;

    // Initialize patterns
    patterns.current = Array.from({ length: 6 }, (_, index) => ({
      id: index,
      x: new Animated.Value(Math.random() * screenWidth),
      y: new Animated.Value(Math.random() * screenHeight),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      rotation: new Animated.Value(0),
    }));

    // Animate each pattern
    patterns.current.forEach((pattern, index) => {
      const delay = index * 500; // Stagger the animations

      // Fade in
      Animated.timing(pattern.opacity, {
        toValue: 0.6,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }).start();

      // Scale up
      Animated.timing(pattern.scale, {
        toValue: 1,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }).start();

      // Continuous rotation
      const rotateAnimation = Animated.loop(
        Animated.timing(pattern.rotation, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );

      // Start rotation with delay
      setTimeout(() => {
        rotateAnimation.start();
      }, delay);

      // Gentle floating animation
      const floatAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pattern.y, {
            toValue: pattern.y._value - 30,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(pattern.y, {
            toValue: pattern.y._value + 30,
            duration: 4000,
            useNativeDriver: true,
          }),
        ])
      );

      setTimeout(() => {
        floatAnimation.start();
      }, delay + 1000);
    });

    return () => {
      patterns.current.forEach(pattern => {
        pattern.x.stopAnimation();
        pattern.y.stopAnimation();
        pattern.opacity.stopAnimation();
        pattern.scale.stopAnimation();
        pattern.rotation.stopAnimation();
      });
    };
  }, [isEidMubarakTheme, animated, screenWidth, screenHeight]);

  if (!isEidMubarakTheme || !eidColors) {
    return null;
  }

  const getPatternShape = (index: number) => {
    const shapes = ['circle', 'diamond', 'flower', 'spiral', 'wave', 'star'];
    return shapes[index % shapes.length];
  };

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {patterns.current.map((pattern, index) => {
        const rotation = pattern.rotation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        const patternShape = getPatternShape(index);

        return (
          <Animated.View
            key={pattern.id}
            style={[
              styles.pattern,
              {
                left: pattern.x,
                top: pattern.y,
                opacity: pattern.opacity,
                transform: [
                  { scale: pattern.scale },
                  { rotate: rotation },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.patternShape,
                {
                  backgroundColor: eidColors.henna,
                  borderRadius: patternShape === 'circle' ? 15 : 0,
                  transform: patternShape === 'diamond' ? [{ rotate: '45deg' }] : [],
                },
              ]}
            >
              {patternShape === 'flower' && (
                <View style={styles.flowerCenter}>
                  <View style={[styles.petal, { backgroundColor: eidColors.gold }]} />
                  <View style={[styles.petal, { backgroundColor: eidColors.gold }]} />
                  <View style={[styles.petal, { backgroundColor: eidColors.gold }]} />
                  <View style={[styles.petal, { backgroundColor: eidColors.gold }]} />
                </View>
              )}
              {patternShape === 'spiral' && (
                <View style={styles.spiral}>
                  <View style={[styles.spiralLine, { backgroundColor: eidColors.gold }]} />
                  <View style={[styles.spiralLine, { backgroundColor: eidColors.gold }]} />
                  <View style={[styles.spiralLine, { backgroundColor: eidColors.gold }]} />
                </View>
              )}
            </View>
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
  pattern: {
    position: 'absolute',
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternShape: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowerCenter: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  petal: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spiral: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spiralLine: {
    position: 'absolute',
    width: 2,
    height: 15,
    borderRadius: 1,
  },
});

export default EidHennaPatterns;
