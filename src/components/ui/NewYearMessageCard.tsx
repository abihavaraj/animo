import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

interface NewYearMessageCardProps {
  onPress?: () => void;
  style?: any;
  showAnimations?: boolean;
}

export const NewYearMessageCard: React.FC<NewYearMessageCardProps> = ({ 
  onPress, 
  style,
  showAnimations = true
}) => {
  const { currentTheme, themeColors } = useTheme();
  
  // Check if it's a New Year theme
  const isNewYearTheme = currentTheme && (
    currentTheme.name?.toLowerCase().includes('new_year') ||
    currentTheme.display_name?.toLowerCase().includes('new year') ||
    currentTheme.display_name?.includes('🎊') ||
    currentTheme.display_name?.includes('New Year')
  );
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showAnimations) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    // Entrance animation sequence
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ]).start();

    // Continuous animations
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    pulseAnimation.start();

    return () => {
      rotateAnimation.stop();
      pulseAnimation.stop();
    };
  }, [showAnimations]);

  const messages = [
    "Happy New Year! May this year bring you joy, success, and countless blessings.",
    "Wishing you a prosperous and wonderful New Year filled with happiness and good health.",
    "New Year, new beginnings! May 2025 be your best year yet with endless opportunities.",
    "Happy New Year! May all your dreams and aspirations come true in the coming year.",
    "Wishing you and your family a year filled with love, laughter, and amazing memories.",
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const crescentRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { width } = Dimensions.get('window');
  const isTablet = width > 768;

  // Don't render if not New Year theme
  if (!isNewYearTheme) {
    return null;
  }
  
  // Use Christmas-like colors for New Year theme
  const cardBackground = '#1a1a1a';
  const cardBorder = '#FFFFFF';
  const titleColor = '#FFFFFF';
  const subtitleColor = '#FF6B6B';
  const confettiColor = '#FFFFFF';
  const snowColor = '#FFFFFF';
  const starColor = '#FFD700';
  const blessingColor = '#4CAF50';
  const messageColor = '#E0E0E0';
  const buttonBackground = '#FF6B6B';
  const buttonText = '#FFFFFF';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim }
          ],
        },
        style
      ]}
    >
      <Card 
        style={[
          styles.card, 
          { 
            backgroundColor: cardBackground,
            borderColor: cardBorder,
          }
        ]}
      >
        <LinearGradient
          colors={[cardBackground, '#2d2d2d', cardBackground]}
          style={styles.gradient}
        >
          <Card.Content style={styles.content}>
            {/* Animated Header */}
            <View style={styles.header}>
              <Animated.Text 
                style={[
                  styles.crescentIcon, 
                  { 
                    color: confettiColor,
                    transform: [{ rotate: crescentRotation }]
                  }
                ]}
              >
                🎊
              </Animated.Text>
              
               <View style={styles.titleContainer}>
                 <Text style={[styles.title, { color: titleColor }]}>
                   Happy New Year!
                 </Text>
                 <Text style={[styles.subtitle, { color: subtitleColor }]}>
                   New Beginnings
                 </Text>
               </View>
              
              <Text style={[styles.mosqueIcon, { color: snowColor }]}>
                ❄️
              </Text>
            </View>

            {/* Floating Stars and Snow */}
            <View style={styles.starsContainer}>
              <Animated.Text 
                style={[
                  styles.starIcon, 
                  { 
                    color: snowColor,
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                ❄️
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.starIcon, 
                  { 
                    color: starColor,
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                ⭐
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.starIcon, 
                  { 
                    color: snowColor,
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                ❄️
              </Animated.Text>
            </View>
            
            {/* Blessing Text */}
            <View style={[styles.blessingContainer, { backgroundColor: '#2d2d2d', borderColor: cardBorder }]}>
              <Text style={[styles.blessing, { color: blessingColor }]}>
                New Year, New You!
              </Text>
              <Text style={[styles.blessingTranslation, { color: messageColor }]}>
                May this year bring you endless joy and success
              </Text>
              <Text style={[styles.blessingAlbanian, { color: messageColor }]}>
                Zoti të dhuroftë një vit të ri plot gëzim dhe sukses
              </Text>
            </View>

            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={[styles.message, { color: messageColor }]}>
                {randomMessage}
              </Text>
            </View>

            {/* Action Button */}
            {onPress && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: buttonBackground }]}
                onPress={onPress}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionButtonText, { color: buttonText }]}>
                  Celebrate!
                </Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    marginHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  crescentIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.8,
  },
  mosqueIcon: {
    fontSize: 28,
    marginLeft: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  starIcon: {
    fontSize: 24,
    marginHorizontal: 8,
  },
  blessingContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(233, 30, 99, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.1)',
  },
  blessing: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  blessingTranslation: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  blessingAlbanian: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NewYearMessageCard;
