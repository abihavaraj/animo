import { Body, Caption, H1 } from '@/components/ui/Typography';
import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Menu, Button as PaperButton, Card as PaperCard, TextInput } from 'react-native-paper';
import { useDispatch } from 'react-redux';
import { layout, spacing } from '../../constants/Spacing';
import type { AppDispatch } from '../store';
import { registerUser } from '../store/authSlice';
import { shadows } from '../utils/shadows';

// Referral source options
const REFERRAL_SOURCES = [
  { value: 'google_search', label: 'Google Search' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'friend_referral', label: 'Friend Referral' },
  { value: 'website', label: 'Studio Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'local_ad', label: 'Local Advertisement' },
  { value: 'word_of_mouth', label: 'Word of Mouth' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'event', label: 'Studio Event' },
  { value: 'other', label: 'Other' },
];

function RegisterScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [customReferralText, setCustomReferralText] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all required fields (Name, Email, Password)');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const finalReferralSource = referralSource === 'other' ? customReferralText : referralSource;
      
      const userData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        referralSource: finalReferralSource || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        medicalConditions: medicalConditions.trim() || undefined,
      };

      const result = await dispatch(registerUser(userData));
      if (registerUser.fulfilled.match(result)) {
        // Navigation will be handled by the auth navigator
        console.log('Registration successful');
      } else {
        throw new Error(result.payload as string || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || err || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getReferralSourceLabel = () => {
    if (referralSource === 'other' && customReferralText) {
      return `Other: ${customReferralText}`;
    }
    const source = REFERRAL_SOURCES.find(s => s.value === referralSource);
    return source ? source.label : 'How did you hear about us?';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <PaperCard style={styles.card}>
        <PaperCard.Content style={styles.cardContent}>
          <H1 style={styles.title}>Join ANIMO</H1>
          <Body style={styles.subtitle}>Create your account to start your pilates journey</Body>
          
          {error ? <Caption style={styles.errorText}>{error}</Caption> : null}
          
          <TextInput
            label="Full Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
          />
          
          <TextInput
            label="Email *"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={isLoading}
          />
          
          <TextInput
            label="Password *"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            disabled={isLoading}
            right={<TextInput.Icon icon="eye" />}
          />
          
          <TextInput
            label="Phone (Optional)"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            disabled={isLoading}
          />

          {/* Referral Source Dropdown */}
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <TextInput
                label="How did you hear about us? (Optional)"
                value={getReferralSourceLabel()}
                mode="outlined"
                style={styles.input}
                editable={false}
                onPress={() => setMenuVisible(true)}
                right={<TextInput.Icon icon="chevron-down" onPress={() => setMenuVisible(true)} />}
                disabled={isLoading}
              />
            }
          >
            {REFERRAL_SOURCES.map((source) => (
              <Menu.Item
                key={source.value}
                onPress={() => {
                  setReferralSource(source.value);
                  if (source.value !== 'other') {
                    setCustomReferralText(''); // Clear custom text when not "other"
                  }
                  setMenuVisible(false);
                }}
                title={source.label}
              />
            ))}
          </Menu>
          
          {/* Custom referral text input when "other" is selected */}
          {referralSource === 'other' && (
            <TextInput
              label="Please specify how you heard about us"
              value={customReferralText}
              onChangeText={setCustomReferralText}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Local gym recommendation, doctor referral, etc."
              multiline
              numberOfLines={2}
              disabled={isLoading}
            />
          )}
          
          <TextInput
            label="Emergency Contact (Optional)"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., Jane Doe: +1-555-0123"
            disabled={isLoading}
          />
          
          <TextInput
            label="Medical Conditions (Optional)"
            value={medicalConditions}
            onChangeText={setMedicalConditions}
            mode="outlined"
            style={styles.input}
            placeholder="Any conditions we should be aware of"
            multiline
            numberOfLines={3}
            disabled={isLoading}
          />
          
          <PaperButton 
            mode="contained" 
            onPress={handleRegister} 
            style={styles.registerButton}
            labelStyle={styles.registerButtonLabel}
            loading={isLoading}
            disabled={isLoading}
          >
            Create Account
          </PaperButton>
        </PaperCard.Content>
      </PaperCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    justifyContent: 'center',
    padding: spacing.md,
    minHeight: '100%',
  },
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: layout.borderRadius,
    ...shadows.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
  registerButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: layout.borderRadius,
    marginTop: spacing.md,
    ...shadows.accent,
  },
  registerButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textOnAccent,
    paddingVertical: spacing.xs,
  },
});

export default RegisterScreen; 