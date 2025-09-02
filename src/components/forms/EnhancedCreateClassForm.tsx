import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
    Button,
    Card,
    Chip,
    Icon,
    Menu,
    SegmentedButtons,
    Surface,
    Switch,
    TextInput
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { CreateClassRequest } from '../../services/classService';
import { BackendUser } from '../../services/userService';
import { Body, Caption, H3 } from '../ui/Typography';

interface FormData {
  name: string;
  instructorId: string;
  instructorName: string;
  date: string;
  time: string;
  duration: number;
  category: 'personal' | 'group';
  capacity: number;
  equipment: string;
  description: string;
  equipmentType: 'mat' | 'reformer' | 'both';
  room: 'Reformer Room' | 'Mat Room' | 'Cadillac Room' | 'Wall Room' | '';
  level: '' | 'Beginner' | 'Intermediate' | 'Advanced';
  notes: string;
  visibility: 'public' | 'private';
}

interface Props {
  onSubmit: (data: CreateClassRequest) => Promise<void>;
  onCancel: () => void;
  instructors: BackendUser[];
  isSubmitting?: boolean;
  initialData?: Partial<FormData>;
}

export default function EnhancedCreateClassForm({
  onSubmit,
  onCancel,
  instructors,
  isSubmitting = false,
  initialData
}: Props) {
  const [formData, setFormData] = useState<FormData>(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    
    return {
      name: '',
      instructorId: '',
      instructorName: '',
      date: today,
      time: currentTime,
      duration: 60,
      category: 'group',
      capacity: 10,
      equipment: '',
      description: '',
      equipmentType: 'mat',
      room: '',
      level: 'Beginner',
      notes: '',
      visibility: 'public',
      ...initialData
    };
  });

  const [instructorMenuVisible, setInstructorMenuVisible] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Class name is required';
    }
    if (!formData.instructorId) {
      newErrors.instructor = 'Please select an instructor';
    }
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (!formData.time) {
      newErrors.time = 'Time is required';
    }
    if (!formData.room) {
      newErrors.room = 'Room is required';
    }
    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const createRequest: CreateClassRequest = {
      name: formData.name,
      instructorId: formData.instructorId,
      date: formData.date,
      time: formData.time,
      duration: formData.duration,
      category: formData.category,
      capacity: formData.capacity,
      equipmentType: formData.equipmentType,
      equipment: formData.equipment ? formData.equipment.split(',').map(e => e.trim()) : [],
      description: formData.description,
      notes: formData.notes,
      room: formData.room,
      level: formData.level || undefined,
      visibility: formData.visibility,
    };

    await onSubmit(createRequest);
  };

  const quickTimes = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00'
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <Card style={styles.section}>
        <Card.Content>
          <H3 style={styles.sectionTitle}>
            <Icon source="fitness-center" size={20} color={Colors.light.primary} /> Class Information
          </H3>
          
          <TextInput
            label="Class Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({...formData, name: text})}
            mode="outlined"
            style={styles.input}
            error={!!errors.name}
            left={<TextInput.Icon icon="fitness-center" />}
            placeholder="e.g., Morning Mat Flow, Reformer Basics..."
          />
          {errors.name && <Caption style={styles.errorText}>{errors.name}</Caption>}

          <View style={styles.instructorContainer}>
            <Caption style={styles.fieldLabel}>Instructor *</Caption>
            <Surface style={styles.dropdownSurface}>
              <Menu
                visible={instructorMenuVisible}
                onDismiss={() => setInstructorMenuVisible(false)}
                anchor={
                  <Pressable 
                    onPress={() => setInstructorMenuVisible(true)}
                    style={[styles.dropdownButton, errors.instructor && styles.dropdownError]}
                  >
                    <View style={styles.dropdownContent}>
                      <Icon source="account" size={20} color={Colors.light.primary} />
                      <Body style={styles.dropdownText}>
                        {formData.instructorName || 'Select instructor...'}
                      </Body>
                      <Icon source="chevron-down" size={20} color={Colors.light.textSecondary} />
                    </View>
                  </Pressable>
                }
              >
                {instructors.map((instructor) => (
                  <Menu.Item
                    key={instructor.id}
                    onPress={() => {
                      setFormData({
                        ...formData, 
                        instructorId: instructor.id.toString(),
                        instructorName: instructor.name
                      });
                      setInstructorMenuVisible(false);
                    }}
                    title={instructor.name}
                    leadingIcon="account"
                  />
                ))}
              </Menu>
            </Surface>
            {errors.instructor && <Caption style={styles.errorText}>{errors.instructor}</Caption>}
          </View>
        </Card.Content>
      </Card>

      {/* Schedule Section */}
      <Card style={styles.section}>
        <Card.Content>
          <H3 style={styles.sectionTitle}>
            <Icon source="schedule" size={20} color={Colors.light.primary} /> Schedule & Duration
          </H3>
          
          <View style={styles.row}>
            <View style={styles.column}>
              <TextInput
                label="Date *"
                value={formData.date}
                onChangeText={(text) => setFormData({...formData, date: text})}
                mode="outlined"
                style={styles.input}
                error={!!errors.date}
                left={<TextInput.Icon icon="calendar" />}
                placeholder="YYYY-MM-DD"
              />
              {errors.date && <Caption style={styles.errorText}>{errors.date}</Caption>}
            </View>

            <View style={styles.column}>
              <TextInput
                label="Start Time *"
                value={formData.time}
                onChangeText={(text) => setFormData({...formData, time: text})}
                mode="outlined"
                style={styles.input}
                error={!!errors.time}
                left={<TextInput.Icon icon="clock" />}
                placeholder="HH:MM"
              />
              {errors.time && <Caption style={styles.errorText}>{errors.time}</Caption>}
            </View>
          </View>

          <Caption style={styles.quickSelectLabel}>Quick time selection:</Caption>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickTimeScroll}>
            <View style={styles.quickTimeContainer}>
              {quickTimes.map((time) => (
                <Chip
                  key={time}
                  mode={formData.time === time ? 'flat' : 'outlined'}
                  selected={formData.time === time}
                  onPress={() => setFormData({...formData, time})}
                  style={[
                    styles.timeChip,
                    formData.time === time && styles.timeChipSelected
                  ]}
                  textStyle={styles.timeChipText}
                >
                  {time}
                </Chip>
              ))}
            </View>
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.column}>
              <TextInput
                label="Duration (minutes) *"
                value={String(formData.duration)}
                onChangeText={(text) => setFormData({...formData, duration: parseInt(text) || 60})}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="timer" />}
              />
            </View>

            <View style={styles.column}>
              <TextInput
                label="Capacity *"
                value={String(formData.capacity)}
                onChangeText={(text) => setFormData({...formData, capacity: parseInt(text) || 1})}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                error={!!errors.capacity}
                left={<TextInput.Icon icon="account-group" />}
              />
              {errors.capacity && <Caption style={styles.errorText}>{errors.capacity}</Caption>}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Class Type Section */}
      <Card style={styles.section}>
        <Card.Content>
          <H3 style={styles.sectionTitle}>
            <Icon source="tune" size={20} color={Colors.light.primary} /> Class Configuration
          </H3>
          
          <View style={styles.segmentedContainer}>
            <Caption style={styles.fieldLabel}>Class Category *</Caption>
            <SegmentedButtons
              value={formData.category}
              onValueChange={(value) => {
                const newCategory = value as 'personal' | 'group';
                setFormData({
                  ...formData, 
                  category: newCategory,
                  capacity: newCategory === 'personal' ? 
                    (formData.capacity > 5 ? 1 : formData.capacity) : 
                    (formData.capacity < 5 ? 10 : formData.capacity)
                });
              }}
              buttons={[
                { value: 'group', label: 'Group Class', icon: 'account-group' },
                { value: 'personal', label: 'Personal', icon: 'account' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <View style={styles.segmentedContainer}>
            <Caption style={styles.fieldLabel}>Difficulty Level *</Caption>
            <SegmentedButtons
              value={formData.level}
              onValueChange={(value) => setFormData({...formData, level: value as FormData['level']})}
              buttons={[
                { value: 'Beginner', label: 'Beginner', icon: 'star-outline' },
                { value: 'Intermediate', label: 'Intermediate', icon: 'star-half-full' },
                { value: 'Advanced', label: 'Advanced', icon: 'star' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <View style={styles.segmentedContainer}>
            <Caption style={styles.fieldLabel}>Equipment Type *</Caption>
            <SegmentedButtons
              value={formData.equipmentType}
              onValueChange={(value) => setFormData({...formData, equipmentType: value as FormData['equipmentType']})}
              buttons={[
                { value: 'mat', label: 'Mat', icon: 'yoga' },
                { value: 'reformer', label: 'Reformer', icon: 'fitness-center' },
                { value: 'both', label: 'Both', icon: 'all-inclusive' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <View style={styles.segmentedContainer}>
            <Caption style={styles.fieldLabel}>Room *</Caption>
            <SegmentedButtons
              value={formData.room}
              onValueChange={(value) => setFormData({...formData, room: value as FormData['room']})}
              buttons={[
                { value: 'Reformer Room', label: 'Reformer' },
                { value: 'Mat Room', label: 'Mat' },
                { value: 'Cadillac Room', label: 'Cadillac' },
                { value: 'Wall Room', label: 'Wall' },
              ]}
              style={styles.segmentedButtons}
            />
            {errors.room && <Caption style={styles.errorText}>{errors.room}</Caption>}
          </View>
        </Card.Content>
      </Card>

      {/* Privacy Section */}
      <Card style={styles.section}>
        <Card.Content>
          <H3 style={styles.sectionTitle}>
            <Icon source="security" size={20} color={Colors.light.primary} /> Privacy & Visibility
          </H3>
          
          <View style={styles.visibilityContainer}>
            <View style={styles.visibilityHeader}>
              <Icon source={formData.visibility === 'private' ? 'eye-off' : 'eye'} size={24} color={Colors.light.primary} />
              <Body style={styles.visibilityTitle}>
                {formData.visibility === 'private' ? 'Private Class' : 'Public Class'}
              </Body>
              <Switch
                value={formData.visibility === 'private'}
                onValueChange={(value) => setFormData({...formData, visibility: value ? 'private' : 'public'})}
                thumbColor={formData.visibility === 'private' ? Colors.light.primary : Colors.light.surface}
                trackColor={{ false: Colors.light.border, true: Colors.light.secondary }}
              />
            </View>
            
            <Caption style={styles.visibilityDescription}>
              {formData.visibility === 'private' 
                ? '🔒 Only visible to reception, instructors, and admin. Perfect for personal sessions that will be manually assigned.'
                : '👁️ Visible to all users including clients. Standard for group classes that clients can book themselves.'
              }
            </Caption>
          </View>
        </Card.Content>
      </Card>

      {/* Additional Details Section */}
      <Card style={styles.section}>
        <Card.Content>
          <H3 style={styles.sectionTitle}>
            <Icon source="note-text" size={20} color={Colors.light.primary} /> Additional Details
          </H3>
          
          <TextInput
            label="Equipment Needed"
            value={formData.equipment}
            onChangeText={(text) => setFormData({...formData, equipment: text})}
            mode="outlined"
            style={styles.input}
            placeholder="e.g., yoga mats, resistance bands, props..."
            multiline
          />

          <TextInput
            label="Class Description"
            value={formData.description}
            onChangeText={(text) => setFormData({...formData, description: text})}
            mode="outlined"
            style={styles.input}
            placeholder="Brief description of what this class entails..."
            multiline
            numberOfLines={3}
          />

          <TextInput
            label="Internal Notes"
            value={formData.notes}
            onChangeText={(text) => setFormData({...formData, notes: text})}
            mode="outlined"
            style={styles.input}
            placeholder="Internal notes for staff (not visible to clients)..."
            multiline
            numberOfLines={2}
          />
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          mode="outlined"
          onPress={onCancel}
          disabled={isSubmitting}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.submitButton}
          icon="check"
        >
          Create Class
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    color: Colors.light.primary,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: '600',
    color: Colors.light.text,
  },
  instructorContainer: {
    marginTop: 8,
  },
  dropdownSurface: {
    borderRadius: 8,
    elevation: 1,
  },
  dropdownButton: {
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    backgroundColor: Colors.light.surface,
  },
  dropdownError: {
    borderColor: Colors.light.error,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownText: {
    flex: 1,
    color: Colors.light.text,
  },
  quickSelectLabel: {
    marginTop: 8,
    marginBottom: 8,
    color: Colors.light.textSecondary,
  },
  quickTimeScroll: {
    marginBottom: 16,
  },
  quickTimeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  timeChip: {
    marginRight: 4,
  },
  timeChipSelected: {
    backgroundColor: Colors.light.primary,
  },
  timeChipText: {
    fontSize: 12,
  },
  segmentedContainer: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  visibilityContainer: {
    padding: 16,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  visibilityTitle: {
    flex: 1,
    fontWeight: '600',
  },
  visibilityDescription: {
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 12,
    marginTop: 4,
  },
});
