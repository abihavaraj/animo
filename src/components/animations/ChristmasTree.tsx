import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface OrnamentProps {
  color: string;
  size: number;
  position: { x: number; y: number };
  delay: number;
}

const Ornament: React.FC<OrnamentProps> = ({ color, size, position, delay }) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      scale.value = withSequence(
        withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) }),
        withRepeat(
          withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        )
      );
      
      rotate.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View 
      style={[
        styles.ornament, 
        animatedStyle,
        {
          left: position.x,
          top: position.y,
          width: size,
          height: size,
        }
      ]}
    >
      <View style={[styles.ornamentShape, { backgroundColor: color }]} />
      <View style={[styles.ornamentHighlight]} />
    </Animated.View>
  );
};

interface ChristmasTreeProps {
  size?: 'small' | 'medium' | 'large';
  showOrnaments?: boolean;
}

const ChristmasTree: React.FC<ChristmasTreeProps> = ({ 
  size = 'medium',
  showOrnaments = true 
}) => {
  const treeScale = useSharedValue(0);
  const starScale = useSharedValue(0);
  const starRotate = useSharedValue(0);

  const treeSize = size === 'small' ? 80 : size === 'medium' ? 120 : 160;
  const ornaments = [
    { color: '#FF6B6B', size: 8, position: { x: 45, y: 60 }, delay: 500 },
    { color: '#4ECDC4', size: 6, position: { x: 25, y: 80 }, delay: 800 },
    { color: '#FFEAA7', size: 7, position: { x: 65, y: 85 }, delay: 1100 },
    { color: '#DDA0DD', size: 5, position: { x: 35, y: 100 }, delay: 1400 },
    { color: '#96CEB4', size: 6, position: { x: 55, y: 105 }, delay: 1700 },
    { color: '#FFB347', size: 8, position: { x: 15, y: 120 }, delay: 2000 },
    { color: '#87CEEB', size: 7, position: { x: 75, y: 125 }, delay: 2300 },
  ];

  useEffect(() => {
    // Tree entrance animation
    treeScale.value = withTiming(1, { 
      duration: 1000, 
      easing: Easing.out(Easing.back(1.2)) 
    });

    // Star animation
    const starTimer = setTimeout(() => {
      starScale.value = withSequence(
        withTiming(1, { duration: 500, easing: Easing.out(Easing.back(2)) }),
        withRepeat(
          withTiming(1.2, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        )
      );
      
      starRotate.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
    }, 300);

    return () => clearTimeout(starTimer);
  }, []);

  const treeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: treeScale.value }],
  }));

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: starScale.value },
      { rotate: `${starRotate.value}deg` },
    ],
  }));

  return (
    <View style={[styles.container, { width: treeSize, height: treeSize }]}>
      <Animated.View style={[styles.tree, treeAnimatedStyle]}>
        {/* Tree layers */}
        <View style={[styles.treeLayer, styles.treeLayer1]} />
        <View style={[styles.treeLayer, styles.treeLayer2]} />
        <View style={[styles.treeLayer, styles.treeLayer3]} />
        
        {/* Tree trunk */}
        <View style={styles.trunk} />
        
        {/* Star */}
        <Animated.View style={[styles.star, starAnimatedStyle]}>
          <View style={styles.starShape} />
        </Animated.View>
      </Animated.View>

      {/* Ornaments */}
      {showOrnaments && ornaments.map((ornament, index) => (
        <Ornament
          key={index}
          color={ornament.color}
          size={ornament.size}
          position={ornament.position}
          delay={ornament.delay}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tree: {
    position: 'relative',
    alignItems: 'center',
  },
  treeLayer: {
    position: 'absolute',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  treeLayer1: {
    width: 60,
    height: 60,
    borderTopWidth: 60,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#228B22',
    top: 40,
  },
  treeLayer2: {
    width: 80,
    height: 80,
    borderTopWidth: 80,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#32CD32',
    top: 20,
  },
  treeLayer3: {
    width: 100,
    height: 100,
    borderTopWidth: 100,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#228B22',
    top: 0,
  },
  trunk: {
    width: 12,
    height: 20,
    backgroundColor: '#8B4513',
    position: 'absolute',
    top: 100,
    borderRadius: 2,
  },
  star: {
    position: 'absolute',
    top: -10,
    zIndex: 10,
  },
  starShape: {
    width: 20,
    height: 20,
    backgroundColor: '#FFD700',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  ornament: {
    position: 'absolute',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  ornamentShape: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  ornamentHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: '30%',
    height: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 50,
  },
});

export default ChristmasTree;
