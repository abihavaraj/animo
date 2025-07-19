import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, TextInput } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Caption, H2 } from '../../../components/ui/Typography';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { authService } from '../../services/authService';
import { AppDispatch, RootState } from '../../store';
import { updateUserProfile } from '../../store/authSlice';

function EditProfile({ navigation }: any) {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const errorColor = useThemeColor({}, 'error');
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    emergencyContact: user?.emergency_contact || '',
    medicalConditions: user?.medical_conditions || ''
  });
  
  console.log('🔍 EditProfile - Initial user data:', user);
  console.log('🔍 EditProfile - Initial form data:', formData);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 EditProfile focused - refreshing user data');
      console.log('👤 Current user data:', user);
      const newFormData = {
        name: user?.name || '',
        phone: user?.phone || '',
        emergencyContact: user?.emergency_contact || '',
        medicalConditions: user?.medical_conditions || ''
      };
      console.log('📝 Setting form data:', newFormData);
      setFormData(newFormData);
    }, [user])
  );

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    console.log('💾 Saving profile with data:', formData);
    setLoading(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        emergencyContact: formData.emergencyContact.trim() || undefined,
        medicalConditions: formData.medicalConditions.trim() || undefined
      };
      
      console.log('📤 Sending update request:', updateData);
      const response = await authService.updateProfile(updateData);
      console.log('📥 Received response:', response);

      if (response.success) {
        console.log('✅ Profile update successful');
        // Update the user in Redux store
        dispatch(updateUserProfile(updateData));
        
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        console.log('❌ Profile update failed:', response.message);
        Alert.alert('Error', response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        <Card style={[styles.card, { backgroundColor: surfaceColor }]}>
          <Card.Content>
            <H2 style={{ color: textColor, marginBottom: 24 }}>Edit Profile</H2>
            
            <TextInput
              label="Full Name"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              mode="outlined"
              style={styles.input}
              error={!!errors.name}
              disabled={loading}
            />
            {errors.name && (
              <Caption style={{ color: errorColor, marginTop: 4 }}>{errors.name}</Caption>
            )}

            <TextInput
              label="Phone Number"
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              error={!!errors.phone}
              disabled={loading}
            />
            {errors.phone && (
              <Caption style={{ color: errorColor, marginTop: 4 }}>{errors.phone}</Caption>
            )}

            <TextInput
              label="Emergency Contact"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContact: text }))}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              disabled={loading}
            />

            <TextInput
              label="Medical Conditions (Optional)"
              value={formData.medicalConditions}
              onChangeText={(text) => setFormData(prev => ({ ...prev, medicalConditions: text }))}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
              disabled={loading}
            />

            <Caption style={{ color: textSecondaryColor, marginTop: 8, marginBottom: 24 }}>
              This information helps us provide you with the best possible experience and ensure your safety during classes.
            </Caption>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                style={[styles.button, styles.cancelButton, { borderColor: textMutedColor }]}
                textColor={textMutedColor}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                style={[styles.button, styles.saveButton, { backgroundColor: accentColor }]}
                loading={loading}
                disabled={loading}
                icon="content-save"
              >
                Save Changes
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    elevation: 2,
  },
});

export default EditProfile; 