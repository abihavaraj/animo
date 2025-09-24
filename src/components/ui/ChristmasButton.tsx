import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from 'react-native-reanimated';

interface ChristmasButtonProps {
  title: string;
  onPress: () => void;
  mode?: 'contained' | 'outlined' | 'text';
  variant?: 'default' | 'gold' | 'red' | 'green' | 'snow';
  style?: ViewStyle;
  labelStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
}

const ChristmasButton: React.FC<ChristmasButtonProps> = ({
  title,
  onPress,
  mode = 'contained',
  variant = 'default',
  style,
  labelStyle,
  disabled = false,
  loading = false,
  icon,
  size = 'medium',
}) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const sparkle = useSharedValue(0);

  const getVariantColors = () => {
    switch (variant) {
      case 'gold':
        return {
          primary: '#D4A574',
          secondary: '#B8860B',
          text: '#FFFFFF',
          border: '#D4A574',
        };
      case 'red':
        return {
          primary: '#8B0000',
          secondary: '#B91C1C',
          text: '#FFFFFF',
          border: '#8B0000',
        };
      case 'green':
        return {
          primary: '#2D5016',
          secondary: '#228B22',
          text: '#FFFFFF',
          border: '#2D5016',
        };
      case 'snow':
        return {
          primary: '#FFFFFF',
          secondary: '#F0F0F0',
          text: '#2D5016',
          border: '#E0E0E0',
        };
      default:
        return {
          primary: theme.colors.primary,
          secondary: theme.colors.primary,
          text: theme.colors.onPrimary,
          border: theme.colors.primary,
        };
    }
  };

  const colors = getVariantColors();

  const handlePress = () => {
    // Button press animation
    scale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 300 })
    );

    // Sparkle effect for special variants
    if (variant === 'gold' || variant === 'snow') {
      sparkle.value = withSequence(
        withSpring(1, { damping: 10, stiffness: 200 }),
        withSpring(0, { damping: 10, stiffness: 200 })
      );
    }

    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: sparkle.value }],
  }));

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      elevation: mode === 'contained' ? 4 : 0,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: mode === 'contained' ? 0.15 : 0,
      shadowRadius: 4,
    };

    if (mode === 'contained') {
      return {
        ...baseStyle,
        backgroundColor: colors.primary,
      };
    } else if (mode === 'outlined') {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.border,
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    }
  };

  const getLabelStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: 'bold',
      fontSize: size === 'small' ? 14 : size === 'large' ? 18 : 16,
    };

    if (mode === 'contained') {
      return {
        ...baseStyle,
        color: colors.text,
      };
    } else {
      return {
        ...baseStyle,
        color: colors.primary,
      };
    }
  };

  const ButtonContent = () => {
    if (mode === 'contained' && (variant === 'gold' || variant === 'red' || variant === 'green')) {
      return (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={[styles.gradientButton, getButtonStyle()]}
        >
          <Button
            mode="text"
            onPress={handlePress}
            disabled={disabled}
            loading={loading}
            icon={icon}
            labelStyle={[getLabelStyle(), labelStyle]}
            style={styles.gradientButtonContent}
          >
            {title}
          </Button>
        </LinearGradient>
      );
    }

    return (
      <Button
        mode={mode}
        onPress={handlePress}
        disabled={disabled}
        loading={loading}
        icon={icon}
        labelStyle={[getLabelStyle(), labelStyle]}
        style={[getButtonStyle(), style]}
      >
        {title}
      </Button>
    );
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <ButtonContent />
      
      {/* Sparkle effect */}
      {(variant === 'gold' || variant === 'snow') && (
        <Animated.View style={[styles.sparkleContainer, sparkleStyle]} pointerEvents="none">
          <View style={[styles.sparkle, { backgroundColor: variant === 'gold' ? '#FFD700' : '#FFFFFF' }]} />
          <View style={[styles.sparkle, styles.sparkle2, { backgroundColor: variant === 'gold' ? '#FFD700' : '#FFFFFF' }]} />
          <View style={[styles.sparkle, styles.sparkle3, { backgroundColor: variant === 'gold' ? '#FFD700' : '#FFFFFF' }]} />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gradientButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButtonContent: {
    backgroundColor: 'transparent',
  },
  sparkleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  sparkle2: {
    top: 10,
    left: 20,
  },
  sparkle3: {
    bottom: 10,
    right: 20,
  },
});

export default ChristmasButton;
