import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';

interface ChristmasCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: ViewStyle;
  variant?: 'default' | 'gold' | 'red' | 'green';
  showSnow?: boolean;
  showLights?: boolean;
}

const ChristmasCard: React.FC<ChristmasCardProps> = ({
  children,
  title,
  subtitle,
  style,
  variant = 'default',
  showSnow = false,
  showLights = false,
}) => {
  const theme = useTheme();

  const getVariantColors = () => {
    switch (variant) {
      case 'gold':
        return {
          primary: '#D4A574',
          secondary: '#F8F6F3',
          accent: '#B8860B',
        };
      case 'red':
        return {
          primary: '#8B0000',
          secondary: '#FEF2F2',
          accent: '#B91C1C',
        };
      case 'green':
        return {
          primary: '#2D5016',
          secondary: '#F8F6F3',
          accent: '#228B22',
        };
      default:
        return {
          primary: theme.colors.primary,
          secondary: theme.colors.surface,
          accent: theme.colors.accent,
        };
    }
  };

  const colors = getVariantColors();

  return (
    <View style={[styles.container, style]}>
      {showLights && (
        <View style={styles.lightsContainer}>
          <View style={[styles.light, { backgroundColor: '#FF6B6B' }]} />
          <View style={[styles.light, { backgroundColor: '#4ECDC4' }]} />
          <View style={[styles.light, { backgroundColor: '#FFEAA7' }]} />
          <View style={[styles.light, { backgroundColor: '#DDA0DD' }]} />
        </View>
      )}
      
      <Card style={[styles.card, { backgroundColor: colors.secondary }]}>
        <LinearGradient
          colors={[colors.secondary, colors.primary + '10']}
          style={styles.gradient}
        >
          {title && (
            <View style={styles.header}>
              <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
                {title}
              </Text>
              {subtitle && (
                <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.accent }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.content}>
            {children}
          </View>
        </LinearGradient>
      </Card>

      {showSnow && (
        <View style={styles.snowContainer}>
          <View style={[styles.snowflake, { top: 10, left: 20 }]} />
          <View style={[styles.snowflake, { top: 30, left: 60 }]} />
          <View style={[styles.snowflake, { top: 15, left: 80 }]} />
          <View style={[styles.snowflake, { top: 25, left: 40 }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 8,
  },
  card: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    minHeight: 120,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  lightsContainer: {
    position: 'absolute',
    top: -8,
    left: 0,
    right: 0,
    height: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  light: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  snowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 5,
  },
  snowflake: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default ChristmasCard;
