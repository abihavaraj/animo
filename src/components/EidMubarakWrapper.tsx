import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useEidMubarakTheme } from './EidMubarakThemeProvider';
import EidCelebrationParticles from './animations/EidCelebrationParticles';
import EidCrescentMoon from './animations/EidCrescentMoon';
import EidFloatingStars from './animations/EidFloatingStars';
import EidHennaPatterns from './animations/EidHennaPatterns';
import EidLanternGlow from './animations/EidLanternGlow';

interface EidMubarakWrapperProps {
  children: React.ReactNode;
  showAnimations?: boolean;
  animationIntensity?: 'low' | 'medium' | 'high';
}

export const EidMubarakWrapper: React.FC<EidMubarakWrapperProps> = ({ 
  children, 
  showAnimations = true,
  animationIntensity = 'medium'
}) => {
  const { isEidMubarakTheme, eidTheme, eidColors } = useEidMubarakTheme();

  if (!isEidMubarakTheme || !eidTheme || !eidColors) {
    return <>{children}</>;
  }

  const getAnimationCount = () => {
    switch (animationIntensity) {
      case 'low': return { stars: 4, particles: 6, patterns: 3 };
      case 'high': return { stars: 12, particles: 20, patterns: 8 };
      default: return { stars: 8, particles: 12, patterns: 6 };
    }
  };

  const animationCounts = getAnimationCount();

  return (
    <View style={[styles.container, { backgroundColor: eidColors.background }]}>
      {/* Background animations */}
      {showAnimations && eidTheme.animations.crescentMoon && (
        <EidCrescentMoon 
          size={80} 
          style={styles.crescentMoon} 
          animated={true}
        />
      )}
      
      {showAnimations && eidTheme.animations.floatingStars && (
        <EidFloatingStars 
          count={animationCounts.stars}
          style={styles.floatingStars}
          animated={true}
        />
      )}
      
      {showAnimations && eidTheme.animations.lanternGlow && (
        <EidLanternGlow 
          size={60} 
          style={styles.lanternGlow} 
          animated={true}
        />
      )}
      
      {showAnimations && eidTheme.animations.hennaPatterns && (
        <EidHennaPatterns 
          style={styles.hennaPatterns}
          animated={true}
        />
      )}
      
      {showAnimations && eidTheme.animations.celebrationParticles && (
        <EidCelebrationParticles 
          count={animationCounts.particles}
          style={styles.celebrationParticles}
          animated={true}
        />
      )}
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
  crescentMoon: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 0,
  },
  floatingStars: {
    zIndex: 0,
  },
  lanternGlow: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    zIndex: 0,
  },
  hennaPatterns: {
    zIndex: 0,
  },
  celebrationParticles: {
    zIndex: 0,
  },
});

export default EidMubarakWrapper;
