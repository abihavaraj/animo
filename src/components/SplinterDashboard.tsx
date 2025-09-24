import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import SplinterService, { SplinterLint, SplinterReport } from '../services/splinterService';

interface SplinterDashboardProps {
  onRefresh?: () => void;
}

const SplinterDashboard: React.FC<SplinterDashboardProps> = ({ onRefresh }) => {
  const [report, setReport] = useState<SplinterReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'SECURITY' | 'PERFORMANCE'>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');

  const loadReport = async () => {
    try {
      setLoading(true);
      const result = await SplinterService.runLints();
      setReport(result);
    } catch (error) {
      console.error('Failed to load Splinter report:', error);
      Alert.alert(
        'Error',
        'Failed to load database performance report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefreshReport = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
    onRefresh?.();
  };

  useEffect(() => {
    loadReport();
  }, []);

  const getFilteredLints = () => {
    if (!report) return [];
    
    return report.lints.filter(lint => {
      const categoryMatch = selectedCategory === 'ALL' || lint.categories.includes(selectedCategory);
      const levelMatch = selectedLevel === 'ALL' || lint.level === selectedLevel;
      return categoryMatch && levelMatch;
    });
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return '#ff4444';
      case 'WARN': return '#ff8800';
      case 'INFO': return '#2196f3';
      default: return '#666';
    }
  };

  const getCategoryIcon = (categories: string[]) => {
    if (categories.includes('SECURITY')) return '🔒';
    if (categories.includes('PERFORMANCE')) return '⚡';
    return '📋';
  };

  const renderLintCard = (lint: SplinterLint) => (
    <View key={lint.cache_key} style={styles.lintCard}>
      <View style={styles.lintHeader}>
        <View style={styles.lintTitleRow}>
          <Text style={[styles.lintLevel, { color: getLevelColor(lint.level) }]}>
            {lint.level}
          </Text>
          <Text style={styles.lintTitle}>{lint.title}</Text>
        </View>
        <Text style={styles.lintCategories}>
          {getCategoryIcon(lint.categories)} {lint.categories.join(', ')}
        </Text>
      </View>
      
      <Text style={styles.lintDescription}>{lint.description}</Text>
      <Text style={styles.lintDetail}>{lint.detail}</Text>
      
      {lint.remediation && (
        <TouchableOpacity
          style={styles.remediationButton}
          onPress={() => Alert.alert('Remediation', lint.remediation || '')}
        >
          <Text style={styles.remediationText}>View Solution</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSummary = () => {
    if (!report) return null;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Database Health Summary</Text>
        
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{report.summary.total}</Text>
            <Text style={styles.summaryLabel}>Total Issues</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#ff4444' }]}>
              {report.summary.errors}
            </Text>
            <Text style={styles.summaryLabel}>Errors</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#ff8800' }]}>
              {report.summary.warnings}
            </Text>
            <Text style={styles.summaryLabel}>Warnings</Text>
          </View>
          
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: '#2196f3' }]}>
              {report.summary.info}
            </Text>
            <Text style={styles.summaryLabel}>Info</Text>
          </View>
        </View>
        
        <View style={styles.categorySummary}>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryIcon}>🔒</Text>
            <Text style={styles.categoryCount}>{report.summary.security}</Text>
            <Text style={styles.categoryLabel}>Security</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryIcon}>⚡</Text>
            <Text style={styles.categoryCount}>{report.summary.performance}</Text>
            <Text style={styles.categoryLabel}>Performance</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Text style={styles.filtersTitle}>Filters</Text>
      
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Category:</Text>
        <View style={styles.filterButtons}>
          {(['ALL', 'SECURITY', 'PERFORMANCE'] as const).map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedCategory === category && styles.filterButtonTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Level:</Text>
        <View style={styles.filterButtons}>
          {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterButton,
                selectedLevel === level && styles.filterButtonActive
              ]}
              onPress={() => setSelectedLevel(level)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedLevel === level && styles.filterButtonTextActive
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Analyzing database performance...</Text>
      </View>
    );
  }

  const filteredLints = getFilteredLints();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefreshReport} />
      }
    >
      {renderSummary()}
      {renderFilters()}
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          Issues Found ({filteredLints.length})
        </Text>
        
        {filteredLints.length === 0 ? (
          <View style={styles.noIssuesContainer}>
            <Text style={styles.noIssuesIcon}>✅</Text>
            <Text style={styles.noIssuesTitle}>No Issues Found</Text>
            <Text style={styles.noIssuesText}>
              Your database looks good! No performance or security issues detected.
            </Text>
          </View>
        ) : (
          filteredLints.map(renderLintCard)
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  categorySummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  filterButtons: {
    flexDirection: 'row',
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  resultsContainer: {
    margin: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  noIssuesContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noIssuesIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noIssuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  noIssuesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  lintCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lintHeader: {
    marginBottom: 12,
  },
  lintTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lintLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
  },
  lintTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  lintCategories: {
    fontSize: 12,
    color: '#666',
  },
  lintDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  lintDetail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    lineHeight: 16,
  },
  remediationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  remediationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SplinterDashboard; 