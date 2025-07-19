import { Body, Caption, H1, H2 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { useThemeColor } from '@/hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store';

const { width: screenWidth } = Dimensions.get('window');
const isLargeScreen = screenWidth > 1024;

function ResponsiveAdminDashboard() {
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

  // Mobile layout
  if (!isLargeScreen) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.mobileWarning}>
          📱 Admin Portal is optimized for desktop use. 
          Please use a larger screen for the best experience.
        </Text>
        <ScrollView 
          style={styles.mobileContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Mobile-optimized dashboard content */}
          <PaperCard style={[styles.mobileCard, { backgroundColor: surfaceColor }]}>
            <PaperCard.Content>
              <H2 style={{...styles.cardTitle, color: textColor}}>Studio Overview</H2>
              <View style={styles.mobileMetricsGrid}>
                <View style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}>
                  <MaterialIcons name="people" size={20} color={accentColor} />
                  <Body style={{...styles.mobileMetricNumber, color: textColor}}>{metrics.totalClients}</Body>
                  <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>Total Clients</Caption>
                </View>
                
                <View style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}>
                  <MaterialIcons name="fitness-center" size={20} color={accentColor} />
                  <Body style={{...styles.mobileMetricNumber, color: textColor}}>{metrics.activeInstructors}</Body>
                  <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>Instructors</Caption>
                </View>
                
                <View style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}>
                  <MaterialIcons name="event" size={20} color={accentColor} />
                  <Body style={{...styles.mobileMetricNumber, color: textColor}}>{metrics.classesThisWeek}</Body>
                  <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>Classes</Caption>
                </View>
                
                <View style={[styles.mobileMetricItem, { backgroundColor: surfaceColor }]}>
                  <MaterialIcons name="trending-up" size={20} color={accentColor} />
                  <Body style={{...styles.mobileMetricNumber, color: textColor}}>{metrics.attendanceRate}%</Body>
                  <Caption style={{...styles.mobileMetricLabel, color: textSecondaryColor}}>Attendance</Caption>
                </View>
              </View>
            </PaperCard.Content>
          </PaperCard>

          <PaperCard style={[styles.mobileCard, { backgroundColor: surfaceColor }]}>
            <PaperCard.Content>
              <H2 style={{...styles.cardTitle, color: textColor}}>Quick Actions</H2>
              <View style={styles.mobileActionButtons}>
                <PaperButton 
                  mode="contained" 
                  style={styles.mobilePrimaryAction}
                  labelStyle={styles.mobileActionLabel}
                  onPress={handleViewUsers}
                >
                  Manage Users
                </PaperButton>
                
                <PaperButton 
                  mode="outlined" 
                  style={styles.mobileSecondaryAction}
                  labelStyle={styles.mobileActionLabel}
                  onPress={handleViewClasses}
                >
                  View Classes
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </ScrollView>
      </View>
    );
  }

  // Desktop layout
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
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  headerTitle: {
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
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
    marginBottom: spacing.md,
  },
  
  // Metrics Grid - Desktop
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
    padding: spacing.md,
    borderRadius: spacing.sm,
    borderWidth: 1,
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
  },
  metricLabel: {
    textAlign: 'center',
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

  // Mobile Styles
  mobileContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileWarning: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  mobileContent: {
    flex: 1,
    width: '100%',
  },
  mobileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8E6E3',
  },
  mobileMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileMetricItem: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E6E3',
    marginBottom: 8,
  },
  mobileMetricNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
  },
  mobileMetricLabel: {
    textAlign: 'center',
    fontSize: 12,
  },
  mobileActionButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  mobilePrimaryAction: {
    backgroundColor: '#6B8E7F',
    borderRadius: 16,
    marginBottom: 8,
  },
  mobileSecondaryAction: {
    borderColor: '#E8E6E3',
    borderRadius: 16,
    marginBottom: 8,
  },
  mobileActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
});

export default ResponsiveAdminDashboard; 