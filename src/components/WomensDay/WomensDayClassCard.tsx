import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemeColor } from '../../hooks/useDynamicThemeColor';
import { Caption } from '../ui/Typography';

interface WomensDayClassCardProps {
  children: React.ReactNode;
  isBooked?: boolean;
  className?: string;
  instructorName?: string;
  style?: any;
}

export const WomensDayClassCard: React.FC<WomensDayClassCardProps> = ({
  children,
  isBooked = false,
  className,
  instructorName,
  style
}) => {
  const { currentTheme } = useTheme();
  const accentColor = useThemeColor({}, 'accent');
  const primaryColor = useThemeColor({}, 'primary');
  const surfaceColor = useThemeColor({}, 'surface');
  
  const isWomensDayTheme = currentTheme?.name === 'womens_day';
  
  if (!isWomensDayTheme) {
    return <>{children}</>;
  }

  const empoweringMessages = [
    "Strength",
    "Grace", 
    "Balance",
    "Power",
    "Focus",
    "Flow",
    "Mind-Body",
    "Centered"
  ];

  const getRandomMessage = () => {
    const hash = (className || instructorName || '').length;
    return empoweringMessages[hash % empoweringMessages.length];
  };

  return (
    <View style={[styles.wrapper, style]}>
      {/* Decorative corner elements */}
      <View style={styles.decorativeCorners}>
        <View style={[styles.cornerTopLeft, { borderColor: accentColor + '20' }]} />
        <View style={[styles.cornerTopRight, { borderColor: primaryColor + '20' }]} />
        <View style={[styles.cornerBottomLeft, { borderColor: primaryColor + '15' }]} />
        <View style={[styles.cornerBottomRight, { borderColor: accentColor + '25' }]} />
      </View>

      {/* Main card content */}
      <View style={styles.cardWrapper}>
        {children}
      </View>

      {/* Empowering message badge */}
      <View style={[styles.messageBadge, { backgroundColor: accentColor + '15', borderColor: accentColor + '30' }]}>
        <MaterialIcons name="favorite" size={10} color={accentColor} />
        <Caption style={styles.messageText} color={accentColor}>
          {getRandomMessage()}
        </Caption>
      </View>

      {/* Special booked indicator for Women's Day */}
      {isBooked && (
        <View style={[styles.bookedIndicator, { backgroundColor: primaryColor }]}>
          <MaterialIcons name="spa" size={12} color="white" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginVertical: 2,
  },
  decorativeCorners: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 8,
  },
  cardWrapper: {
    margin: 4,
  },
  messageBadge: {
    position: 'absolute',
    top: -4,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 3,
  },
  bookedIndicator: {
    position: 'absolute',
    top: -6,
    left: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});