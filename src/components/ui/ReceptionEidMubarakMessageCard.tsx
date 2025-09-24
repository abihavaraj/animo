import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Card } from 'react-native-paper';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface ReceptionEidMubarakMessageCardProps {
  onPress?: () => void;
  style?: any;
  variant?: 'default' | 'elegant' | 'heritage' | 'professional' | 'ramadan' | 'new_year';
  showAnimations?: boolean;
}

export const ReceptionEidMubarakMessageCard: React.FC<ReceptionEidMubarakMessageCardProps> = ({ 
  onPress, 
  style,
  variant = 'professional',
  showAnimations = true
}) => {
  const { isEidMubarakTheme, eidTheme, eidColors } = useEidMubarakTheme();
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
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous animations
    if (showAnimations) {
      // Crescent moon rotation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation for stars
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [showAnimations]);

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
    ],
    professional: [
      "Eid Mubarak! Wishing you and your family a blessed and joyous celebration.",
      "May this Eid bring you peace, happiness, and countless blessings.",
      "Eid Mubarak! May this special day be filled with love, joy, and prosperity.",
    ],
    ramadan: [
      "Ramadan Mubarak! May this holy month bring you peace, blessings, and spiritual growth.",
      "Wishing you a blessed Ramadan filled with reflection, prayer, and community.",
      "May this Ramadan be a time of renewal and closeness to Allah. Ramadan Mubarak!",
      "Ramadan Kareem! May this sacred month bring you inner peace and divine blessings.",
      "Wishing you and your family a spiritually fulfilling and blessed Ramadan.",
    ],
    new_year: [
      "Happy New Year! May this year bring you joy, success, and countless blessings.",
      "Wishing you a prosperous and wonderful New Year filled with happiness and good health.",
      "New Year, new beginnings! May 2025 be your best year yet with endless opportunities.",
      "Happy New Year! May all your dreams and aspirations come true in the coming year.",
      "Wishing you and your family a year filled with love, laughter, and amazing memories.",
    ]
  };

  // Determine the message variant based on theme
  const isRamadanTheme = eidTheme?.name?.toLowerCase().includes('ramadan') || 
                        eidTheme?.displayName?.toLowerCase().includes('ramadan') ||
                        eidTheme?.displayName?.includes('🌙');
  const isNewYearTheme = eidTheme?.name?.toLowerCase().includes('new_year') || 
                        eidTheme?.displayName?.toLowerCase().includes('new year') ||
                        eidTheme?.displayName?.includes('🎊');
  
  let messageVariant = variant;
  if (isRamadanTheme) {
    messageVariant = 'ramadan';
  } else if (isNewYearTheme) {
    messageVariant = 'new_year';
  }
  const randomMessage = messages[messageVariant][Math.floor(Math.random() * messages[messageVariant].length)];

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
            backgroundColor: eidColors.surface,
            borderColor: eidColors.border,
          }
        ]}
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
                   {isRamadanTheme ? 'Ramadan Mubarak!' : 
                    isNewYearTheme ? 'Happy New Year!' : 'Eid Mubarak!'}
                 </Text>
                 <Text style={[styles.subtitle, { color: eidColors.textSecondary }]}>
                   {isRamadanTheme ? 'Holy Month' : 
                    isNewYearTheme ? 'New Beginnings' : 'Blessed Celebration'}
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
            
            {/* Animated Decorative Elements */}
            <View style={styles.decorations}>
              <View style={styles.starRow}>
                <Animated.Text 
                  style={[
                    styles.starIcon, 
                    { 
                      color: eidColors.star,
                      transform: [{ scale: pulseAnim }]
                    }
                  ]}
                >
                  {eidTheme.icons.star}
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.starIcon, 
                    { 
                      color: eidColors.star,
                      transform: [{ scale: pulseAnim }]
                    }
                  ]}
                >
                  {eidTheme.icons.star}
                </Animated.Text>
                <Animated.Text 
                  style={[
                    styles.starIcon, 
                    { 
                      color: eidColors.star,
                      transform: [{ scale: pulseAnim }]
                    }
                  ]}
                >
                  {eidTheme.icons.star}
                </Animated.Text>
              </View>
              
              <View style={styles.hennaRow}>
                <Text style={[styles.hennaIcon, { color: eidColors.henna }]}>
                  {eidTheme.icons.henna}
                </Text>
              </View>
            </View>
            
             {/* Blessing Text */}
             <View style={styles.blessingContainer}>
               <Text style={[styles.blessing, { color: eidColors.blessing }]}>
                 {isRamadanTheme 
                   ? 'Ramadan Kareem' 
                   : isNewYearTheme
                   ? 'New Year, New You!'
                   : 'Barakallahu feeki wa feekum'
                 }
               </Text>
               <Text style={[styles.blessingTranslation, { color: eidColors.textMuted }]}>
                 {isRamadanTheme 
                   ? 'May this Ramadan be generous and blessed' 
                   : isNewYearTheme
                   ? 'May this year bring you endless joy and success'
                   : 'May Allah bless you and your family'
                 }
               </Text>
               <Text style={[styles.blessingAlbanian, { color: eidColors.textMuted }]}>
                 {isRamadanTheme 
                   ? 'Zoti të dhuroftë një Ramadan të bekuar' 
                   : isNewYearTheme
                   ? 'Zoti të dhuroftë një vit të ri plot gëzim dhe sukses'
                   : 'Zoti të bekoftë ty dhe familjen tënde'
                 }
               </Text>
             </View>

            {/* Action Button */}
            {onPress && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: eidColors.primary }
                ]}
                onPress={onPress}
              >
                <Text style={[styles.actionButtonText, { color: eidColors.textOnAccent }]}>
                  Manage Themes
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
  hennaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
     marginBottom: 2,
   },
   blessingAlbanian: {
     fontSize: 12,
     textAlign: 'center',
     fontStyle: 'italic',
     fontWeight: '500',
   },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReceptionEidMubarakMessageCard;
