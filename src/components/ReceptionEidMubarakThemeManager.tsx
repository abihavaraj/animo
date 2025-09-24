import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Card, Switch } from 'react-native-paper';
import { EidMubarakThemeConfig, eidMubarakThemes } from '../services/eidMubarakTheme';
import { themeService } from '../services/themeService';
import { useEidMubarakTheme } from './EidMubarakThemeProvider';

interface ReceptionEidMubarakThemeManagerProps {
  onThemeChange?: (themeName: string) => void;
}

export const ReceptionEidMubarakThemeManager: React.FC<ReceptionEidMubarakThemeManagerProps> = ({
  onThemeChange
}) => {
  const { isEidMubarakTheme, eidTheme, eidColors } = useEidMubarakTheme();
  const [selectedTheme, setSelectedTheme] = useState<string>('eid_al_adha_2025');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { width } = Dimensions.get('window');
  const isTablet = width > 768;

  useEffect(() => {
    if (eidTheme) {
      setSelectedTheme(eidTheme.name);
    }
  }, [eidTheme]);

  const handleThemeSelect = async (themeName: string) => {
    setIsLoading(true);
    try {
      console.log('🎨 Reception: Switching to Eid theme:', themeName);
      await themeService.switchTheme(themeName);
      setSelectedTheme(themeName);
      onThemeChange?.(themeName);
    } catch (error) {
      console.error('❌ Reception: Error switching theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableEidTheme = async () => {
    setIsLoading(true);
    try {
      console.log('🎨 Reception: Disabling Eid theme');
      await themeService.switchTheme('default');
      setSelectedTheme('default');
      onThemeChange?.('default');
    } catch (error) {
      console.error('❌ Reception: Error disabling theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderThemePreview = (theme: EidMubarakThemeConfig) => {
    const isSelected = selectedTheme === theme.name;
    
    return (
      <TouchableOpacity
        key={theme.name}
        style={[
          styles.themeOption,
          isSelected && styles.selectedThemeOption,
          { borderColor: isSelected ? theme.colors.primary : '#E0E0E0' }
        ]}
        onPress={() => handleThemeSelect(theme.name)}
        disabled={isLoading}
      >
        <Card style={[styles.themeCard, { backgroundColor: theme.colors.surface }]}>
          <LinearGradient
            colors={[theme.colors.surface, theme.colors.surfaceVariant]}
            style={styles.themeGradient}
          >
            {/* Theme Header */}
            <View style={[styles.themeHeader, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.themeIcon, { color: theme.colors.accent }]}>
                {theme.icons.mosque}
              </Text>
              <Text style={[styles.themeTitle, { color: '#FFFFFF' }]}>
                {theme.displayName}
              </Text>
              <Text style={[styles.themeCrescent, { color: theme.colors.accent }]}>
                {theme.icons.crescentMoon}
              </Text>
            </View>
            
            {/* Theme Content */}
            <View style={styles.themeContent}>
              <Text style={[styles.themeDescription, { color: theme.colors.textSecondary }]}>
                {theme.description}
              </Text>
              
              {/* Color Palette Preview */}
              <View style={styles.colorPalette}>
                <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.colors.accent }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.colors.crescent }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.colors.lantern }]} />
              </View>
              
              {/* Animation Status */}
              <View style={styles.animationStatus}>
                <Text style={[styles.animationLabel, { color: theme.colors.textMuted }]}>
                  Animations:
                </Text>
                <View style={styles.animationIcons}>
                  {theme.animations.crescentMoon && (
                    <Text style={[styles.animationIcon, { color: theme.colors.crescent }]}>
                      {theme.icons.crescentMoon}
                    </Text>
                  )}
                  {theme.animations.floatingStars && (
                    <Text style={[styles.animationIcon, { color: theme.colors.star }]}>
                      {theme.icons.star}
                    </Text>
                  )}
                  {theme.animations.lanternGlow && (
                    <Text style={[styles.animationIcon, { color: theme.colors.lantern }]}>
                      {theme.icons.lantern}
                    </Text>
                  )}
                  {theme.animations.celebrationParticles && (
                    <Text style={[styles.animationIcon, { color: theme.colors.celebration }]}>
                      ✨
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </Card>
        
        {isSelected && (
          <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.selectedText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Eid Mubarak Theme Manager</Text>
        <Text style={styles.subtitle}>
          Choose a beautiful Eid theme for your reception portal
        </Text>
      </View>

      {/* Current Theme Status */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Current Theme Status</Text>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: isEidMubarakTheme ? '#4CAF50' : '#FF9800' }
            ]}>
              <Text style={styles.statusText}>
                {isEidMubarakTheme ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          
          {isEidMubarakTheme && eidTheme && (
            <View style={styles.currentThemeInfo}>
              <Text style={styles.currentThemeName}>{eidTheme.displayName}</Text>
              <Text style={styles.currentThemeDescription}>{eidTheme.description}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Theme Options */}
      <View style={styles.themesSection}>
        <Text style={styles.sectionTitle}>Available Eid Themes</Text>
        
        <ScrollView 
          horizontal={!isTablet}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={isTablet ? styles.themesGrid : styles.themesRow}
        >
          {eidMubarakThemes.map(renderThemePreview)}
        </ScrollView>
      </View>

      {/* Animation Controls */}
      <Card style={styles.controlsCard}>
        <Card.Content>
          <Text style={styles.controlsTitle}>Animation Settings</Text>
          
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Enable Animations</Text>
            <Switch
              value={animationsEnabled}
              onValueChange={setAnimationsEnabled}
              color="#4CAF50"
            />
          </View>
          
          <Text style={styles.controlDescription}>
            Animations include crescent moon rotation, floating stars, lantern glow, and celebration particles.
          </Text>
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleDisableEidTheme}
          disabled={isLoading || !isEidMubarakTheme}
          style={styles.disableButton}
        >
          Disable Eid Theme
        </Button>
        
        <Button
          mode="contained"
          onPress={() => handleThemeSelect(selectedTheme)}
          disabled={isLoading}
          style={styles.applyButton}
        >
          {isLoading ? 'Applying...' : 'Apply Theme'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  statusCard: {
    marginBottom: 24,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  currentThemeInfo: {
    marginTop: 8,
  },
  currentThemeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentThemeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  themesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  themesRow: {
    flexDirection: 'row',
  },
  themeOption: {
    width: 300,
    marginRight: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  selectedThemeOption: {
    borderWidth: 3,
  },
  themeCard: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  themeGradient: {
    borderRadius: 10,
  },
  themeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  themeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  themeCrescent: {
    fontSize: 24,
    marginLeft: 8,
  },
  themeContent: {
    padding: 16,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  animationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  animationLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  animationIcons: {
    flexDirection: 'row',
  },
  animationIcon: {
    fontSize: 16,
    marginLeft: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsCard: {
    marginBottom: 24,
    elevation: 2,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
  },
  controlDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  disableButton: {
    flex: 1,
    marginRight: 8,
  },
  applyButton: {
    flex: 1,
    marginLeft: 8,
  },
});

export default ReceptionEidMubarakThemeManager;
