import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  DataTable,
  IconButton,
  Modal,
  Paragraph,
  Portal,
  SegmentedButtons,
  Surface,
  TextInput,
  Title
} from 'react-native-paper';
import { useThemeColor } from '../../../hooks/useThemeColor';
import EidMubarakThemeManager from '../../components/EidMubarakThemeManager';
import LanguageSelector from '../../components/LanguageSelector';
import ThemeDebugger from '../../components/ThemeDebugger';
import { dataCleanupService } from '../../services/dataCleanupService';
import { userService } from '../../services/userService';
import { useAppDispatch } from '../../store';
import { logoutUser } from '../../store/authSlice';

function SystemSettings() {
  const { t } = useTranslation();
  
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

  const dispatch = useAppDispatch();

  // Studio Settings State
  const [studioSettings, setStudioSettings] = useState({
    studioName: 'ANIMO Pilates Studio',
    email: 'info@animopilates.com',
    phone: '+1 (555) 123-4567',
    address: '123 Wellness Street, City, State 12345',
  });

  // Data Management State
  const [dataStats, setDataStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [userStorageData, setUserStorageData] = useState<{[key: string]: any}>({});
  const [activeTab, setActiveTab] = useState('studio');
  const [usersPerPage] = useState(10);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  
  // Cleanup State
  const [cleanupModalVisible, setCleanupModalVisible] = useState(false);
  const [userCleanupModalVisible, setUserCleanupModalVisible] = useState(false);
  const [tableCleanupModalVisible, setTableCleanupModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [cleanupDays, setCleanupDays] = useState('30');
  const [cleanupType, setCleanupType] = useState<'days' | 'months'>('days');
  const [tableCleanupDays, setTableCleanupDays] = useState('30');
  const [tableCleanupType, setTableCleanupType] = useState<'days' | 'months'>('days');
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [lastCleanupResults, setLastCleanupResults] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'data') {
      loadDataStats();
      loadUsers();
    }
  }, [activeTab]);

  const loadDataStats = async () => {
    try {
      console.log('🔧 [DEBUG] Loading data statistics...');
      setLoadingStats(true);
      const stats = await dataCleanupService.getDataStatistics();
      console.log('🔧 [DEBUG] Data stats loaded:', stats);
      setDataStats(stats);
    } catch (error) {
      console.error('🔧 [DEBUG] Error loading data stats:', error);
      Alert.alert('Error', 'Failed to load data statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await userService.getUsers();
      if (response.success && response.data) {
        const clientUsers = response.data.filter((user: any) => user.role === 'client');
        setAllUsers(clientUsers);
        setUsers(clientUsers);
        
        // Load first page of users
        const firstPageUsers = clientUsers.slice(0, usersPerPage);
        setDisplayedUsers(firstPageUsers);
        setCurrentUserPage(1);
        
        // Load storage data for first page users
        await loadUserStorageData(firstPageUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadUserStorageData = async (usersToLoad: any[]) => {
    try {
      const storagePromises = usersToLoad.map(async (user) => {
        try {
          const stats = await dataCleanupService.getUserDataStatistics(user.id);
          return { userId: user.id, ...stats };
        } catch (error) {
          console.error(`Error loading storage for user ${user.id}:`, error);
          return { userId: user.id, total: 0, estimatedSizeMB: 0 };
        }
      });
      
      const storageResults = await Promise.all(storagePromises);
      const storageMap: {[key: string]: any} = {};
      
      storageResults.forEach(result => {
        storageMap[result.userId] = result;
      });
      
      setUserStorageData(prev => ({ ...prev, ...storageMap }));
    } catch (error) {
      console.error('Error loading user storage data:', error);
    }
  };

  const loadMoreUsers = async () => {
    if (loadingMoreUsers) return;
    
    try {
      setLoadingMoreUsers(true);
      const nextPage = currentUserPage + 1;
      const startIndex = (nextPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      const nextPageUsers = allUsers.slice(startIndex, endIndex);
      
      if (nextPageUsers.length > 0) {
        setDisplayedUsers(prev => [...prev, ...nextPageUsers]);
        setCurrentUserPage(nextPage);
        
        // Load storage data for new users
        await loadUserStorageData(nextPageUsers);
      }
    } catch (error) {
      console.error('Error loading more users:', error);
    } finally {
      setLoadingMoreUsers(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutUser());
          },
        },
      ]
    );
  };

  const handleSaveStudioSettings = () => {
    Alert.alert(t('messages.success'), t('settings.settingsSaved'));
  };

  const handleAutomaticCleanup = async () => {
    console.log('🔧 [DEBUG] Automatic cleanup button pressed');
    console.log('🔧 [DEBUG] Directly calling runAutomaticCleanup to bypass dialog');
    // Skip dialog for now and directly run cleanup
    await runAutomaticCleanup();
  };

  const runAutomaticCleanup = async () => {
    console.log('🔧 [DEBUG] Starting automatic cleanup process');
    try {
      setCleanupInProgress(true);
      console.log('🔧 [DEBUG] Calling dataCleanupService.runAutomaticCleanup()');
      const results = await dataCleanupService.runAutomaticCleanup();
      console.log('🔧 [DEBUG] Cleanup results:', results);
      setLastCleanupResults(results);
      
      Alert.alert(
        'Cleanup Complete',
        `Successfully deleted ${results.totalDeleted} records:\n` +
        `• Classes: ${results.classes.deletedCount}\n` +
        `• Notifications: ${results.notifications.deletedCount}`
      );
      
      // Reload stats
      console.log('🔧 [DEBUG] Reloading data stats');
      await loadDataStats();
    } catch (error) {
      console.error('🔧 [DEBUG] Cleanup error:', error);
      Alert.alert('Error', 'Failed to run automatic cleanup');
    } finally {
      console.log('🔧 [DEBUG] Cleanup process completed');
      setCleanupInProgress(false);
    }
  };

  const handleBulkCleanup = (table: string) => {
    setCleanupModalVisible(true);
  };

  const handleSpecificTableCleanup = async (tableName: string) => {
    console.log(`🔧 [DEBUG] Table cleanup button pressed for: ${tableName}`);
    setSelectedTable(tableName);
    
    // Set default values based on table type
    if (tableName.toLowerCase() === 'notifications') {
      setTableCleanupDays('10');
    } else if (tableName.toLowerCase() === 'users' || tableName.toLowerCase() === 'plans') {
      setTableCleanupDays('365');
    } else {
      setTableCleanupDays('30');
    }
    
    setTableCleanupModalVisible(true);
  };

  const runTableCleanup = async () => {
    if (!selectedTable) return;
    
    try {
      setCleanupInProgress(true);
      const days = parseInt(tableCleanupDays);
      const daysToUse = tableCleanupType === 'months' ? days * 30 : days;
      
      console.log(`🔧 [DEBUG] Starting cleanup for table: ${selectedTable} with ${daysToUse} days`);
      
      let result;
      switch (selectedTable.toLowerCase()) {
        case 'classes':
          result = await dataCleanupService.cleanupOldClasses({ daysOld: daysToUse });
          break;
        case 'notifications':
          result = await dataCleanupService.cleanupOldNotifications({ daysOld: daysToUse });
          break;
        case 'bookings':
          result = await dataCleanupService.cleanupOldBookings({ daysOld: daysToUse });
          break;
        case 'payments':
          result = await dataCleanupService.cleanupOldPayments({ daysOld: daysToUse });
          break;
        case 'subscriptions':
          result = await dataCleanupService.cleanupOldSubscriptions({ daysOld: daysToUse });
          break;
        case 'waitlist':
          result = await dataCleanupService.cleanupOldWaitlist({ daysOld: daysToUse });
          break;
        case 'users':
          result = await dataCleanupService.cleanupOldUsers({ daysOld: daysToUse });
          break;
        case 'plans':
          result = await dataCleanupService.cleanupOldPlans({ daysOld: daysToUse });
          break;
        default:
          throw new Error(`Unknown table: ${selectedTable}`);
      }
      
      console.log(`🔧 [DEBUG] Cleanup result for ${selectedTable}:`, result);
      const cleanupMessage = tableCleanupDays === '0' 
        ? `Successfully deleted ${result.deletedCount} records from ${selectedTable} table (ALL DATA CLEARED)`
        : `Successfully deleted ${result.deletedCount} records from ${selectedTable} table older than ${tableCleanupDays} ${tableCleanupType}`;
        
      Alert.alert('Table Cleanup Complete', cleanupMessage);
      
      setTableCleanupModalVisible(false);
      await loadDataStats();
    } catch (error) {
      console.error(`🔧 [DEBUG] ${selectedTable} cleanup error:`, error);
      Alert.alert('Error', `Failed to cleanup ${selectedTable} table: ${error.message || error}`);
    } finally {
      setCleanupInProgress(false);
    }
  };

  const handleUserCleanup = (user: any) => {
    setSelectedUser(user);
    setUserCleanupModalVisible(true);
  };

  const runBulkCleanup = async () => {
    try {
      setCleanupInProgress(true);
      const days = parseInt(cleanupDays);
      const daysToUse = cleanupType === 'months' ? days * 30 : days;
      
      // Run cleanup for all tables
      const results = await Promise.all([
        dataCleanupService.cleanupOldClasses({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldBookings({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldNotifications({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldPayments({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldSubscriptions({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldWaitlist({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldUsers({ daysOld: daysToUse }),
        dataCleanupService.cleanupOldPlans({ daysOld: daysToUse })
      ]);
      
      const totalDeleted = results.reduce((sum, result) => sum + result.deletedCount, 0);
      
      Alert.alert(
        'Bulk Cleanup Complete',
        `Successfully deleted ${totalDeleted} records older than ${cleanupDays} ${cleanupType}`
      );
      
      setCleanupModalVisible(false);
      await loadDataStats();
    } catch (error) {
      console.error('Bulk cleanup error:', error);
      Alert.alert('Error', 'Failed to run bulk cleanup');
    } finally {
      setCleanupInProgress(false);
    }
  };

  const runUserCleanup = async () => {
    if (!selectedUser) return;
    
    try {
      setCleanupInProgress(true);
      const days = parseInt(cleanupDays);
      const daysToUse = cleanupType === 'months' ? days * 30 : days;
      
      const results = await dataCleanupService.cleanupUserData(selectedUser.id, daysToUse);
      
      Alert.alert(
        'User Cleanup Complete',
        `Successfully deleted ${results.totalDeleted} records for ${selectedUser.name}:\n` +
        `• Classes: ${results.classes.deletedCount}\n` +
        `• Bookings: ${results.bookings.deletedCount}\n` +
        `• Notifications: ${results.notifications.deletedCount}\n` +
        `• Payments: ${results.payments.deletedCount}\n` +
        `• Subscriptions: ${results.subscriptions.deletedCount}\n` +
        `• Waitlist: ${results.waitlist.deletedCount}\n` +
        `• Client Data: ${results.clientData.deletedCount}`
      );
      
      setUserCleanupModalVisible(false);
      setSelectedUser(null);
      await loadDataStats();
    } catch (error) {
      console.error('User cleanup error:', error);
      Alert.alert('Error', 'Failed to run user cleanup');
    } finally {
      setCleanupInProgress(false);
    }
  };

  const renderStudioSettings = () => (
      <ScrollView style={styles.content}>
        <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="business" size={24} color={accentColor} />
              <Title style={[styles.sectionTitle, { color: textColor }]}>{t('settings.studioInformation')}</Title>
            </View>

            <TextInput
              label={t('settings.studioName')}
              value={studioSettings.studioName}
              onChangeText={(text) => setStudioSettings({...studioSettings, studioName: text})}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('profile.email')}
              value={studioSettings.email}
              onChangeText={(text) => setStudioSettings({...studioSettings, email: text})}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label={t('profile.phone')}
              value={studioSettings.phone}
              onChangeText={(text) => setStudioSettings({...studioSettings, phone: text})}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label={t('profile.address')}
              value={studioSettings.address}
              onChangeText={(text) => setStudioSettings({...studioSettings, address: text})}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            {/* Language Selection */}
            <View style={styles.languageSection}>
              <LanguageSelector showAsButton={false} />
            </View>

            <Button
              mode="contained"
              onPress={handleSaveStudioSettings}
              style={[styles.saveButton, { backgroundColor: accentColor }]}
            >
              {t('settings.saveSettings')}
            </Button>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="exit-to-app" size={24} color={errorColor} />
              <Title style={[styles.sectionTitle, { color: textColor }]}>Account</Title>
            </View>

            <Paragraph style={[styles.logoutDescription, { color: textSecondaryColor }]}>
              Sign out of your administrator account
            </Paragraph>

            <Button
              mode="outlined"
              onPress={handleLogout}
              style={[styles.logoutButton, { borderColor: errorColor }]}
              labelStyle={{ color: errorColor }}
              icon="logout"
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
  );

  const renderDataManagement = () => (
    <ScrollView style={styles.content}>
      {/* Automatic Cleanup Card */}
      <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="auto-delete" size={24} color={warningColor} />
            <Title style={[styles.sectionTitle, { color: textColor }]}>Automatic Cleanup</Title>
          </View>

          <Paragraph style={[styles.description, { color: textSecondaryColor }]}>
            Automatically clean up old data based on system defaults:
            {'\n'}• Classes older than 30 days
            {'\n'}• Notifications older than 10 days
          </Paragraph>

          <Button
            mode="contained"
            onPress={handleAutomaticCleanup}
            style={[styles.cleanupButton, { backgroundColor: warningColor }]}
            disabled={cleanupInProgress}
            loading={cleanupInProgress}
            icon="play-arrow"
          >
            Run Automatic Cleanup
          </Button>
        </Card.Content>
      </Card>

      {/* Data Statistics Card */}
      <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="bar-chart" size={24} color={primaryColor} />
            <Title style={[styles.sectionTitle, { color: textColor }]}>Database Statistics</Title>
            <IconButton
              icon="refresh"
              size={20}
              onPress={loadDataStats}
              disabled={loadingStats}
              iconColor={primaryColor}
            />
          </View>

          {loadingStats ? (
            <ActivityIndicator size="small" color={primaryColor} style={styles.loader} />
          ) : dataStats ? (
            <View>
              {/* Database Overview */}
              <View style={[styles.overviewContainer, { backgroundColor: primaryColor + '10', borderColor: primaryColor + '30' }]}>
                <Title style={[styles.overviewTitle, { color: primaryColor }]}>Database Overview</Title>
                <View style={styles.overviewStats}>
                  <View style={styles.overviewStat}>
                    <Title style={[styles.overviewNumber, { color: textColor }]}>{dataStats.totalRecords}</Title>
                    <Paragraph style={[styles.overviewLabel, { color: textSecondaryColor }]}>Total Records</Paragraph>
                  </View>
                  <View style={styles.overviewStat}>
                    <Title style={[styles.overviewNumber, { color: textColor }]}>{dataStats.estimatedSizeMB} MB</Title>
                    <Paragraph style={[styles.overviewLabel, { color: textSecondaryColor }]}>Estimated Size</Paragraph>
                  </View>
                </View>
              </View>

              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Table</DataTable.Title>
                  <DataTable.Title numeric>Total</DataTable.Title>
                  <DataTable.Title numeric>Old Data</DataTable.Title>
                  <DataTable.Title>Action</DataTable.Title>
                </DataTable.Header>

                {/* Core tables - always show */}
                <DataTable.Row>
                  <DataTable.Cell>Users</DataTable.Cell>
                  <DataTable.Cell numeric>{dataStats.users?.total || 0}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Chip 
                      mode="outlined" 
                      textStyle={{ color: (dataStats.users?.old || 0) > 0 ? warningColor : successColor }}
                      style={{ borderColor: (dataStats.users?.old || 0) > 0 ? warningColor : successColor }}
                    >
                      {dataStats.users?.old || 0}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <IconButton
                      icon="delete-sweep"
                      size={20}
                      onPress={() => handleSpecificTableCleanup('users')}
                      iconColor={errorColor}
                    />
                  </DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Classes</DataTable.Cell>
                  <DataTable.Cell numeric>{dataStats.classes?.total || 0}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Chip 
                      mode="outlined" 
                      textStyle={{ color: (dataStats.classes?.old || 0) > 0 ? warningColor : successColor }}
                      style={{ borderColor: (dataStats.classes?.old || 0) > 0 ? warningColor : successColor }}
                    >
                      {dataStats.classes?.old || 0}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <IconButton
                      icon="delete-sweep"
                      size={20}
                      onPress={() => handleSpecificTableCleanup('classes')}
                      iconColor={errorColor}
                    />
                  </DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Notifications</DataTable.Cell>
                  <DataTable.Cell numeric>{dataStats.notifications?.total || 0}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Chip 
                      mode="outlined" 
                      textStyle={{ color: (dataStats.notifications?.old || 0) > 0 ? warningColor : successColor }}
                      style={{ borderColor: (dataStats.notifications?.old || 0) > 0 ? warningColor : successColor }}
                    >
                      {dataStats.notifications?.old || 0}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <IconButton
                      icon="delete-sweep"
                      size={20}
                      onPress={() => handleSpecificTableCleanup('notifications')}
                      iconColor={errorColor}
                    />
                  </DataTable.Cell>
                </DataTable.Row>

                <DataTable.Row>
                  <DataTable.Cell>Subscription Plans</DataTable.Cell>
                  <DataTable.Cell numeric>{dataStats.plans?.total || 0}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    <Chip 
                      mode="outlined" 
                      textStyle={{ color: (dataStats.plans?.old || 0) > 0 ? warningColor : successColor }}
                      style={{ borderColor: (dataStats.plans?.old || 0) > 0 ? warningColor : successColor }}
                    >
                      {dataStats.plans?.old || 0}
                    </Chip>
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <IconButton
                      icon="delete-sweep"
                      size={20}
                      onPress={() => handleSpecificTableCleanup('plans')}
                      iconColor={errorColor}
                    />
                  </DataTable.Cell>
                </DataTable.Row>

                {/* Optional tables - show if they have data */}
                {(dataStats.bookings?.total > 0 || dataStats.bookings?.old > 0) && (
                  <DataTable.Row>
                    <DataTable.Cell>Bookings</DataTable.Cell>
                    <DataTable.Cell numeric>{dataStats.bookings.total}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Chip 
                        mode="outlined" 
                        textStyle={{ color: dataStats.bookings.old > 0 ? warningColor : successColor }}
                        style={{ borderColor: dataStats.bookings.old > 0 ? warningColor : successColor }}
                      >
                        {dataStats.bookings.old}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <IconButton
                        icon="delete-sweep"
                        size={20}
                        onPress={() => handleSpecificTableCleanup('bookings')}
                        iconColor={errorColor}
                      />
                    </DataTable.Cell>
                  </DataTable.Row>
                )}

                {(dataStats.payments?.total > 0 || dataStats.payments?.old > 0) && (
                  <DataTable.Row>
                    <DataTable.Cell>Payments</DataTable.Cell>
                    <DataTable.Cell numeric>{dataStats.payments.total}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Chip 
                        mode="outlined" 
                        textStyle={{ color: dataStats.payments.old > 0 ? warningColor : successColor }}
                        style={{ borderColor: dataStats.payments.old > 0 ? warningColor : successColor }}
                      >
                        {dataStats.payments.old}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <IconButton
                        icon="delete-sweep"
                        size={20}
                        onPress={() => handleSpecificTableCleanup('payments')}
                        iconColor={errorColor}
                      />
                    </DataTable.Cell>
                  </DataTable.Row>
                )}

                {(dataStats.subscriptions?.total > 0 || dataStats.subscriptions?.old > 0) && (
                  <DataTable.Row>
                    <DataTable.Cell>Subscriptions</DataTable.Cell>
                    <DataTable.Cell numeric>{dataStats.subscriptions.total}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Chip 
                        mode="outlined" 
                        textStyle={{ color: dataStats.subscriptions.old > 0 ? warningColor : successColor }}
                        style={{ borderColor: dataStats.subscriptions.old > 0 ? warningColor : successColor }}
                      >
                        {dataStats.subscriptions.old}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <IconButton
                        icon="delete-sweep"
                        size={20}
                        onPress={() => handleSpecificTableCleanup('subscriptions')}
                        iconColor={errorColor}
                      />
                    </DataTable.Cell>
                  </DataTable.Row>
                )}

                {(dataStats.waitlist?.total > 0 || dataStats.waitlist?.old > 0) && (
                  <DataTable.Row>
                    <DataTable.Cell>Waitlist</DataTable.Cell>
                    <DataTable.Cell numeric>{dataStats.waitlist.total}</DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Chip 
                        mode="outlined" 
                        textStyle={{ color: dataStats.waitlist.old > 0 ? warningColor : successColor }}
                        style={{ borderColor: dataStats.waitlist.old > 0 ? warningColor : successColor }}
                      >
                        {dataStats.waitlist.old}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <IconButton
                        icon="delete-sweep"
                        size={20}
                        onPress={() => handleSpecificTableCleanup('waitlist')}
                        iconColor={errorColor}
                      />
                    </DataTable.Cell>
                  </DataTable.Row>
                )}
              </DataTable>
            </View>
          ) : (
            <Paragraph style={{ color: textSecondaryColor }}>No data available</Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* User Data Management Card */}
      <Card style={[styles.card, { backgroundColor: surfaceColor, borderColor: textMutedColor }]}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={24} color={accentColor} />
            <Title style={[styles.sectionTitle, { color: textColor }]}>User Data Management</Title>
          </View>

          <Paragraph style={[styles.description, { color: textSecondaryColor }]}>
            Clear data for individual users with custom time periods
          </Paragraph>

          {loadingUsers ? (
            <ActivityIndicator size="small" color={primaryColor} style={styles.loader} />
          ) : (
            <View>
              {/* User Statistics Overview */}
              <View style={[styles.userStatsContainer, { backgroundColor: accentColor + '10', borderColor: accentColor + '30' }]}>
                <View style={styles.userStatsRow}>
                  <View style={styles.userStat}>
                    <Title style={[styles.userStatNumber, { color: textColor }]}>{allUsers.length}</Title>
                    <Paragraph style={[styles.userStatLabel, { color: textSecondaryColor }]}>Total Users</Paragraph>
                  </View>
                  <View style={styles.userStat}>
                    <Title style={[styles.userStatNumber, { color: textColor }]}>{displayedUsers.length}</Title>
                    <Paragraph style={[styles.userStatLabel, { color: textSecondaryColor }]}>Loaded</Paragraph>
                  </View>
                </View>
              </View>

              {/* User List */}
              {displayedUsers.map((user) => {
                const userData = userStorageData[user.id];
                return (
                  <Surface key={user.id} style={[styles.userItem, { backgroundColor: backgroundColor }]}>
                    <View style={styles.userInfo}>
                      <Title style={[styles.userName, { color: textColor }]}>{user.name}</Title>
                      <Paragraph style={[styles.userEmail, { color: textSecondaryColor }]}>{user.email}</Paragraph>
                      {userData ? (
                        <View style={styles.userStorageInfo}>
                          <Chip 
                            mode="outlined" 
                            compact 
                            style={[styles.storageChip, { borderColor: primaryColor + '50' }]}
                            textStyle={{ color: primaryColor, fontSize: 12 }}
                          >
                            {userData.total} records
                          </Chip>
                          <Chip 
                            mode="outlined" 
                            compact 
                            style={[styles.storageChip, { borderColor: accentColor + '50' }]}
                            textStyle={{ color: accentColor, fontSize: 12 }}
                          >
                            {userData.estimatedSizeMB} MB
                          </Chip>
                        </View>
                      ) : (
                        <ActivityIndicator size="small" color={textMutedColor} style={styles.userLoader} />
                      )}
                    </View>
                    <Button
                      mode="outlined"
                      onPress={() => handleUserCleanup(user)}
                      style={[styles.userCleanupButton, { borderColor: errorColor }]}
                      labelStyle={{ color: errorColor }}
                      icon="delete-outline"
                      compact
                    >
                      Clear Data
                    </Button>
                  </Surface>
                );
              })}
              
              {/* Load More Button */}
              {displayedUsers.length < allUsers.length && (
                <View style={styles.loadMoreContainer}>
                  <Button
                    mode="contained"
                    onPress={loadMoreUsers}
                    loading={loadingMoreUsers}
                    disabled={loadingMoreUsers}
                    style={[styles.loadMoreButton, { backgroundColor: primaryColor }]}
                    icon="account-multiple"
                  >
                    Load More Users ({allUsers.length - displayedUsers.length} remaining)
                  </Button>
                </View>
              )}

              {/* All Users Loaded Message */}
              {displayedUsers.length === allUsers.length && allUsers.length > usersPerPage && (
                <Paragraph style={[styles.allLoadedText, { color: textSecondaryColor }]}>
                  All {allUsers.length} users loaded
                </Paragraph>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomWidth: 1, borderBottomColor: textMutedColor }]}>
        <Title style={[styles.headerTitle, { color: textColor }]}>{t('settings.systemSettings')}</Title>
        <Paragraph style={[styles.headerSubtitle, { color: textSecondaryColor }]}>
          {activeTab === 'studio' ? t('settings.studioSettings') : t('settings.dataManagement')}
        </Paragraph>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: surfaceColor }]}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'studio',
              label: t('settings.studioSettings'),
              icon: 'business',
            },
            {
              value: 'data',
              label: t('settings.dataManagement'),
              icon: 'database',
            },
            {
              value: 'themes',
              label: 'Eid Mubarak Themes',
              icon: 'palette',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {activeTab === 'studio' ? renderStudioSettings() : 
       activeTab === 'data' ? renderDataManagement() :
       activeTab === 'themes' ? (
         <ScrollView style={styles.content}>
           <EidMubarakThemeManager />
         </ScrollView>
       ) : renderStudioSettings()}

      {/* Theme Debugger - only show in development */}
      {__DEV__ && <ThemeDebugger />}

      {/* Bulk Cleanup Modal */}
      <Portal>
        <Modal visible={cleanupModalVisible} onDismiss={() => setCleanupModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}>
          <Title style={[styles.modalTitle, { color: textColor }]}>Bulk Data Cleanup</Title>
          <Paragraph style={[styles.modalDescription, { color: textSecondaryColor }]}>
            Delete old records from all database tables
          </Paragraph>

          <View style={styles.inputRow}>
            <TextInput
              label="Time Period"
              value={cleanupDays}
              onChangeText={setCleanupDays}
              mode="outlined"
              keyboardType="numeric"
              style={styles.timeInput}
            />
            <SegmentedButtons
              value={cleanupType}
              onValueChange={(value) => setCleanupType(value as typeof cleanupType)}
              buttons={[
                { value: 'days', label: 'Days' },
                { value: 'months', label: 'Months' },
              ]}
              style={styles.typeSelector}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setCleanupModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={runBulkCleanup}
              loading={cleanupInProgress}
              disabled={cleanupInProgress}
              style={[styles.confirmButton, { backgroundColor: errorColor }]}
            >
              Delete Data
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* User Cleanup Modal */}
      <Portal>
        <Modal visible={userCleanupModalVisible} onDismiss={() => setUserCleanupModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            Clear Data for {selectedUser?.name}
          </Title>
          <Paragraph style={[styles.modalDescription, { color: textSecondaryColor }]}>
            Delete all data older than the specified time period for this user
          </Paragraph>

          <View style={styles.inputRow}>
            <TextInput
              label="Time Period"
              value={cleanupDays}
              onChangeText={setCleanupDays}
              mode="outlined"
              keyboardType="numeric"
              style={styles.timeInput}
            />
            <SegmentedButtons
              value={cleanupType}
              onValueChange={(value) => setCleanupType(value as typeof cleanupType)}
              buttons={[
                { value: 'days', label: 'Days' },
                { value: 'months', label: 'Months' },
              ]}
              style={styles.typeSelector}
            />
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setUserCleanupModalVisible(false);
                setSelectedUser(null);
              }}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={runUserCleanup}
              loading={cleanupInProgress}
              disabled={cleanupInProgress}
              style={[styles.confirmButton, { backgroundColor: errorColor }]}
            >
              Delete Data
            </Button>
          </View>
        </Modal>

        {/* Table Cleanup Modal */}
        <Modal visible={tableCleanupModalVisible} onDismiss={() => setTableCleanupModalVisible(false)} contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}>
          <Title style={[styles.modalTitle, { color: textColor }]}>Clean {selectedTable} Table</Title>
          <Paragraph style={[styles.modalDescription, { color: textSecondaryColor }]}>
            Delete old records from the {selectedTable} table
          </Paragraph>

          <View style={styles.inputRow}>
            <TextInput
              label="Time Period"
              value={tableCleanupDays}
              onChangeText={setTableCleanupDays}
              mode="outlined"
              keyboardType="numeric"
              style={styles.timeInput}
            />
            <SegmentedButtons
              value={tableCleanupType}
              onValueChange={(value) => setTableCleanupType(value as 'days' | 'months')}
              buttons={[
                { value: 'days', label: 'Days' },
                { value: 'months', label: 'Months' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <Paragraph style={[styles.warningText, { color: warningColor }]}>
            ⚠️ This will permanently delete {selectedTable} records {tableCleanupDays === '0' ? '(ALL DATA WILL BE CLEARED!)' : `older than ${tableCleanupDays} ${tableCleanupType}`}
          </Paragraph>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setTableCleanupModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={runTableCleanup}
              loading={cleanupInProgress}
              disabled={cleanupInProgress}
              style={[styles.confirmButton, { backgroundColor: errorColor }]}
            >
              Clean Table
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be overridden by inline style
  },
  header: {
    padding: 20,
    paddingTop: 60,
    // backgroundColor, borderBottomWidth, borderBottomColor will be overridden by inline style
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    // color will be overridden by inline style
  },
  headerSubtitle: {
    marginTop: 5,
    // color will be overridden by inline style
  },
  tabContainer: {
    padding: 16,
    paddingBottom: 8,
    // backgroundColor will be overridden by inline style
  },
  segmentedButtons: {
    // Additional styling for segmented buttons if needed
  },
  content: {
    flex: 1,
    padding: 15,
  },
  card: {
    marginBottom: 20,
    borderRadius: 8,
    padding: 16,
    elevation: 2,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    // backgroundColor and borderColor will be overridden by inline style
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    // color will be overridden by inline style
  },
  description: {
    marginBottom: 16,
    lineHeight: 20,
    // color will be overridden by inline style
  },
  input: {
    marginBottom: 15,
  },
  saveButton: {
    marginTop: 10,
    // backgroundColor will be overridden by inline style
  },
  logoutDescription: {
    marginBottom: 20,
    // color will be overridden by inline style
  },
  logoutButton: {
    marginTop: 10,
    // borderColor will be overridden by inline style
  },
  cleanupButton: {
    marginTop: 16,
    // backgroundColor will be overridden by inline style
  },
  loader: {
    marginVertical: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
    // backgroundColor will be overridden by inline style
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    // color will be overridden by inline style
  },
  userEmail: {
    fontSize: 14,
    // color will be overridden by inline style
  },
  userCleanupButton: {
    marginLeft: 12,
    // borderColor will be overridden by inline style
  },
  moreUsersText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
    // color will be overridden by inline style
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    // backgroundColor will be overridden by inline style
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    // color will be overridden by inline style
  },
  modalDescription: {
    marginBottom: 20,
    lineHeight: 20,
    // color will be overridden by inline style
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 24,
  },
  timeInput: {
    flex: 1,
  },
  typeSelector: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    // Additional styling if needed
  },
  confirmButton: {
    // backgroundColor will be overridden by inline style
  },
  // Database Overview Styles
  overviewContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  // User Statistics Styles
  userStatsContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  userStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  userStat: {
    alignItems: 'center',
  },
  userStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userStatLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  userStorageInfo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  storageChip: {
    height: 24,
    marginRight: 4,
  },
  userLoader: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  loadMoreContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  loadMoreButton: {
    minWidth: 200,
  },
  allLoadedText: {
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  languageSection: {
    marginVertical: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});

export default SystemSettings; 