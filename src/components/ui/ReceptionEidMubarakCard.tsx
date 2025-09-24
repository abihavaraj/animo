import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface ReceptionEidMubarakCardProps {
  onPress?: () => void;
  style?: any;
  variant?: 'default' | 'elegant' | 'heritage';
}

export const ReceptionEidMubarakCard: React.FC<ReceptionEidMubarakCardProps> = ({ 
  onPress, 
  style,
  variant = 'default'
}) => {
  const { isEidMubarakTheme, eidTheme, eidColors } = useEidMubarakTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation for crescent moon
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  if (!isEidMubarakTheme || !eidTheme || !eidColors) {
    return null;
  }

  const messages = {
    default: [
      "Eid Mubarak! May this blessed occasion bring you joy, peace, and prosperity.",
      "Wishing you and your family a blessed Eid filled with happiness and love.",
      "May Allah's blessings be with you today and always. Eid Mubarak!",
    ],
    elegant: [
      "Eid Mubarak! May this special day bring you closer to your loved ones.",
      "Wishing you a joyous Eid celebration with your family and friends.",
      "May this Eid bring you countless blessings and happiness.",
    ],
    heritage: [
      "Eid Mubarak! Celebrating the rich traditions and beautiful heritage of Islam.",
      "May this Eid be filled with the warmth of family and the joy of community.",
      "Wishing you a blessed Eid filled with love, peace, and prosperity.",
    ]
  };

  const randomMessage = messages[variant][Math.floor(Math.random() * messages[variant].length)];

  const crescentRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const { width } = Dimensions.get('window');
  const isTablet = width > 768;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        style
      ]}
    >
      <Card 
        style={[
          styles.card, 
          { 
            backgroundColor: eidColors.surface,
            borderColor: eidColors.border,
          }
        ]}
        onPress={onPress}
      >
        <LinearGradient
          colors={[eidColors.surface, eidColors.surfaceVariant]}
          style={styles.gradient}
        >
          <Card.Content style={styles.content}>
            {/* Animated Header */}
            <View style={styles.header}>
              <Animated.Text 
                style={[
                  styles.crescentIcon, 
                  { 
                    color: eidColors.crescent,
                    transform: [{ rotate: crescentRotation }]
                  }
                ]}
              >
                {eidTheme.icons.crescentMoon}
              </Animated.Text>
              
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: eidColors.text }]}>
                  Eid Mubarak!
                </Text>
                <Text style={[styles.subtitle, { color: eidColors.textSecondary }]}>
                  Blessed Celebration
                </Text>
              </View>
              
              <Text style={[styles.mosqueIcon, { color: eidColors.primary }]}>
                {eidTheme.icons.mosque}
              </Text>
            </View>
            
            {/* Message */}
            <View style={styles.messageContainer}>
              <Text style={[styles.message, { color: eidColors.textSecondary }]}>
                {randomMessage}
              </Text>
            </View>
            
            {/* Decorative Elements */}
            <View style={styles.decorations}>
              <View style={styles.starRow}>
                <Text style={[styles.starIcon, { color: eidColors.star }]}>
                  {eidTheme.icons.star}
                </Text>
                <Text style={[styles.starIcon, { color: eidColors.star }]}>
                  {eidTheme.icons.star}
                </Text>
                <Text style={[styles.starIcon, { color: eidColors.star }]}>
                  {eidTheme.icons.star}
                </Text>
              </View>
              
              <View style={styles.lanternRow}>
                <Text style={[styles.lanternIcon, { color: eidColors.lantern }]}>
                  {eidTheme.icons.lantern}
                </Text>
                <Text style={[styles.hennaIcon, { color: eidColors.henna }]}>
                  {eidTheme.icons.henna}
                </Text>
                <Text style={[styles.lanternIcon, { color: eidColors.lantern }]}>
                  {eidTheme.icons.lantern}
                </Text>
              </View>
            </View>
            
            {/* Blessing Text */}
            <View style={styles.blessingContainer}>
              <Text style={[styles.blessing, { color: eidColors.blessing }]}>
                Barakallahu feeki wa feekum
              </Text>
              <Text style={[styles.blessingTranslation, { color: eidColors.textMuted }]}>
                May Allah bless you and your family
              </Text>
            </View>

            {/* Action Button */}
            {onPress && (
              <Button
                mode="contained"
                style={[
                  styles.actionButton,
                  { backgroundColor: eidColors.primary }
                ]}
                labelStyle={[styles.actionButtonText, { color: eidColors.textOnAccent }]}
                onPress={onPress}
              >
                Learn More
              </Button>
            )}
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  card: {
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 20,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  mosqueIcon: {
    fontSize: 32,
    marginLeft: 12,
  },
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  decorations: {
    marginBottom: 20,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  starIcon: {
    fontSize: 24,
    marginHorizontal: 8,
  },
  lanternRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lanternIcon: {
    fontSize: 20,
    marginHorizontal: 12,
  },
  hennaIcon: {
    fontSize: 20,
    marginHorizontal: 12,
  },
  blessingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  blessing: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '600',
    marginBottom: 4,
  },
  blessingTranslation: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButton: {
    borderRadius: 12,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReceptionEidMubarakCard;
