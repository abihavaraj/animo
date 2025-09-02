import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Modal, Button as PaperButton, Card as PaperCard, Portal } from 'react-native-paper';
import { useSelector } from 'react-redux';
import StatusChip from '../../components/ui/StatusChip';
import { Body, Caption, H1, H2, H3 } from '../../components/ui/Typography';
import { layout, spacing } from '../../constants/Spacing';
import { useThemeColor } from '../../hooks/useThemeColor';
import { RootState, useAppDispatch } from '../store';
import { logoutUser } from '../store/authSlice';
import { shadows } from '../utils/shadows';

function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const borderColor = useThemeColor({}, 'border');
  const dividerColor = useThemeColor({}, 'divider');
  const errorColor = useThemeColor({}, 'error');
  const warningColor = useThemeColor({}, 'warning');
  const successColor = useThemeColor({}, 'success');
  const surfaceVariantColor = useThemeColor({}, 'surfaceVariant');
  const textOnAccentColor = useThemeColor({}, 'textOnAccent');

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

  const handleEditProfile = () => {
    console.log('Navigate to Edit Profile');
  };

  const handleChangePassword = () => {
    console.log('Navigate to Change Password');
  };

  const handleNotificationSettings = () => {
    console.log('Navigate to Notification Settings');
  };

  const handlePaymentMethods = () => {
    console.log('Navigate to Payment Methods');
  };

  const handleBookingHistory = () => {
    console.log('Navigate to Booking History');
  };

  const handleContactSupport = () => {
    console.log('Navigate to Contact Support');
  };

  const showLogoutConfirmation = () => {
    setLogoutModalVisible(true);
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  const getUserRoleChipState = () => {
    switch (user?.role) {
      case 'admin':
        return 'warning';
      case 'instructor':
        return 'info';
      case 'client':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: surfaceColor, borderBottomColor: textMutedColor }]}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
          <View style={{
            width: 80,
            height: 80,
            backgroundColor: accentColor,
            borderRadius: 40,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2
          }}>
            <H2 style={[{ color: textOnAccentColor, fontSize: 24, fontWeight: '600' }] as any}>{getUserInitials()}</H2>
          </View>
          
          <View style={{
            flex: 1,
            marginLeft: 12
          }}>
            <H1 style={[{ color: textColor, fontSize: 32, fontWeight: '700', marginBottom: 8 }] as any}>{user?.name || 'User'}</H1>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 8
            }}>
              <StatusChip 
                state={getUserRoleChipState()}
                text={user?.role?.charAt(0).toUpperCase() + (user?.role?.slice(1) || '')}
                size="small"
              />
            </View>
            <Caption style={[{ color: textSecondaryColor, fontSize: 14 }] as any}>{user?.email}</Caption>
          </View>
        </View>
      </View>

      <ScrollView style={[styles.content, { backgroundColor }]}>      
        {/* Account Settings */}
        <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={[styles.cardTitle, { color: textColor }] as any}>Account Settings</H2>
            
                          <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={handleEditProfile}>
                <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                  <MaterialIcons name="edit" size={20} color={accentColor} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={[styles.settingTitle, { color: textColor }] as any}>Edit Profile</Body>
                  <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Update your personal information</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
              </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={handleChangePassword}>
              <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                <MaterialIcons name="lock" size={20} color={accentColor} />
              </View>
              <View style={styles.settingContent}>
                <Body style={[styles.settingTitle, { color: textColor }] as any}>Change Password</Body>
                <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Update your account security</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={handleNotificationSettings}>
              <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                <MaterialIcons name="notifications" size={20} color={accentColor} />
              </View>
              <View style={styles.settingContent}>
                <Body style={[styles.settingTitle, { color: textColor }] as any}>Notifications</Body>
                <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Manage your notification preferences</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
            </TouchableOpacity>
          </PaperCard.Content>
        </PaperCard>

        {/* Pilates Journey */}
        {user?.role === 'client' && (
          <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <PaperCard.Content style={styles.cardContent}>
              <H2 style={[styles.cardTitle, { color: textColor }] as any}>Your Pilates Journey</H2>
              
                              <View style={styles.journeyStats}>
                <View style={[styles.statItem, { backgroundColor: surfaceVariantColor }]}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="event" size={24} color={accentColor} />
                    <Body style={[styles.statNumber, { color: textColor }] as any}>24</Body>
                  </View>
                  <Caption style={[styles.statLabel, { color: textSecondaryColor }] as any}>Classes Attended</Caption>
                </View>
                
                <View style={[styles.statItem, { backgroundColor: surfaceVariantColor }]}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="local-fire-department" size={24} color={warningColor} />
                    <Body style={[styles.statNumber, { color: textColor }] as any}>12</Body>
                  </View>
                  <Caption style={[styles.statLabel, { color: textSecondaryColor }] as any}>Current Streak</Caption>
                </View>
                
                <View style={[styles.statItem, { backgroundColor: surfaceVariantColor }]}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="star" size={24} color={successColor} />
                    <Body style={[styles.statNumber, { color: textColor }] as any}>4.8</Body>
                  </View>
                  <Caption style={[styles.statLabel, { color: textSecondaryColor }] as any}>Avg Rating Given</Caption>
                </View>
              </View>
              
              <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={handleBookingHistory}>
                <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                  <MaterialIcons name="history" size={20} color={accentColor} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={[styles.settingTitle, { color: textColor }] as any}>Booking History</Body>
                  <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>View your past and upcoming classes</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
              </TouchableOpacity>
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Payment & Billing */}
        {user?.role === 'client' && (
          <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
            <PaperCard.Content style={styles.cardContent}>
              <H2 style={[styles.cardTitle, { color: textColor }] as any}>Payment & Billing</H2>
              
              <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={handlePaymentMethods}>
                <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                  <MaterialIcons name="payment" size={20} color={accentColor} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={[styles.settingTitle, { color: textColor }] as any}>Payment Methods</Body>
                  <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Manage your cards and payment options</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={() => console.log('Billing History')}>
                <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                  <MaterialIcons name="receipt" size={20} color={accentColor} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={[styles.settingTitle, { color: textColor }] as any}>Billing History</Body>
                  <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>View your payment history and receipts</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
              </TouchableOpacity>
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Support & Help */}
        <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={[styles.cardTitle, { color: textColor }] as any}>Support & Help</H2>
            
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={handleContactSupport}>
              <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                <MaterialIcons name="support" size={20} color={accentColor} />
              </View>
              <View style={styles.settingContent}>
                <Body style={[styles.settingTitle, { color: textColor }] as any}>Contact Support</Body>
                <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Get help with your account or classes</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={() => console.log('FAQ')}>
              <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                <MaterialIcons name="help" size={20} color={accentColor} />
              </View>
              <View style={styles.settingContent}>
                <Body style={[styles.settingTitle, { color: textColor }] as any}>FAQ</Body>
                <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Find answers to common questions</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.settingItem, { borderBottomColor: dividerColor }]} onPress={() => console.log('About')}>
              <View style={[styles.settingIcon, { backgroundColor: surfaceVariantColor }]}>
                <MaterialIcons name="info" size={20} color={accentColor} />
              </View>
              <View style={styles.settingContent}>
                <Body style={[styles.settingTitle, { color: textColor }] as any}>About ANIMO</Body>
                <Caption style={[styles.settingSubtitle, { color: textSecondaryColor }] as any}>Learn more about our studio</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textMutedColor} />
            </TouchableOpacity>
          </PaperCard.Content>
        </PaperCard>

        {/* Logout Section */}
        <PaperCard style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
          <PaperCard.Content style={styles.cardContent}>
                      <PaperButton 
            mode="outlined" 
            style={[styles.logoutButton, { borderColor: errorColor }]}
            labelStyle={[styles.logoutButtonLabel, { color: errorColor }]}
            icon={() => <MaterialIcons name="logout" size={20} color={errorColor} />}
            onPress={showLogoutConfirmation}
          >
            Sign Out
          </PaperButton>
          </PaperCard.Content>
        </PaperCard>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Portal>
        <Modal 
          visible={logoutModalVisible} 
          onDismiss={() => setLogoutModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <PaperCard style={[styles.modalCard, { backgroundColor: surfaceColor }]}>
            <PaperCard.Content style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialIcons name="logout" size={24} color={errorColor} />
                </View>
                <H3 style={[styles.modalTitle, { color: textColor }] as any}>Sign Out</H3>
              </View>
              
              <Body style={[styles.modalMessage, { color: textSecondaryColor }] as any}>
                Are you sure you want to sign out of your account?
              </Body>
              
              <View style={styles.modalActions}>
                <PaperButton 
                  mode="outlined" 
                  style={[styles.modalCancelButton, { borderColor }]}
                  labelStyle={[styles.modalCancelLabel, { color: textColor }]}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  Cancel
                </PaperButton>
                
                <PaperButton 
                  mode="contained" 
                  style={[styles.modalConfirmButton, { backgroundColor: errorColor }]}
                  labelStyle={[styles.modalConfirmLabel, { color: textOnAccentColor }]}
                  onPress={handleLogout}
                >
                  Sign Out
                </PaperButton>
              </View>
            </PaperCard.Content>
          </PaperCard>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor will be set dynamically
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    // backgroundColor will be set dynamically
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.accent,
  },
  avatarText: {
    // color will be set dynamically
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    // color will be set dynamically
    marginBottom: spacing.xs,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userEmail: {
    // color will be set dynamically
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    // backgroundColor and borderColor will be set dynamically
    borderRadius: layout.borderRadius,
    ...shadows.card,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    // color will be set dynamically
    marginBottom: spacing.md,
  },
  
  // Journey Stats
  journeyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    // backgroundColor will be set dynamically
    padding: spacing.md,
    borderRadius: spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    // color will be set dynamically
  },
  statLabel: {
    textAlign: 'center',
    // color will be set dynamically
  },
  
  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    // borderBottomColor will be set dynamically
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    // backgroundColor will be set dynamically
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    // color will be set dynamically
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    // color will be set dynamically
  },
  
  // Logout Button
  logoutButton: {
    // borderColor will be set dynamically through the button props
    borderRadius: layout.borderRadius,
  },
  logoutButtonLabel: {
    // color will be set dynamically through the button props
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
  
  // Modal Styles
  modalContainer: {
    padding: spacing.lg,
    justifyContent: 'center',
  },
  modalCard: {
    // backgroundColor will be set dynamically
    borderRadius: layout.borderRadius,
  },
  modalContent: {
    padding: spacing.xl,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(196, 125, 125, 0.1)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    // color will be set dynamically
    textAlign: 'center',
  },
  modalMessage: {
    // color will be set dynamically
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    // borderColor will be set dynamically
    borderRadius: layout.borderRadius,
  },
  modalCancelLabel: {
    // color will be set dynamically
    fontSize: 16,
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    // backgroundColor will be set dynamically
    borderRadius: layout.borderRadius,
  },
  modalConfirmLabel: {
    // color will be set dynamically
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen; 