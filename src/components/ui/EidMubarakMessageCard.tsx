import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from 'react-native-paper';
import { useEidMubarakTheme } from '../EidMubarakThemeProvider';

interface EidMubarakMessageCardProps {
  onPress?: () => void;
  style?: any;
}

export const EidMubarakMessageCard: React.FC<EidMubarakMessageCardProps> = ({ 
  onPress, 
  style 
}) => {
  const { isEidMubarakTheme, eidTheme, eidColors } = useEidMubarakTheme();

  if (!isEidMubarakTheme || !eidTheme || !eidColors) {
    return null;
  }

  const messages = [
    "Eid Mubarak! May this blessed occasion bring you joy, peace, and prosperity.",
    "Wishing you and your family a blessed Eid filled with happiness and love.",
    "May Allah's blessings be with you today and always. Eid Mubarak!",
    "Eid Mubarak! May this special day bring you closer to your loved ones.",
    "Wishing you a joyous Eid celebration with your family and friends."
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <Card 
      style={[
        styles.card, 
        { 
          backgroundColor: eidColors.surface,
          borderColor: eidColors.border,
        },
        style
      ]}
      onPress={onPress}
    >
      <Card.Content style={styles.content}>
        {/* Header with crescent moon and mosque */}
        <View style={styles.header}>
          <Text style={[styles.crescentIcon, { color: eidColors.crescent }]}>
            {eidTheme.icons.crescentMoon}
          </Text>
          <Text style={[styles.title, { color: eidColors.text }]}>
            Eid Mubarak!
          </Text>
          <Text style={[styles.mosqueIcon, { color: eidColors.primary }]}>
            {eidTheme.icons.mosque}
          </Text>
        </View>
        
        {/* Message */}
        <Text style={[styles.message, { color: eidColors.textSecondary }]}>
          {randomMessage}
        </Text>
        
        {/* Decorative elements */}
        <View style={styles.decorations}>
          <Text style={[styles.starIcon, { color: eidColors.star }]}>
            {eidTheme.icons.star}
          </Text>
          <Text style={[styles.lanternIcon, { color: eidColors.lantern }]}>
            {eidTheme.icons.lantern}
          </Text>
          <Text style={[styles.hennaIcon, { color: eidColors.henna }]}>
            {eidTheme.icons.henna}
          </Text>
        </View>
        
        {/* Blessing text */}
        <Text style={[styles.blessing, { color: eidColors.blessing }]}>
          Barakallahu feeki wa feekum
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  crescentIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  mosqueIcon: {
    fontSize: 24,
    marginLeft: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  decorations: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  starIcon: {
    fontSize: 20,
    marginHorizontal: 8,
  },
  lanternIcon: {
    fontSize: 20,
    marginHorizontal: 8,
  },
  hennaIcon: {
    fontSize: 20,
    marginHorizontal: 8,
  },
  blessing: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
});

export default EidMubarakMessageCard;
