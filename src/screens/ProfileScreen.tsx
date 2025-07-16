import StatusChip from '@/components/ui/StatusChip';
import { Body, Caption, H1, H2, H3 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Modal, Button as PaperButton, Card as PaperCard, Portal } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { logout } from '../store/authSlice';
import { shadows } from '../utils/shadows';

function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(false);
    dispatch(logout());
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <H2 style={styles.avatarText}>{getUserInitials()}</H2>
          </View>
          
          <View style={styles.profileInfo}>
            <H1 style={styles.userName}>{user?.name || 'User'}</H1>
            <View style={styles.userDetails}>
              <StatusChip 
                state={getUserRoleChipState()}
                text={user?.role?.charAt(0).toUpperCase() + (user?.role?.slice(1) || '')}
                size="small"
              />
            </View>
            <Caption style={styles.userEmail}>{user?.email}</Caption>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Account Settings */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Account Settings</H2>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleEditProfile}>
              <View style={styles.settingIcon}>
                <MaterialIcons name="edit" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.settingContent}>
                <Body style={styles.settingTitle}>Edit Profile</Body>
                <Caption style={styles.settingSubtitle}>Update your personal information</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
              <View style={styles.settingIcon}>
                <MaterialIcons name="lock" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.settingContent}>
                <Body style={styles.settingTitle}>Change Password</Body>
                <Caption style={styles.settingSubtitle}>Update your account security</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleNotificationSettings}>
              <View style={styles.settingIcon}>
                <MaterialIcons name="notifications" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.settingContent}>
                <Body style={styles.settingTitle}>Notifications</Body>
                <Caption style={styles.settingSubtitle}>Manage your notification preferences</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </PaperCard.Content>
        </PaperCard>

        {/* Pilates Journey */}
        {user?.role === 'client' && (
          <PaperCard style={styles.card}>
            <PaperCard.Content style={styles.cardContent}>
              <H2 style={styles.cardTitle}>Your Pilates Journey</H2>
              
              <View style={styles.journeyStats}>
                <View style={styles.statItem}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="event" size={24} color={Colors.light.accent} />
                    <Body style={styles.statNumber}>24</Body>
                  </View>
                  <Caption style={styles.statLabel}>Classes Attended</Caption>
                </View>
                
                <View style={styles.statItem}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="local-fire-department" size={24} color={Colors.light.warning} />
                    <Body style={styles.statNumber}>12</Body>
                  </View>
                  <Caption style={styles.statLabel}>Current Streak</Caption>
                </View>
                
                <View style={styles.statItem}>
                  <View style={styles.statHeader}>
                    <MaterialIcons name="star" size={24} color={Colors.light.success} />
                    <Body style={styles.statNumber}>4.8</Body>
                  </View>
                  <Caption style={styles.statLabel}>Avg Rating Given</Caption>
                </View>
              </View>
              
              <TouchableOpacity style={styles.settingItem} onPress={handleBookingHistory}>
                <View style={styles.settingIcon}>
                  <MaterialIcons name="history" size={20} color={Colors.light.accent} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={styles.settingTitle}>Booking History</Body>
                  <Caption style={styles.settingSubtitle}>View your past and upcoming classes</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Payment & Billing */}
        {user?.role === 'client' && (
          <PaperCard style={styles.card}>
            <PaperCard.Content style={styles.cardContent}>
              <H2 style={styles.cardTitle}>Payment & Billing</H2>
              
              <TouchableOpacity style={styles.settingItem} onPress={handlePaymentMethods}>
                <View style={styles.settingIcon}>
                  <MaterialIcons name="payment" size={20} color={Colors.light.accent} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={styles.settingTitle}>Payment Methods</Body>
                  <Caption style={styles.settingSubtitle}>Manage your cards and payment options</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem} onPress={() => console.log('Billing History')}>
                <View style={styles.settingIcon}>
                  <MaterialIcons name="receipt" size={20} color={Colors.light.accent} />
                </View>
                <View style={styles.settingContent}>
                  <Body style={styles.settingTitle}>Billing History</Body>
                  <Caption style={styles.settingSubtitle}>View your payment history and receipts</Caption>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
              </TouchableOpacity>
            </PaperCard.Content>
          </PaperCard>
        )}

        {/* Support & Help */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <H2 style={styles.cardTitle}>Support & Help</H2>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleContactSupport}>
              <View style={styles.settingIcon}>
                <MaterialIcons name="support" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.settingContent}>
                <Body style={styles.settingTitle}>Contact Support</Body>
                <Caption style={styles.settingSubtitle}>Get help with your account or classes</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => console.log('FAQ')}>
              <View style={styles.settingIcon}>
                <MaterialIcons name="help" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.settingContent}>
                <Body style={styles.settingTitle}>FAQ</Body>
                <Caption style={styles.settingSubtitle}>Find answers to common questions</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => console.log('About')}>
              <View style={styles.settingIcon}>
                <MaterialIcons name="info" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.settingContent}>
                <Body style={styles.settingTitle}>About ANIMO</Body>
                <Caption style={styles.settingSubtitle}>Learn more about our studio</Caption>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
            </TouchableOpacity>
          </PaperCard.Content>
        </PaperCard>

        {/* Logout Section */}
        <PaperCard style={styles.card}>
          <PaperCard.Content style={styles.cardContent}>
            <PaperButton 
              mode="outlined" 
              style={styles.logoutButton}
              labelStyle={styles.logoutButtonLabel}
              icon={() => <MaterialIcons name="logout" size={20} color={Colors.light.error} />}
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
          <PaperCard style={styles.modalCard}>
            <PaperCard.Content style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <MaterialIcons name="logout" size={24} color={Colors.light.error} />
                </View>
                <H3 style={styles.modalTitle}>Sign Out</H3>
              </View>
              
              <Body style={styles.modalMessage}>
                Are you sure you want to sign out of your account?
              </Body>
              
              <View style={styles.modalActions}>
                <PaperButton 
                  mode="outlined" 
                  style={styles.modalCancelButton}
                  labelStyle={styles.modalCancelLabel}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  Cancel
                </PaperButton>
                
                <PaperButton 
                  mode="contained" 
                  style={styles.modalConfirmButton}
                  labelStyle={styles.modalConfirmLabel}
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
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: Colors.light.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    backgroundColor: Colors.light.accent,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.accent,
  },
  avatarText: {
    color: Colors.light.textOnAccent,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    color: Colors.light.textOnAccent,
    marginBottom: spacing.xs,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  userEmail: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    ...shadows.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.lg,
  },
  cardTitle: {
    color: Colors.light.text,
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
    backgroundColor: Colors.light.surfaceVariant,
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
    color: Colors.light.text,
  },
  statLabel: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },
  
  // Setting Items
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.divider,
    gap: spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    backgroundColor: Colors.light.surfaceVariant,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    color: Colors.light.textSecondary,
  },
  
  // Logout Button
  logoutButton: {
    borderColor: Colors.light.error,
    borderRadius: layout.borderRadius,
  },
  logoutButtonLabel: {
    color: Colors.light.error,
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
    backgroundColor: Colors.light.surface,
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
    color: Colors.light.text,
    textAlign: 'center',
  },
  modalMessage: {
    color: Colors.light.textSecondary,
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
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
  },
  modalCancelLabel: {
    color: Colors.light.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: Colors.light.error,
    borderRadius: layout.borderRadius,
  },
  modalConfirmLabel: {
    color: Colors.light.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen; 