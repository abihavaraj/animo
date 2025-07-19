import { Body, Caption, H1 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import { layout, spacing } from '@/constants/Spacing';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button as PaperButton, Card as PaperCard, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useThemeColor } from '../../hooks/useThemeColor';
import { AppDispatch, RootState } from '../store';
import { loginUser } from '../store/authSlice';
import { componentShadows } from '../utils/shadows';

function LoginScreen() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  // Theme colors for input fields
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const borderColor = useThemeColor({}, 'border');

  const handleLogin = async () => {
    if (!emailOrPhone || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    
    try {
      await dispatch(loginUser({ emailOrPhone, password })).unwrap();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
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

  return (
    <View style={styles.container}>
      <PaperCard style={styles.card}>
        <PaperCard.Content style={styles.cardContent}>
          <H1 style={styles.title}>Welcome to ANIMO</H1>
          <Body style={styles.subtitle}>Sign in to access your pilates journey</Body>
          
          {error ? <Caption style={styles.errorText}>{error}</Caption> : null}
          
          <TextInput
            label="Email or Phone"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            disabled={isLoading}
            theme={{
              colors: {
                primary: primaryColor,
                onSurface: textColor,
                onSurfaceVariant: textSecondaryColor,
                outline: borderColor,
                surface: surfaceColor,
                background: backgroundColor,
              }
            }}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            disabled={isLoading}
            theme={{
              colors: {
                primary: primaryColor,
                onSurface: textColor,
                onSurfaceVariant: textSecondaryColor,
                outline: borderColor,
                surface: surfaceColor,
                background: backgroundColor,
              }
            }}
          />
          
          <PaperButton 
            mode="contained" 
            onPress={handleLogin} 
            style={styles.loginButton}
            labelStyle={styles.loginButtonLabel}
            loading={isLoading}
            disabled={isLoading}
          >
            Sign In
          </PaperButton>

          <View style={styles.registrationSection}>
            <Body style={styles.registrationTitle}>Need to Register?</Body>
            <Body style={styles.registrationText}>
              Contact our reception team to create your account and get started with your pilates journey.
            </Body>
            
            <View style={styles.contactButtons}>
              <PaperButton 
                mode="outlined" 
                onPress={() => handleContactReception('phone')} 
                style={styles.contactButton}
                labelStyle={styles.contactButtonLabel}
                icon="phone"
              >
                Call Reception
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                onPress={() => handleContactReception('whatsapp')} 
                style={styles.contactButton}
                labelStyle={styles.contactButtonLabel}
                icon="whatsapp"
              >
                WhatsApp
              </PaperButton>
            </View>
            
            <Body style={styles.contactInfo}>
              📞 Phone: +355 68 940 0040{'\n'}
              💬 WhatsApp: +355 68 940 0040{'\n'}
              🏢 Visit us at the front desk
            </Body>
          </View>
        </PaperCard.Content>
      </PaperCard>
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
    marginBottom: spacing.md,
  },
  loginButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...componentShadows.loginButton,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
    paddingVertical: spacing.xs,
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
  },
  contactButtonLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.textSecondary,
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