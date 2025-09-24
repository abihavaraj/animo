import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Paragraph, Switch, Text, Title } from 'react-native-paper';
import { eidMubarakThemes } from '../services/eidMubarakTheme';
import { useEidMubarakTheme } from './EidMubarakThemeProvider';

export const EidMubarakThemeManager: React.FC = () => {
  const { isEidMubarakTheme, eidTheme, eidColors, refreshEidTheme } = useEidMubarakTheme();
  const [selectedTheme, setSelectedTheme] = useState<string>('eid_mubarak_2025');
  const [animationSettings, setAnimationSettings] = useState({
    crescentMoon: true,
    floatingStars: true,
    lanternGlow: true,
    hennaPatterns: true,
    celebrationParticles: true,
  });

  useEffect(() => {
    if (eidTheme) {
      setSelectedTheme(eidTheme.name);
      setAnimationSettings(eidTheme.animations);
    }
  }, [eidTheme]);

  const handleThemeSelect = (themeName: string) => {
    setSelectedTheme(themeName);
    console.log(`🕌 EidMubarakThemeManager: Selected theme: ${themeName}`);
  };

  const handleAnimationToggle = (animation: keyof typeof animationSettings) => {
    setAnimationSettings(prev => ({
      ...prev,
      [animation]: !prev[animation]
    }));
  };

  const handleApplyTheme = () => {
    const theme = eidMubarakThemes.find(t => t.name === selectedTheme);
    if (theme) {
      // Here you would typically save the theme to your database
      console.log('🕌 EidMubarakThemeManager: Applying theme:', theme.displayName);
      Alert.alert(
        'Theme Applied',
        `Eid Mubarak theme "${theme.displayName}" has been applied successfully!`,
        [{ text: 'OK' }]
      );
      refreshEidTheme();
    }
  };

  const handlePreviewTheme = () => {
    const theme = eidMubarakThemes.find(t => t.name === selectedTheme);
    if (theme) {
      console.log('🕌 EidMubarakThemeManager: Previewing theme:', theme.displayName);
      Alert.alert(
        'Theme Preview',
        `Previewing "${theme.displayName}" theme with current animation settings.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={[styles.card, { backgroundColor: eidColors?.surface || '#FFFFFF' }]}>
        <Card.Content>
          <Title style={[styles.title, { color: eidColors?.text || '#000000' }]}>
            🕌 Eid Mubarak Theme Manager
          </Title>
          <Paragraph style={[styles.description, { color: eidColors?.textSecondary || '#666666' }]}>
            Manage your Eid Mubarak themes and animations for the reception portal.
          </Paragraph>
        </Card.Content>
      </Card>

      {/* Theme Selection */}
      <Card style={[styles.card, { backgroundColor: eidColors?.surface || '#FFFFFF' }]}>
        <Card.Content>
          <Title style={[styles.sectionTitle, { color: eidColors?.text || '#000000' }]}>
            Available Themes
          </Title>
          <View style={styles.themeGrid}>
            {eidMubarakThemes.map((theme) => (
              <Chip
                key={theme.name}
                selected={selectedTheme === theme.name}
                onPress={() => handleThemeSelect(theme.name)}
                style={[
                  styles.themeChip,
                  {
                    backgroundColor: selectedTheme === theme.name 
                      ? eidColors?.primary || '#1B5E20'
                      : eidColors?.surfaceVariant || '#F5F5F5',
                  }
                ]}
                textStyle={{
                  color: selectedTheme === theme.name 
                    ? '#FFFFFF' 
                    : eidColors?.text || '#000000'
                }}
              >
                {theme.displayName}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      {/* Selected Theme Details */}
      {selectedTheme && (
        <Card style={[styles.card, { backgroundColor: eidColors?.surface || '#FFFFFF' }]}>
          <Card.Content>
            <Title style={[styles.sectionTitle, { color: eidColors?.text || '#000000' }]}>
              Theme Details
            </Title>
            {(() => {
              const theme = eidMubarakThemes.find(t => t.name === selectedTheme);
              return theme ? (
                <View>
                  <Text style={[styles.themeName, { color: eidColors?.primary || '#1B5E20' }]}>
                    {theme.displayName}
                  </Text>
                  <Text style={[styles.themeDescription, { color: eidColors?.textSecondary || '#666666' }]}>
                    {theme.description}
                  </Text>
                  
                  {/* Color Preview */}
                  <View style={styles.colorPreview}>
                    <Text style={[styles.colorLabel, { color: eidColors?.text || '#000000' }]}>
                      Color Palette:
                    </Text>
                    <View style={styles.colorSwatches}>
                      <View style={[styles.colorSwatch, { backgroundColor: theme.colors.primary }]} />
                      <View style={[styles.colorSwatch, { backgroundColor: theme.colors.secondary }]} />
                      <View style={[styles.colorSwatch, { backgroundColor: theme.colors.accent }]} />
                      <View style={[styles.colorSwatch, { backgroundColor: theme.colors.crescent }]} />
                      <View style={[styles.colorSwatch, { backgroundColor: theme.colors.gold }]} />
                    </View>
                  </View>
                </View>
              ) : null;
            })()}
          </Card.Content>
        </Card>
      )}

      {/* Animation Settings */}
      <Card style={[styles.card, { backgroundColor: eidColors?.surface || '#FFFFFF' }]}>
        <Card.Content>
          <Title style={[styles.sectionTitle, { color: eidColors?.text || '#000000' }]}>
            Animation Settings
          </Title>
          
          <View style={styles.animationSetting}>
            <Text style={[styles.animationLabel, { color: eidColors?.text || '#000000' }]}>
              🌙 Crescent Moon Animation
            </Text>
            <Switch
              value={animationSettings.crescentMoon}
              onValueChange={() => handleAnimationToggle('crescentMoon')}
              color={eidColors?.primary || '#1B5E20'}
            />
          </View>
          
          <View style={styles.animationSetting}>
            <Text style={[styles.animationLabel, { color: eidColors?.text || '#000000' }]}>
              ⭐ Floating Stars
            </Text>
            <Switch
              value={animationSettings.floatingStars}
              onValueChange={() => handleAnimationToggle('floatingStars')}
              color={eidColors?.primary || '#1B5E20'}
            />
          </View>
          
          <View style={styles.animationSetting}>
            <Text style={[styles.animationLabel, { color: eidColors?.text || '#000000' }]}>
              🏮 Lantern Glow Effect
            </Text>
            <Switch
              value={animationSettings.lanternGlow}
              onValueChange={() => handleAnimationToggle('lanternGlow')}
              color={eidColors?.primary || '#1B5E20'}
            />
          </View>
          
          <View style={styles.animationSetting}>
            <Text style={[styles.animationLabel, { color: eidColors?.text || '#000000' }]}>
              🖐️ Henna Patterns
            </Text>
            <Switch
              value={animationSettings.hennaPatterns}
              onValueChange={() => handleAnimationToggle('hennaPatterns')}
              color={eidColors?.primary || '#1B5E20'}
            />
          </View>
          
          <View style={styles.animationSetting}>
            <Text style={[styles.animationLabel, { color: eidColors?.text || '#000000' }]}>
              ✨ Celebration Particles
            </Text>
            <Switch
              value={animationSettings.celebrationParticles}
              onValueChange={() => handleAnimationToggle('celebrationParticles')}
              color={eidColors?.primary || '#1B5E20'}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handlePreviewTheme}
          style={[styles.button, { borderColor: eidColors?.primary || '#1B5E20' }]}
          labelStyle={{ color: eidColors?.primary || '#1B5E20' }}
        >
          Preview Theme
        </Button>
        
        <Button
          mode="contained"
          onPress={handleApplyTheme}
          style={[styles.button, { backgroundColor: eidColors?.primary || '#1B5E20' }]}
          labelStyle={{ color: '#FFFFFF' }}
        >
          Apply Theme
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeChip: {
    margin: 4,
  },
  themeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  themeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  colorPreview: {
    marginTop: 16,
  },
  colorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  animationSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  animationLabel: {
    fontSize: 16,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default EidMubarakThemeManager;
