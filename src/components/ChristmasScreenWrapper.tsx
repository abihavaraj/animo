import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import ChristmasThemeWrapper from './ChristmasThemeWrapper';
import ChristmasHeader from './ui/ChristmasHeader';

interface ChristmasScreenWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showSnow?: boolean;
  showLights?: boolean;
  variant?: 'default' | 'gold' | 'red' | 'green' | 'snow' | 'celestial';
}

/**
 * Easy-to-use wrapper for applying Christmas theme to any screen
 * Simply wrap your existing screen content with this component
 */
const ChristmasScreenWrapper: React.FC<ChristmasScreenWrapperProps> = ({
  children,
  title,
  subtitle,
  showHeader = true,
  showSnow = true,
  showLights = true,
  variant = 'gold',
}) => {
  const theme = useTheme();

  return (
    <ChristmasThemeWrapper
      variant={variant}
      showSnow={showSnow}
      showLights={showLights}
    >
      <View style={styles.container}>
        {showHeader && title && (
          <ChristmasHeader
            title={title}
            subtitle={subtitle}
            variant={variant}
            showLights={showLights}
            showSnow={showSnow}
          />
        )}
        
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </ChristmasThemeWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});

export default ChristmasScreenWrapper;
