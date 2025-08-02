import { Body, Caption, H1 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, TextInput as RNTextInput, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { layout, spacing } from '../../constants/Spacing';
import { AppDispatch, RootState } from '../store';
import { loginUser } from '../store/authSlice';
import { componentShadows } from '../utils/shadows';

function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [hasLoginError, setHasLoginError] = useState(false);
  const [inputKey, setInputKey] = useState(0); // Force re-render to reset autocomplete
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error: reduxError, isLoggedIn } = useSelector((state: RootState) => state.auth);
  const passwordInputRef = useRef<RNTextInput>(null);

  // Handle Redux error and show alert
  useEffect(() => {
    if (reduxError) {
      console.log('🔍 [LoginScreen] Redux error detected:', reduxError);
      
      // Set error flag to disable autocomplete
      setHasLoginError(true);
      
      // Force input fields to re-render and reset autocomplete
      setInputKey(prev => prev + 1);
      
      // Clear password field when there's an error to prevent autocomplete of wrong credentials
      setPassword('');
      
      // Show alert for any login error on mobile
      if (reduxError.toLowerCase().includes('password') || 
          reduxError.toLowerCase().includes('credentials') ||
          reduxError.toLowerCase().includes('wrong') ||
          reduxError.toLowerCase().includes('invalid')) {
        console.log('🔍 [LoginScreen] Showing alert for Redux error:', reduxError);
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

  // Theme colors for input fields - using static values to prevent re-render issues
  const backgroundColor = Colors.light.background;
  const surfaceColor = Colors.light.surface;
  const textColor = Colors.light.text;
  const textSecondaryColor = Colors.light.textSecondary;
  const primaryColor = Colors.light.primary;
  const borderColor = Colors.light.border;

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setLocalError('');
    
    try {
      await dispatch(loginUser({ emailOrPhone, password })).unwrap();
    } catch (err: any) {
      // The error from Redux thunk is in err.payload, not err.message
      const errorMessage = err.payload || err.message || 'Login failed. Please try again.';
      setLocalError(errorMessage);
      
      console.log('🔍 [LoginScreen] Error message:', errorMessage);
      
      // Show alert for any login error on mobile
      if (errorMessage.toLowerCase().includes('password') || 
          errorMessage.toLowerCase().includes('credentials') ||
          errorMessage.toLowerCase().includes('wrong') ||
          errorMessage.toLowerCase().includes('invalid')) {
        console.log('🔍 [LoginScreen] Showing alert for error:', errorMessage);
        Alert.alert(
          '🔐 Login Failed', 
          errorMessage,
          [{ text: 'Try Again', style: 'default' }]
        );
      } else {
        console.log('🔍 [LoginScreen] Not showing alert for error:', errorMessage);
      }
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
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <H1 style={styles.title}>Welcome to ANIMO</H1>
          <Body style={styles.subtitle}>Sign in to access your pilates journey</Body>
          
          {(localError || reduxError) ? <Caption style={styles.errorText}>{localError || reduxError}</Caption> : null}
          
          <RNTextInput
            key={`email-${inputKey}`}
            placeholder="Email or Phone Number"
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
            }]}
            placeholderTextColor={textSecondaryColor}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            autoComplete={hasLoginError ? "off" : "username"}
            textContentType={hasLoginError ? "none" : "username"}
            returnKeyType="next"
            enablesReturnKeyAutomatically
            onSubmitEditing={() => passwordInputRef.current?.focus()}
          />
          
          
          <RNTextInput
            key={`password-${inputKey}`}
            ref={passwordInputRef}
            placeholder="Password"
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
            }]}
            secureTextEntry
            editable={!isLoading}
            placeholderTextColor={textSecondaryColor}
            autoComplete={hasLoginError ? "off" : "current-password"}
            textContentType={hasLoginError ? "none" : "password"}
            returnKeyType="done"
            enablesReturnKeyAutomatically
            onSubmitEditing={handleLogin}
          />
          
          <TouchableOpacity 
            style={[styles.loginButton, isLoading && { backgroundColor: '#cccccc' }]} 
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonLabel}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.registrationSection}>
            <Body style={styles.registrationTitle}>Need to Register?</Body>
            <Body style={styles.registrationText}>
              Contact our reception team to create your account and get started with your pilates journey.
            </Body>
            
            <View style={styles.contactButtons}>
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleContactReception('phone')} 
              >
                <Text style={styles.contactButtonLabel}>📞 Call Reception</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.contactButton}
                onPress={() => handleContactReception('whatsapp')} 
              >
                <Text style={styles.contactButtonLabel}>💬 WhatsApp</Text>
              </TouchableOpacity>
            </View>
            
            <Body style={styles.contactInfo}>
              📞 Phone: +355 68 940 0040{'\n'}
              💬 WhatsApp: +355 68 940 0040{'\n'}
              🏢 Visit us at the front desk
            </Body>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...componentShadows.loginCard,
    maxWidth: 400,
    alignSelf: 'center',
  },
  cardContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    textAlign: 'center',
    color: Colors.light.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: Colors.light.error,
    textAlign: 'center',
    backgroundColor: 'rgba(196, 125, 125, 0.1)',
    padding: spacing.sm,
    borderRadius: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(196, 125, 125, 0.2)',
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: 16,
    height: 48,
    borderRadius: spacing.sm,
  },
  helpText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  loginButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...componentShadows.loginButton,
    padding: 16,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
    textAlign: 'center',
  },
  registrationSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: spacing.lg,
    marginTop: spacing.md,
  },
  registrationTitle: {
    textAlign: 'center',
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: spacing.sm,
    fontSize: 16,
  },
  registrationText: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  contactButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  contactButton: {
    flex: 1,
    borderColor: Colors.light.border,
    borderRadius: layout.borderRadius,
    borderWidth: 1,
    padding: 12,
    backgroundColor: Colors.light.surface,
  },
  contactButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  contactInfo: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: spacing.sm,
    borderRadius: spacing.sm,
  },
});

export default LoginScreen; 