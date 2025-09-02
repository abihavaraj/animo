import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { spacing } from '../../constants/Spacing';

/**
 * ANIMO Pilates Studio - Status Chip Component
 * Mobile Design System v1.1
 */

interface StatusChipProps {
  state: 'success' | 'warning' | 'info' | 'neutral';
  text: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  size?: 'small' | 'medium';
}

const StatusChip: React.FC<StatusChipProps> = ({ 
  state, 
  text, 
  icon, 
  size = 'medium' 
}) => {
  const getStateStyle = () => {
    switch (state) {
      case 'success':
        return {
          backgroundColor: 'rgba(107, 142, 127, 0.08)', // Accent with 8% opacity
          borderColor: 'rgba(107, 142, 127, 0.16)',     // Accent with 16% opacity
          textColor: Colors.light.accent,
        };
      case 'warning':
        return {
          backgroundColor: 'rgba(212, 165, 116, 0.12)', // Warning with 12% opacity
          borderColor: 'rgba(212, 165, 116, 0.24)',     // Warning with 24% opacity
          textColor: Colors.light.warning,
        };
      case 'info':
        return {
          backgroundColor: 'rgba(102, 102, 102, 0.05)', // Very subtle gray
          borderColor: 'rgba(102, 102, 102, 0.1)',
          textColor: '#666666',
        };
      case 'neutral':
      default:
        return {
          backgroundColor: Colors.light.secondary,       // Soft beige
          borderColor: Colors.light.border,
          textColor: '#666666',
        };
    }
  };

  const stateStyle = getStateStyle();
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.chip,
      {
        backgroundColor: stateStyle.backgroundColor,
        borderColor: stateStyle.borderColor,
        paddingHorizontal: isSmall ? spacing.sm : 12,
        paddingVertical: isSmall ? 3 : 5,
        height: isSmall ? 22 : 28,
      }
    ]}>
      {icon && (
        <MaterialIcons 
          name={icon} 
          size={isSmall ? 12 : 14} 
          color={stateStyle.textColor}
          style={styles.icon}
        />
      )}
      <Text style={[
        styles.text,
        { 
          color: stateStyle.textColor,
          fontSize: isSmall ? 11 : 12,
        }
      ]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12, // Radius 12px as per design system
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default StatusChip; 