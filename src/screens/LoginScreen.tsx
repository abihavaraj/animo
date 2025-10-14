import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Dimensions, KeyboardAvoidingView, Linking, Platform, TextInput as RNTextInput, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, Modal, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Body, Caption, H1 } from '../../components/ui/Typography';
import { layout, spacing } from '../../constants/Spacing';
import { useThemeColor } from '../../hooks/useThemeColor';
import { credentialsService } from '../services/credentialsService';
import { AppDispatch, RootState } from '../store';
import { loginUser } from '../store/authSlice';
import { getResponsiveFontSize, getResponsiveSpacing, getScreenSize } from '../utils/responsiveUtils';
import { componentShadows } from '../utils/shadows';

function LoginScreen() {
  const { t } = useTranslation();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [hasLoginError, setHasLoginError] = useState(false);
  const [showSavePasswordModal, setShowSavePasswordModal] = useState(false);
  const [credentialsToSave, setCredentialsToSave] = useState<{emailOrPhone: string, password: string} | null>(null);
  const [hasLoadedCredentials, setHasLoadedCredentials] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error: reduxError, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const passwordInputRef = useRef<RNTextInput>(null);

  // Load saved credentials on component mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await credentialsService.loadCredentials();
        if (savedCredentials) {
          setEmailOrPhone(savedCredentials.emailOrPhone);
          setPassword(savedCredentials.password);
          setHasLoadedCredentials(true);
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, []);

  // Handle Redux error and show alert
  useEffect(() => {
    if (reduxError) {
      // Set error flag when there's a login error
      setHasLoginError(true);
      
      // Clear password field when there's an error to prevent autocomplete of wrong credentials
      setPassword('');
      
      // Show alert for any login error on mobile
      if (reduxError.toLowerCase().includes('password') || 
          reduxError.toLowerCase().includes('credentials') ||
          reduxError.toLowerCase().includes('wrong') ||
          reduxError.toLowerCase().includes('invalid')) {
        Alert.alert(
          '🔐 Login Failed', 
          reduxError,
          [{ text: 'Try Again', style: 'default' }]
        );
      }
    } else {
      // Clear error flag when no error
      setHasLoginError(false);
    }
  }, [reduxError]);

  // Responsive utilities
  const screenSize = getScreenSize();
  const insets = useSafeAreaInsets();
  const responsiveSpacing = getResponsiveSpacing(spacing.md);
  const responsiveFontSize = getResponsiveFontSize(16);



  // Theme colors using hooks for proper theme support
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');
  const accentColor = useThemeColor({}, 'accent');
  const errorColor = useThemeColor({}, 'error');

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      setLocalError(t('errors.validationError'));
      return;
    }

    setLocalError('');
    
    try {
      await dispatch(loginUser({ emailOrPhone, password })).unwrap();
      
      // Save current session credentials for logout functionality
      await credentialsService.saveCurrentSessionCredentials({ emailOrPhone, password });
      
      // Check if we should prompt to save password
      const shouldCheckSavePreference = await credentialsService.getSavePasswordPreference();
      const savedCredentials = await credentialsService.loadCredentials();
      
      // Show save prompt if:
      // 1. User hasn't set a preference yet, or
      // 2. Credentials are different from what's saved
      const shouldPromptSave = !shouldCheckSavePreference || 
        !savedCredentials || 
        savedCredentials.emailOrPhone !== emailOrPhone || 
        savedCredentials.password !== password;
      
      if (shouldPromptSave) {
        setCredentialsToSave({ emailOrPhone, password });
        setShowSavePasswordModal(true);
      }
    } catch (err: any) {
      // The error from Redux thunk is in err.payload, not err.message
      const errorMessage = err.payload || err.message || 'Login failed. Please try again.';
      setLocalError(errorMessage);
      
      // Show alert for any login error on mobile
      if (errorMessage.toLowerCase().includes('password') || 
          errorMessage.toLowerCase().includes('credentials') ||
          errorMessage.toLowerCase().includes('wrong') ||
          errorMessage.toLowerCase().includes('invalid')) {
        Alert.alert(
          '🔐 Login Failed', 
          errorMessage,
          [{ text: 'Try Again', style: 'default' }]
        );
      }
    }
  };

  const handleSavePassword = async (save: boolean) => {
    try {
      await credentialsService.setSavePasswordPreference(true);
      
      if (save && credentialsToSave) {
        await credentialsService.saveCredentials(credentialsToSave);
      }
    } catch (error) {
      console.error('Failed to save password preference:', error);
    } finally {
      setShowSavePasswordModal(false);
      setCredentialsToSave(null);
    }
  };

  const handleDoNotSavePassword = async () => {
    try {
      await credentialsService.setSavePasswordPreference(true);
      await credentialsService.clearCredentials();
    } catch (error) {
      console.error('Failed to save password preference:', error);
    } finally {
      setShowSavePasswordModal(false);
      setCredentialsToSave(null);
    }
  };

  const handleContactReception = (method: 'phone' | 'whatsapp') => {
    const phoneNumber = '+355689400040';
    const whatsappNumber = '+355689400040';
    
    if (method === 'phone') {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        Alert.alert('Error', 'Unable to open phone dialer');
      });
    } else if (method === 'whatsapp') {
      const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}&text=Hi! I would like to register for ANIMO Pilates Studio.`;
      Linking.openURL(whatsappUrl).catch(() => {
        Alert.alert('Error', 'WhatsApp is not installed or cannot be opened');
      });
    }
  };

  // Demo account configurations
  const demoAccounts = [
    {
      label: '👨‍💼 Admin Demo',
      credentials: { emailOrPhone: 'admin@pilatesstudio.com', password: 'admin123' },
      description: 'Full system access'
    },
    {
      label: '📞 Reception Demo', 
      credentials: { emailOrPhone: 'reception@pilatesstudio.com', password: 'reception123' },
      description: 'Client management'
    },
    {
      label: '🧘‍♀️ Instructor Demo',
      credentials: { emailOrPhone: 'sarah@instructor.com', password: 'instructor123' },
      description: 'Class management'
    },
    {
      label: '👤 Client Demo',
      credentials: { emailOrPhone: 'jennifer@example.com', password: 'client123' },
      description: 'Book classes'
    }
  ];

  
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, {
          paddingTop: Math.max(insets.top, responsiveSpacing),
          paddingBottom: Math.max(insets.bottom, responsiveSpacing),
          paddingHorizontal: responsiveSpacing,
        }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { 
          backgroundColor: surfaceColor,
          borderColor: borderColor,
          maxWidth: screenSize.isSmall ? screenSize.width - (responsiveSpacing * 2) : 400,
          marginHorizontal: screenSize.isSmall ? 0 : 'auto'
        }]}>
          <View style={[styles.cardContent, { 
            padding: screenSize.isSmall ? responsiveSpacing : spacing.lg 
          }]}>
            <H1 style={{
              ...styles.title,
              color: primaryColor,
              fontSize: getResponsiveFontSize(screenSize.isSmall ? 24 : 28)
            }}>
              {t('auth.welcomeBack')}
            </H1>
            <View style={{
              alignItems: 'center',
              marginBottom: screenSize.isSmall ? spacing.md : spacing.lg,
              paddingHorizontal: responsiveSpacing,
              width: '100%'
            }}>
                             <Text style={{
                 color: textSecondaryColor,
                 fontSize: getResponsiveFontSize(16),
                 textAlign: 'center',
                 fontWeight: '500',
                 lineHeight: 22,
                 paddingHorizontal: spacing.sm,
               }}
               allowFontScaling={false}>
                 ⭐ {t('auth.loginToAccount')} ⭐
               </Text>
            </View>
            
            {(localError || reduxError) ? (
              <Caption style={{
                ...styles.errorText,
                color: errorColor,
                padding: screenSize.isSmall ? spacing.sm : spacing.md,
                marginBottom: screenSize.isSmall ? spacing.sm : spacing.md
              }}>
                {localError || reduxError}
              </Caption>
            ) : null}
          
            <RNTextInput
              placeholder={t('auth.email')}
              value={emailOrPhone}
              onChangeText={(text) => {
                setEmailOrPhone(text);
                // Clear error flag when user starts typing
                if (hasLoginError) setHasLoginError(false);
              }}
              style={[styles.input, {
                borderColor: borderColor,
                backgroundColor: surfaceColor,
                color: textColor,
                fontSize: responsiveFontSize,
                height: screenSize.isSmall ? 44 : 48,
                paddingHorizontal: screenSize.isSmall ? spacing.sm : spacing.md,
                marginBottom: screenSize.isSmall ? spacing.sm : spacing.md
              }]}
              placeholderTextColor={textSecondaryColor}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              enablesReturnKeyAutomatically
              importantForAutofill="yes"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
            
            <RNTextInput
              ref={passwordInputRef}
              placeholder={t('auth.password')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                // Clear error flag when user starts typing
                if (hasLoginError) setHasLoginError(false);
              }}
              style={[styles.input, {
                borderColor: borderColor,
                backgroundColor: surfaceColor,
                color: textColor,
                fontSize: responsiveFontSize,
                height: screenSize.isSmall ? 44 : 48,
                paddingHorizontal: screenSize.isSmall ? spacing.sm : spacing.md,
                marginBottom: screenSize.isSmall ? spacing.sm : spacing.md
              }]}
              secureTextEntry
              editable={!isLoading}
              placeholderTextColor={textSecondaryColor}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              enablesReturnKeyAutomatically
              importantForAutofill="yes"
              passwordRules="minlength: 6;"
              onSubmitEditing={handleLogin}
            />
          
            <TouchableOpacity 
              style={[styles.loginButton, { 
                backgroundColor: isLoading ? textSecondaryColor : accentColor,
                marginTop: screenSize.isSmall ? spacing.sm : spacing.md,
                marginBottom: screenSize.isSmall ? spacing.md : spacing.lg,
                paddingVertical: screenSize.isSmall ? 12 : 16
              }]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={{
                ...styles.loginButtonLabel,
                fontSize: getResponsiveFontSize(16),
                color: backgroundColor
              }}>
                {isLoading ? t('common.loading') : t('auth.loginButton')}
              </Text>
            </TouchableOpacity>

            <View style={[styles.registrationSection, {
              borderTopColor: borderColor,
              paddingTop: screenSize.isSmall ? spacing.md : spacing.lg,
              marginTop: screenSize.isSmall ? spacing.sm : spacing.md
            }]}>
              <Body style={{
                ...styles.registrationTitle,
                color: textColor,
                fontSize: getResponsiveFontSize(16),
                marginBottom: screenSize.isSmall ? spacing.xs : spacing.sm
              }}>
                Need to Register?
              </Body>
              <Body style={{
                ...styles.registrationText,
                color: textSecondaryColor,
                fontSize: getResponsiveFontSize(14),
                marginBottom: screenSize.isSmall ? spacing.sm : spacing.md,
                lineHeight: getResponsiveFontSize(14) * 1.4
              }}>
                Contact our reception team to create your account and get started with your pilates journey.
              </Body>
              
              <View style={[styles.contactButtons, {
                flexDirection: screenSize.isSmall ? 'column' : 'row',
                gap: screenSize.isSmall ? spacing.xs : spacing.sm,
                marginBottom: screenSize.isSmall ? spacing.sm : spacing.md
              }]}>
                <TouchableOpacity 
                  style={[styles.contactButton, {
                    borderColor: borderColor,
                    backgroundColor: surfaceColor,
                    padding: screenSize.isSmall ? 10 : 12,
                    flex: screenSize.isSmall ? undefined : 1
                  }]}
                  onPress={() => handleContactReception('phone')} 
                >
                  <Text style={{
                    ...styles.contactButtonLabel,
                    color: textSecondaryColor,
                    fontSize: getResponsiveFontSize(12)
                  }}>
                    📞 Call Reception
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.contactButton, {
                    borderColor: borderColor,
                    backgroundColor: surfaceColor,
                    padding: screenSize.isSmall ? 10 : 12,
                    flex: screenSize.isSmall ? undefined : 1
                  }]}
                  onPress={() => handleContactReception('whatsapp')} 
                >
                  <Text style={{
                    ...styles.contactButtonLabel,
                    color: textSecondaryColor,
                    fontSize: getResponsiveFontSize(12)
                  }}>
                    💬 WhatsApp
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Body style={{
                ...styles.contactInfo,
                color: textSecondaryColor,
                fontSize: getResponsiveFontSize(12),
                lineHeight: getResponsiveFontSize(12) * 1.5,
                padding: screenSize.isSmall ? spacing.xs : spacing.sm
              }}>
                📞 Phone: +355 68 940 0040{'\n'}
                💬 WhatsApp: +355 68 940 0040{'\n'}
                🏢 Visit us at the front desk
              </Body>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save Password Modal */}
      <Portal>
        <Modal
          visible={showSavePasswordModal}
          onDismiss={() => setShowSavePasswordModal(false)}
          contentContainerStyle={[styles.modalContainer, { 
            backgroundColor: surfaceColor,
            borderColor: borderColor 
          }]}
        >
          <View style={styles.modalContent}>
            <H1 style={[styles.modalTitle, { color: primaryColor }]}>
              🔐 Save Password?
            </H1>
            <Body style={[styles.modalText, { color: textColor }]}>
              Would you like to save your login credentials for faster access next time?
            </Body>
            <Body style={[styles.modalSubtext, { color: textSecondaryColor }]}>
              Your credentials will be stored securely using {Platform.OS === 'ios' ? 'iOS Keychain' : Platform.OS === 'android' ? 'Android Keystore' : 'secure storage'}.
            </Body>
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={handleDoNotSavePassword}
                style={[styles.modalButton, { borderColor: borderColor }]}
                labelStyle={{ color: textSecondaryColor }}
              >
                Don't Save
              </Button>
              <Button
                mode="contained"
                onPress={() => handleSavePassword(true)}
                style={[styles.modalButton, { backgroundColor: accentColor }]}
                labelStyle={{ color: backgroundColor }}
              >
                Save Password
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: Dimensions.get('window').height * 0.9,
  },
  card: {
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    ...componentShadows.loginCard,
    alignSelf: 'center',
    width: '100%',
  },
  cardContent: {
    gap: spacing.xs,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    backgroundColor: 'rgba(196, 125, 125, 0.1)',
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(196, 125, 125, 0.2)',
  },
  input: {
    borderWidth: 1,
    borderRadius: spacing.sm,
    paddingVertical: spacing.sm,
  },
  loginButton: {
    borderRadius: layout.borderRadius,
    ...componentShadows.loginButton,
  },
  loginButtonLabel: {
    fontWeight: '600',
    textAlign: 'center',
  },
  registrationSection: {
    borderTopWidth: 1,
  },
  registrationTitle: {
    textAlign: 'center',
    fontWeight: '600',
  },
  registrationText: {
    textAlign: 'center',
  },
  contactButtons: {
    justifyContent: 'space-between',
  },
  contactButton: {
    borderRadius: layout.borderRadius,
    borderWidth: 1,
  },
  contactButtonLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  contactInfo: {
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: spacing.sm,
  },
  modalContainer: {
    margin: spacing.lg,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  modalContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: 'bold',
  },
  modalText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  modalSubtext: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontSize: 12,
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
});

export default LoginScreen; 