import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeColor } from '../../hooks/useDynamicThemeColor';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingIconProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  delay: number;
  duration: number;
  startX: number;
  startY: number;
  endY: number;
  size: number;
  color: string;
}

const FloatingIcon: React.FC<FloatingIconProps> = ({
  icon,
  delay,
  duration,
  startX,
  startY,
  endY,
  size,
  color
}) => {
  const translateY = useRef(new Animated.Value(startY)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = () => {
      // Reset animation
      translateY.setValue(startY);
      opacity.setValue(0);
      scale.setValue(0.5);

      // Start animation sequence
      Animated.sequence([
        // Fade in and scale up
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 1000,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1000,
            delay,
            useNativeDriver: true,
          }),
        ]),
        // Float upward
        Animated.timing(translateY, {
          toValue: endY,
          duration: duration,
          useNativeDriver: true,
        }),
        // Fade out
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Restart animation after a pause
        setTimeout(animate, 2000 + Math.random() * 3000);
      });
    };

    animate();
  }, [translateY, opacity, scale, delay, duration, startY, endY]);

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          left: startX,
          transform: [
            { translateY },
            { scale }
          ],
          opacity,
        },
      ]}
    >
      <MaterialIcons name={icon} size={size} color={color} />
    </Animated.View>
  );
};

export const WomensDayFloatingElements: React.FC = () => {
  const { currentTheme } = useTheme();
  const accentColor = useThemeColor({}, 'accent');
  const primaryColor = useThemeColor({}, 'primary');
  
  const isWomensDayTheme = currentTheme?.name === 'womens_day';
  
  if (!isWomensDayTheme) {
    return null;
  }

  const icons: Array<{
    icon: keyof typeof MaterialIcons.glyphMap;
    color: string;
    size: number;
  }> = [
    { icon: 'favorite', color: accentColor + '70', size: 16 },
    { icon: 'local-florist', color: primaryColor + '60', size: 14 },
    { icon: 'spa', color: accentColor + '50', size: 12 },
    { icon: 'eco', color: primaryColor + '40', size: 10 },
    { icon: 'favorite', color: accentColor + '30', size: 8 },
    { icon: 'local-florist', color: primaryColor + '50', size: 12 },
  ];

  return (
    <View style={styles.container} pointerEvents="none">
      {icons.map((iconData, index) => (
        <FloatingIcon
          key={index}
          icon={iconData.icon}
          delay={index * 800 + Math.random() * 1000}
          duration={8000 + Math.random() * 4000}
          startX={Math.random() * (screenWidth - 40)}
          startY={screenHeight + 20}
          endY={-50}
          size={iconData.size}
          color={iconData.color}
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
    zIndex: -1,
  },
  floatingIcon: {
    position: 'absolute',
  },
});
