import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { useThemeColor } from '@/hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';

function AdminDashboard() {
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    activeInstructors: 0,
    classesThisWeek: 0,
    attendanceRate: 0,
    revenueThisMonth: 0,
    newSignupsThisWeek: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate loading dashboard metrics
      // In real app, this would call APIs to get metrics
      setMetrics({
        totalClients: 45,
        activeInstructors: 3,
        classesThisWeek: 28,
        attendanceRate: 87,
        revenueThisMonth: 12450,
        newSignupsThisWeek: 8,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleViewUsers = () => {
    // Navigation will be handled by tab navigator
    console.log('Navigate to Users tab');
  };

  const handleViewClasses = () => {
    console.log('Navigate to Classes');
  };

  const handleViewReports = () => {
    console.log('Navigate to Reports');
  };

  const handleSettings = () => {
    console.log('Navigate to Settings');
  };

  const handleAssignmentHistory = () => {
    (navigation as any).navigate('AssignmentHistory');
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <H1 style={{...styles.headerTitle, color: textColor}}>ANIMO Studio</H1>
        <Caption style={{...styles.headerSubtitle, color: textSecondaryColor}}>Administrator Dashboard</Caption>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Metrics Overview */}
        <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={{...styles.cardTitle, color: textColor}}>Studio Overview</H2>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricItem, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                <View style={styles.metricHeader}>
                  <MaterialIcons name="people" size={24} color={accentColor} />
                  <Body style={{...styles.metricNumber, color: textColor}}>{metrics.totalClients}</Body>
                </View>
                <Caption style={{...styles.metricLabel, color: textSecondaryColor}}>Total Clients</Caption>
              </View>
              
              <View style={[styles.metricItem, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                <View style={styles.metricHeader}>
                  <MaterialIcons name="fitness-center" size={24} color={accentColor} />
                  <Body style={{...styles.metricNumber, color: textColor}}>{metrics.activeInstructors}</Body>
                </View>
                <Caption style={{...styles.metricLabel, color: textSecondaryColor}}>Active Instructors</Caption>
              </View>
              
              <View style={[styles.metricItem, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                <View style={styles.metricHeader}>
                  <MaterialIcons name="event" size={24} color={accentColor} />
                  <Body style={{...styles.metricNumber, color: textColor}}>{metrics.classesThisWeek}</Body>
                </View>
                <Caption style={{...styles.metricLabel, color: textSecondaryColor}}>Classes This Week</Caption>
              </View>
              
              <View style={[styles.metricItem, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
                <View style={styles.metricHeader}>
                  <MaterialIcons name="trending-up" size={24} color={accentColor} />
                  <Body style={{...styles.metricNumber, color: textColor}}>{metrics.attendanceRate}%</Body>
                </View>
                <Caption style={{...styles.metricLabel, color: textSecondaryColor}}>Attendance Rate</Caption>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Revenue & Growth */}
        <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={{...styles.cardTitle, color: textColor}}>Financial Overview</H2>
            <View style={styles.revenueSection}>
              <View style={styles.revenueItem}>
                <Body style={{...styles.revenueAmount, color: textColor}}>${metrics.revenueThisMonth.toLocaleString()}</Body>
                <Caption style={{...styles.revenueLabel, color: textSecondaryColor}}>Revenue This Month</Caption>
              </View>
              <View style={styles.revenueItem}>
                <Body style={{...styles.signupNumber, color: successColor}}>+{metrics.newSignupsThisWeek}</Body>
                <Caption style={{...styles.revenueLabel, color: textSecondaryColor}}>New Signups This Week</Caption>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Quick Actions */}
        <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={{...styles.cardTitle, color: textColor}}>Quick Actions</H2>
            
            <View style={styles.actionButtons}>
              <PaperButton 
                mode="contained" 
                style={styles.primaryAction}
                labelStyle={styles.primaryActionLabel}
                icon={() => <MaterialIcons name="people" size={20} color="white" />}
                onPress={handleViewUsers}
              >
                Manage Users
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="event" size={20} color={Colors.light.textSecondary} />}
                onPress={handleViewClasses}
              >
                View Classes
              </PaperButton>
            </View>
            
            <View style={styles.actionButtons}>
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="analytics" size={20} color={Colors.light.textSecondary} />}
                onPress={handleViewReports}
              >
                View Reports
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="assignment" size={20} color={Colors.light.textSecondary} />}
                onPress={handleAssignmentHistory}
              >
                Assignment History
              </PaperButton>
            </View>
            
            <View style={styles.actionButtons}>
              <PaperButton 
                mode="outlined" 
                style={styles.secondaryAction}
                labelStyle={styles.secondaryActionLabel}
                icon={() => <MaterialIcons name="settings" size={20} color={Colors.light.textSecondary} />}
                onPress={handleSettings}
              >
                Settings
              </PaperButton>
            </View>
          </PaperCard.Content>
        </PaperCard>

        {/* Recent Activity */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Recent Activity</H2>
            
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons name="person-add" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.activityContent}>
                <Body style={styles.activityText}>New client Jennifer Smith joined</Body>
                <Caption style={styles.activityTime}>2 hours ago</Caption>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons name="event" size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.activityContent}>
                <Body style={styles.activityText}>Morning Flow class completed</Body>
                <Caption style={styles.activityTime}>4 hours ago</Caption>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons name="payment" size={20} color={Colors.light.warning} />
              </View>
              <View style={styles.activityContent}>
                <Body style={styles.activityText}>Payment received: $189</Body>
                <Caption style={styles.activityTime}>6 hours ago</Caption>
              </View>
            </View>
          </PaperCard.Content>
        </PaperCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be overridden by inline style
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    // backgroundColor, borderBottomWidth, borderBottomColor will be overridden by inline style
  },
  headerTitle: {
    // color will be overridden by inline style
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    // color will be overridden by inline style
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 2,
    borderWidth: 1,
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    // color will be overridden by inline style
    marginBottom: spacing.md,
  },
  
  // Metrics Grid - Mobile Optimized
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metricItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    // backgroundColor will be overridden by inline style
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
    // borderColor will be overridden by inline style
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '700',
    // color will be overridden by inline style
  },
  metricLabel: {
    textAlign: 'center',
    // color will be overridden by inline style
  },
  
  // Revenue Section
  revenueSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.lg,
  },
  revenueItem: {
    alignItems: 'center',
    flex: 1,
  },
  revenueAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.accent,
    marginBottom: spacing.xs,
  },
  signupNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: spacing.xs,
  },
  revenueLabel: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 2,
  },
  primaryActionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
    paddingVertical: spacing.xs,
  },
  secondaryAction: {
    flex: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
  },
  secondaryActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    paddingVertical: spacing.xs,
  },
  
  // Activity Section
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    gap: spacing.md,
  },
  activityIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  activityTime: {
    color: Colors.light.textMuted,
  },
});

export default AdminDashboard; 