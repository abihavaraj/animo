import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Heart {
  id: number;
  left: Animated.Value;
  top: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotateY: Animated.Value;
}

const RainingHearts: React.FC = () => {
  const { currentTheme } = useTheme();
  const heartsRef = useRef<Heart[]>([]);
  const animationRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Create hearts with random positions and animations
  const createHeart = (id: number): Heart => {
    return {
      id,
      left: new Animated.Value(Math.random() * (screenWidth - 40)),
      top: new Animated.Value(-50),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5 + Math.random() * 0.8),
      rotateY: new Animated.Value(0),
    };
  };

  // Initialize hearts
  useEffect(() => {
    // Create initial hearts for Women's Day theme
    const newHearts = Array.from({ length: 4 }, (_, i) => createHeart(i));
    heartsRef.current = newHearts;
    // Hearts created successfully

    // Start the raining animation
    const startRaining = () => {
      // Only animate if Women's Day theme is active
      if (currentTheme?.name !== 'womens_day') {
        return;
      }
      
      heartsRef.current.forEach((heart, index) => {
        const animateHeart = () => {
          // Reset position to random spot across screen width
          const startX = Math.random() * (screenWidth - 40);
          heart.left.setValue(startX);
          heart.top.setValue(-50);
          heart.opacity.setValue(0);

          // Random delay for each heart
          const delay = Math.random() * 3000;
          
          setTimeout(() => {
            // Start falling animation - stop at middle of screen
            Animated.parallel([
              Animated.timing(heart.top, {
                toValue: screenHeight / 2, // Stop at middle instead of going off screen
                duration: 4000 + Math.random() * 2000, // Shorter duration since less distance
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(heart.opacity, {
                  toValue: 0.8,
                  duration: 800,
                  useNativeDriver: true,
                }),
                Animated.timing(heart.opacity, {
                  toValue: 0, // Disappear completely when reaching middle
                  duration: 1000,
                  useNativeDriver: true,
                }),
              ]),
              // Gentle swaying motion - use small relative movements
              Animated.loop(
                Animated.sequence([
                  Animated.timing(heart.left, {
                    toValue: startX + 30,
                    duration: 2000,
                    useNativeDriver: true,
                  }),
                  Animated.timing(heart.left, {
                    toValue: startX - 30,
                    duration: 2000,
                    useNativeDriver: true,
                  }),
                  Animated.timing(heart.left, {
                    toValue: startX,
                    duration: 2000,
                    useNativeDriver: true,
                  }),
                ]),
                { iterations: 3 } // Limited iterations so it doesn't sway forever
              ),
              // Rotation animation
              Animated.loop(
                Animated.timing(heart.rotateY, {
                  toValue: 360,
                  duration: 4000,
                  useNativeDriver: true,
                }),
                { iterations: 1 } // Just one rotation
              ),
            ]).start(() => {
              // Restart the animation for this heart after a longer delay
              setTimeout(animateHeart, 4000 + Math.random() * 4000);
            });
          }, delay);
        };

        animateHeart();
      });
    };

    startRaining();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [currentTheme]);

  // Hearts will only animate during Women's Day theme

  const heartColors = ['💖', '💗', '💓', '💕'];

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1, // Lower z-index to avoid interfering with UI
      pointerEvents: 'none',
      backgroundColor: 'transparent',
    }}>
      {heartsRef.current.map((heart, index) => (
        <Animated.View
          key={heart.id}
          style={{
            position: 'absolute',
            transform: [
              { translateX: heart.left },
              { translateY: heart.top },
              { scale: heart.scale },
              {
                rotateY: heart.rotateY.interpolate({
                  inputRange: [0, 360],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
            opacity: heart.opacity,
          }}
        >
          <Text
            style={{
              fontSize: 28,
              color: '#D4719A', // Women's Day theme heart color
              textShadowColor: 'rgba(212, 113, 154, 0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {heartColors[index % heartColors.length]}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
};

export default RainingHearts;