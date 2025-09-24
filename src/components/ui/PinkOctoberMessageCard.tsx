import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';
import { useTheme } from '../../contexts/ThemeContext';

interface PinkOctoberMessageCardProps {
  onPress?: () => void;
  style?: any;
  showAnimations?: boolean;
}

export const PinkOctoberMessageCard: React.FC<PinkOctoberMessageCardProps> = ({ 
  onPress, 
  style,
  showAnimations = true
}) => {
  const { currentTheme, themeColors } = useTheme();
  
  // Check if it's a Pink October theme
  const isPinkOctoberTheme = currentTheme && (
    currentTheme.name?.toLowerCase().includes('pink_october') ||
    currentTheme.display_name?.toLowerCase().includes('pink october') ||
    currentTheme.display_name?.includes('🌸') ||
    currentTheme.display_name?.includes('Pink October')
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
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [showAnimations]);

  const messages = [
    "Together we are stronger. Breast cancer awareness saves lives.",
    "Early detection saves lives. Get your mammogram today.",
    "Hope, strength, and support for all those affected by breast cancer.",
    "Pink October reminds us that we're never alone in this fight.",
    "Every ribbon represents hope, every story inspires courage.",
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const ribbonRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { width } = Dimensions.get('window');
  const isTablet = width > 768;

  // Don't render if not Pink October theme
  if (!isPinkOctoberTheme) {
    return null;
  }
  
  // Use Pink October colors
  const cardBackground = '#FFFFFF';
  const cardBorder = '#E91E63';
  const titleColor = '#E91E63';
  const subtitleColor = '#C2185B';
  const ribbonColor = '#E91E63';
  const heartColor = '#F8BBD9';
  const strengthColor = '#AD1457';
  const blessingColor = '#4CAF50';
  const messageColor = '#1A1A1A';
  const buttonBackground = '#E91E63';
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
          colors={[cardBackground, '#FCE4EC', cardBackground]}
          style={styles.gradient}
        >
          <Card.Content style={styles.content}>
            {/* Animated Header */}
            <View style={styles.header}>
              <Animated.Text 
                style={[
                  styles.ribbonIcon, 
                  { 
                    color: ribbonColor,
                    transform: [{ rotate: ribbonRotation }]
                  }
                ]}
              >
                🌸
              </Animated.Text>
              
               <View style={styles.titleContainer}>
                 <Text style={[styles.title, { color: titleColor }]}>
                   Pink October
                 </Text>
                 <Text style={[styles.subtitle, { color: subtitleColor }]}>
                   Breast Cancer Awareness
                 </Text>
               </View>
              
              <Text style={[styles.heartIcon, { color: heartColor }]}>
                💗
              </Text>
            </View>

            {/* Floating Awareness Elements */}
            <View style={styles.awarenessContainer}>
              <Animated.Text 
                style={[
                  styles.awarenessIcon, 
                  { 
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                💗
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.awarenessIcon, 
                  { 
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                💪
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.awarenessIcon, 
                  { 
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                ✨
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.awarenessIcon, 
                  { 
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                🤝
              </Animated.Text>
              <Animated.Text 
                style={[
                  styles.awarenessIcon, 
                  { 
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                🌸
              </Animated.Text>
            </View>
            
            {/* Blessing Text */}
            <View style={[styles.blessingContainer, { backgroundColor: '#F8BBD9', borderColor: cardBorder }]}>
              <Text style={[styles.blessing, { color: blessingColor }]}>
                Together We Are Stronger
              </Text>
              <Text style={[styles.blessingTranslation, { color: messageColor }]}>
                May hope and strength guide us through every challenge
              </Text>
              <Text style={[styles.blessingAlbanian, { color: messageColor }]}>
                Shpresë dhe forcë të na udhëheqin nëpër çdo sfidë
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
                  Learn More
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
    marginVertical: 20,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 600,
  },
  card: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
  },
  gradient: {
    padding: 20,
    borderRadius: 15,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    width: '100%',
  },
  ribbonIcon: {
    fontSize: 40,
    marginHorizontal: 10,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  heartIcon: {
    fontSize: 30,
    marginHorizontal: 10,
  },
  awarenessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginVertical: 20,
    flexWrap: 'wrap',
  },
  awarenessIcon: {
    fontSize: 32,
    marginHorizontal: 8,
    marginVertical: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  blessingContainer: {
    marginVertical: 15,
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  blessing: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  blessingTranslation: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 3,
  },
  blessingAlbanian: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageContainer: {
    marginVertical: 15,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionButton: {
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PinkOctoberMessageCard;
