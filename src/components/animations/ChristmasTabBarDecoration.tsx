import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ChristmasTabBarDecorationProps {
  isVisible: boolean;
}

const ChristmasTabBarDecoration: React.FC<ChristmasTabBarDecorationProps> = ({
  isVisible,
}) => {
  if (!isVisible) return null;

    return (
    <View style={styles.container}>
      {/* Elegant Christmas Border */}
      <LinearGradient
        colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.3)', 'rgba(212, 175, 55, 0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.elegantBorder}
      />
      
      {/* Subtle Snowflakes */}
      <View style={[styles.snowflake, { left: '15%', top: 4 }]}>
        <Text style={styles.snowflakeText}>❄</Text>
      </View>
      
      <View style={[styles.snowflake, { left: '50%', top: 2 }]}>
        <Text style={styles.snowflakeText}>✨</Text>
      </View>
      
      <View style={[styles.snowflake, { left: '85%', top: 4 }]}>
        <Text style={styles.snowflakeText}>❄</Text>
      </View>

      {/* Subtle Christmas Tree Icons */}
      <View style={styles.christmasIcons}>
        <Text style={styles.treeIcon}>🎄</Text>
        <Text style={styles.treeIcon}>🎄</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 16,
    zIndex: 5,
    overflow: 'hidden',
  },
  elegantBorder: {
    height: 2,
    width: '100%',
    marginTop: 1,
  },
  snowflake: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snowflakeText: {
    fontSize: 10,
    color: 'rgba(212, 175, 55, 0.8)',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  christmasIcons: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  treeIcon: {
    fontSize: 8,
    color: 'rgba(34, 139, 34, 0.4)',
    opacity: 0.6,
  },
});

export default ChristmasTabBarDecoration;
