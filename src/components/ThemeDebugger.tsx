import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Paragraph, Title } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeDebugger: React.FC = () => {
  const { currentTheme, themeColors } = useTheme();

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.title}>🔍 Theme Debug Info</Title>
        
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Current Theme:</Title>
          <Paragraph>Name: {currentTheme?.name || 'No theme (default)'}</Paragraph>
          <Paragraph>Display Name: {currentTheme?.display_name || 'Default Theme'}</Paragraph>
          <Paragraph>Is Active: {currentTheme?.is_active ? 'Yes' : 'No'}</Paragraph>
          <Paragraph>ID: {currentTheme?.id || 'N/A'}</Paragraph>
        </View>

        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Theme Detection:</Title>
          <Paragraph>Is Christmas Theme: {currentTheme?.name?.includes('christmas') ? '✅ YES' : '❌ NO'}</Paragraph>
          <Paragraph>Theme Type: {currentTheme?.name || 'Default'}</Paragraph>
        </View>

        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Theme Colors:</Title>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: themeColors.primary }]} />
            <Paragraph>Primary: {themeColors.primary}</Paragraph>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: themeColors.background }]} />
            <Paragraph>Background: {themeColors.background}</Paragraph>
          </View>
          <View style={styles.colorRow}>
            <View style={[styles.colorBox, { backgroundColor: themeColors.accent }]} />
            <Paragraph>Accent: {themeColors.accent}</Paragraph>
          </View>
        </View>


        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Raw Theme Data:</Title>
          <Paragraph style={styles.jsonText}>
            {JSON.stringify(currentTheme, null, 2)}
          </Paragraph>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorBox: {
    width: 20,
    height: 20,
    marginRight: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CCC',
  },
  jsonText: {
    fontSize: 10,
    fontFamily: 'monospace',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
  },
});

export default ThemeDebugger;