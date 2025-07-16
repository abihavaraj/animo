import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, FAB, IconButton, Modal, Paragraph, Portal, Searchbar, Surface, TextInput, Title } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { bookingService } from '../../services/bookingService';
import { BackendClass, classService } from '../../services/classService';
import { RootState } from '../../store';

interface ClassWithFeedback extends BackendClass {
  feedback?: ClassFeedback;
  attendees?: any[];
}

interface ClassFeedback {
  id: number;
  classId: number;
  instructorId: number;
  overallRating: number;
  energyLevel: 'low' | 'medium' | 'high';
  difficultyFeedback: 'too_easy' | 'just_right' | 'too_hard';
  classSummary: string;
  achievements: string;
  challenges: string;
  improvements: string;
  studentHighlights: StudentHighlight[];
  privateNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentHighlight {
  studentId: number;
  studentName: string;
  type: 'improvement' | 'achievement' | 'concern' | 'milestone';
  note: string;
}

function ClassFeedback() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [classes, setClasses] = useState<ClassWithFeedback[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassWithFeedback[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithFeedback | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [viewFeedbackModalVisible, setViewFeedbackModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'no_feedback'>('completed');

  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState<Partial<ClassFeedback>>({
    overallRating: 5,
    energyLevel: 'medium',
    difficultyFeedback: 'just_right',
    classSummary: '',
    achievements: '',
    challenges: '',
    improvements: '',
    studentHighlights: [],
    privateNotes: '',
  });

  const [newStudentHighlight, setNewStudentHighlight] = useState({
    studentId: 0,
    studentName: '',
    type: 'improvement' as StudentHighlight['type'],
    note: '',
  });

  useEffect(() => {
    loadClassData();
  }, []);

  useEffect(() => {
    filterClasses();
  }, [classes, searchQuery, filter]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      const response = await classService.getInstructorClasses(user?.id || 5);
      
      if (response.success && response.data) {
        // Filter to past classes only and add mock feedback data
        const pastClasses = response.data
          .filter(cls => new Date(`${cls.date} ${cls.time}`) < new Date())
          .map(cls => ({
            ...cls,
            feedback: Math.random() > 0.6 ? createMockFeedback(cls.id) : undefined,
          }));
        
        setClasses(pastClasses);
      }
    } catch (error) {
      console.error('Failed to load class data:', error);
      Alert.alert('Error', 'Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const createMockFeedback = (classId: number): ClassFeedback => ({
    id: Math.random(),
    classId,
    instructorId: user?.id || 5,
    overallRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
    energyLevel: ['medium', 'high'][Math.floor(Math.random() * 2)] as 'medium' | 'high',
    difficultyFeedback: ['just_right', 'too_hard'][Math.floor(Math.random() * 2)] as 'just_right' | 'too_hard',
    classSummary: 'Great energy from the group today. Everyone seemed engaged and focused.',
    achievements: 'Several students nailed their first full roll-up sequence!',
    challenges: 'Some difficulty with the teaser variations - need more core prep.',
    improvements: 'Add more breathing cues during challenging sequences.',
    studentHighlights: [
      {
        studentId: 1,
        studentName: 'Sarah Wilson',
        type: 'achievement',
        note: 'Completed her first unassisted roll-up!'
      }
    ],
    privateNotes: 'Check with Michael about lower back - seemed uncomfortable during bridging.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClassData();
    setRefreshing(false);
  };

  const filterClasses = () => {
    let filtered = classes.filter(cls => {
      const matchesSearch = cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           cls.date.includes(searchQuery);
      
      switch (filter) {
        case 'completed':
          return matchesSearch && new Date(`${cls.date} ${cls.time}`) < new Date();
        case 'no_feedback':
          return matchesSearch && !cls.feedback;
        default:
          return matchesSearch;
      }
    });

    // Sort by date (most recent first)
    filtered.sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime());
    
    setFilteredClasses(filtered);
  };

  const openAddFeedback = async (classObj: ClassWithFeedback) => {
    try {
      // Load attendees for the class
      const attendeesResponse = await bookingService.getClassAttendees(classObj.id);
      if (attendeesResponse.success && attendeesResponse.data) {
        classObj.attendees = attendeesResponse.data;
      }
      
      setSelectedClass(classObj);
      setFeedbackForm({
        overallRating: 5,
        energyLevel: 'medium',
        difficultyFeedback: 'just_right',
        classSummary: '',
        achievements: '',
        challenges: '',
        improvements: '',
        studentHighlights: [],
        privateNotes: '',
      });
      setFeedbackModalVisible(true);
    } catch (error) {
      console.error('Failed to load class attendees:', error);
      setSelectedClass(classObj);
      setFeedbackModalVisible(true);
    }
  };

  const openViewFeedback = (classObj: ClassWithFeedback) => {
    setSelectedClass(classObj);
    setViewFeedbackModalVisible(true);
  };

  const addStudentHighlight = () => {
    if (!newStudentHighlight.studentName || !newStudentHighlight.note) {
      Alert.alert('Error', 'Please fill in student name and note');
      return;
    }

    const highlight: StudentHighlight = {
      studentId: newStudentHighlight.studentId || Date.now(),
      studentName: newStudentHighlight.studentName,
      type: newStudentHighlight.type,
      note: newStudentHighlight.note,
    };

    setFeedbackForm(prev => ({
      ...prev,
      studentHighlights: [...(prev.studentHighlights || []), highlight],
    }));

    setNewStudentHighlight({
      studentId: 0,
      studentName: '',
      type: 'improvement',
      note: '',
    });
  };

  const removeStudentHighlight = (index: number) => {
    setFeedbackForm(prev => ({
      ...prev,
      studentHighlights: prev.studentHighlights?.filter((_, i) => i !== index) || [],
    }));
  };

  const saveFeedback = async () => {
    if (!selectedClass || !feedbackForm.classSummary?.trim()) {
      Alert.alert('Error', 'Please add at least a class summary');
      return;
    }

    try {
      // This would call a backend API to save the feedback
      const newFeedback: ClassFeedback = {
        id: Date.now(),
        classId: selectedClass.id,
        instructorId: user?.id || 5,
        overallRating: feedbackForm.overallRating || 5,
        energyLevel: feedbackForm.energyLevel || 'medium',
        difficultyFeedback: feedbackForm.difficultyFeedback || 'just_right',
        classSummary: feedbackForm.classSummary?.trim() || '',
        achievements: feedbackForm.achievements?.trim() || '',
        challenges: feedbackForm.challenges?.trim() || '',
        improvements: feedbackForm.improvements?.trim() || '',
        studentHighlights: feedbackForm.studentHighlights || [],
        privateNotes: feedbackForm.privateNotes?.trim() || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update local state
      const updatedClasses = classes.map(cls => 
        cls.id === selectedClass.id ? { ...cls, feedback: newFeedback } : cls
      );
      setClasses(updatedClasses);
      
      setFeedbackModalVisible(false);
      Alert.alert('Success', 'Class feedback saved successfully');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      Alert.alert('Error', 'Failed to save feedback');
    }
  };

  const getHighlightIcon = (type: StudentHighlight['type']) => {
    switch (type) {
      case 'achievement': return 'star';
      case 'improvement': return 'trending-up';
      case 'concern': return 'warning';
      case 'milestone': return 'flag';
      default: return 'note';
    }
  };

  const getHighlightColor = (type: StudentHighlight['type']) => {
    switch (type) {
      case 'achievement': return '#4caf50';
      case 'improvement': return '#2196f3';
      case 'concern': return '#ff9800';
      case 'milestone': return '#9c27b0';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour12 = parseInt(hours) > 12 ? parseInt(hours) - 12 : parseInt(hours);
    const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <Title style={styles.headerTitle}>Class Feedback</Title>
        <Paragraph style={styles.headerSubtitle}>
          Add post-class notes and student feedback
        </Paragraph>
      </Surface>

      {/* Search and Filter Controls */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search classes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filterContainer}>
          {[
            { key: 'completed', label: 'Completed' },
            { key: 'no_feedback', label: 'No Feedback' },
            { key: 'all', label: 'All' }
          ].map((filterOption) => (
            <Chip
              key={filterOption.key}
              selected={filter === filterOption.key}
              onPress={() => setFilter(filterOption.key as typeof filter)}
              style={[styles.filterChip, filter === filterOption.key && styles.filterChipSelected]}
            >
              {filterOption.label}
            </Chip>
          ))}
        </View>
      </View>

      {/* Class List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredClasses.map((classObj) => (
          <Card key={classObj.id} style={styles.classCard}>
            <Card.Content>
              <View style={styles.classHeader}>
                <View style={styles.classInfo}>
                  <Title style={styles.className}>{classObj.name}</Title>
                  <View style={styles.classDetails}>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="access-time" size={16} color="#666" />
                      <Paragraph style={styles.detailText}>
                        {formatDate(classObj.date)} at {formatTime(classObj.time)}
                      </Paragraph>
                    </View>
                    <View style={styles.detailRow}>
                      <MaterialIcons name="group" size={16} color="#666" />
                      <Paragraph style={styles.detailText}>
                        {`${classObj.enrolled || 0}/${classObj.capacity} students`}
                      </Paragraph>
                    </View>
                  </View>
                </View>
                
                <View style={styles.classStatus}>
                  {classObj.feedback ? (
                    <Chip 
                      icon="check-circle" 
                      style={styles.completedChip}
                      textStyle={styles.chipText}
                    >
                      Feedback Added
                    </Chip>
                  ) : (
                    <Chip 
                      icon="pending" 
                      style={styles.pendingChip}
                      textStyle={styles.chipText}
                    >
                      Pending Feedback
                    </Chip>
                  )}
                </View>
              </View>

              {/* Feedback Preview */}
              {classObj.feedback && (
                <View style={styles.feedbackPreview}>
                  <View style={styles.ratingContainer}>
                    <Paragraph style={styles.ratingLabel}>Overall:</Paragraph>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name={star <= classObj.feedback!.overallRating ? "star" : "star-border"}
                          size={16}
                          color="#ffa726"
                        />
                      ))}
                    </View>
                    <Chip 
                      style={styles.energyChip}
                      textStyle={{ fontSize: 11 }}
                    >
                      {classObj.feedback.energyLevel} energy
                    </Chip>
                  </View>
                  
                  <Paragraph style={styles.summaryPreview} numberOfLines={2}>
                    {classObj.feedback.classSummary}
                  </Paragraph>

                  {classObj.feedback.studentHighlights.length > 0 && (
                    <View style={styles.highlightsPreview}>
                      <Paragraph style={styles.highlightsLabel}>
                        {`${classObj.feedback.studentHighlights.length} Student Highlight(s)`}
                      </Paragraph>
                    </View>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {classObj.feedback ? (
                  <>
                    <Button
                      mode="outlined"
                      onPress={() => openViewFeedback(classObj)}
                      style={styles.actionButton}
                      icon="eye"
                      compact
                    >
                      View Feedback
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => openAddFeedback(classObj)}
                      style={styles.actionButton}
                      icon="pencil"
                      compact
                    >
                      Edit Feedback
                    </Button>
                  </>
                ) : (
                  <Button
                    mode="contained"
                    onPress={() => openAddFeedback(classObj)}
                    style={[styles.actionButton, { flex: 1 }]}
                    icon="note-plus"
                  >
                    Add Feedback
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredClasses.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="rate-review" size={64} color="#ccc" />
            <Title style={styles.emptyTitle}>No Classes Found</Title>
            <Paragraph style={styles.emptyText}>
              {filter === 'no_feedback' 
                ? 'All your recent classes have feedback!' 
                : 'No completed classes match your search'}
            </Paragraph>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Feedback Modal */}
      <Portal>
        <Modal
          visible={feedbackModalVisible}
          onDismiss={() => setFeedbackModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedClass && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>
                  {`${selectedClass.feedback ? 'Edit' : 'Add'} Class Feedback`}
                </Title>
                <IconButton
                  icon="close"
                  onPress={() => setFeedbackModalVisible(false)}
                  style={styles.closeButton}
                />
              </View>

              <Paragraph style={styles.classNameInModal}>
                {`${selectedClass.name} - ${formatDate(selectedClass.date)}`}
              </Paragraph>

              {/* Overall Rating */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Overall Class Rating</Title>
                  <View style={styles.ratingSelector}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <IconButton
                        key={rating}
                        icon={rating <= (feedbackForm.overallRating || 0) ? "star" : "star-border"}
                        onPress={() => setFeedbackForm(prev => ({ ...prev, overallRating: rating }))}
                        iconColor="#ffa726"
                        size={32}
                      />
                    ))}
                  </View>
                </Card.Content>
              </Card>

              {/* Energy Level and Difficulty */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Class Dynamics</Title>
                  
                  <Paragraph style={styles.sectionLabel}>Energy Level</Paragraph>
                  <View style={styles.chipGroup}>
                    {(['low', 'medium', 'high'] as const).map((level) => (
                      <Chip
                        key={level}
                        selected={feedbackForm.energyLevel === level}
                        onPress={() => setFeedbackForm(prev => ({ ...prev, energyLevel: level }))}
                        style={styles.selectionChip}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Chip>
                    ))}
                  </View>

                  <Paragraph style={styles.sectionLabel}>Difficulty Level</Paragraph>
                  <View style={styles.chipGroup}>
                    {([
                      { key: 'too_easy', label: 'Too Easy' },
                      { key: 'just_right', label: 'Just Right' },
                      { key: 'too_hard', label: 'Too Hard' }
                    ] as const).map((difficulty) => (
                      <Chip
                        key={difficulty.key}
                        selected={feedbackForm.difficultyFeedback === difficulty.key}
                        onPress={() => setFeedbackForm(prev => ({ ...prev, difficultyFeedback: difficulty.key }))}
                        style={styles.selectionChip}
                      >
                        {difficulty.label}
                      </Chip>
                    ))}
                  </View>
                </Card.Content>
              </Card>

              {/* Class Summary */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <TextInput
                    label="Class Summary *"
                    value={feedbackForm.classSummary}
                    onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, classSummary: text }))}
                    multiline
                    numberOfLines={3}
                    style={styles.textInput}
                  />
                </Card.Content>
              </Card>

              {/* Achievements, Challenges, Improvements */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <TextInput
                    label="Achievements & Successes"
                    value={feedbackForm.achievements}
                    onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, achievements: text }))}
                    multiline
                    numberOfLines={2}
                    style={styles.textInput}
                  />
                  
                  <TextInput
                    label="Challenges & Difficulties"
                    value={feedbackForm.challenges}
                    onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, challenges: text }))}
                    multiline
                    numberOfLines={2}
                    style={styles.textInput}
                  />
                  
                  <TextInput
                    label="Areas for Improvement"
                    value={feedbackForm.improvements}
                    onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, improvements: text }))}
                    multiline
                    numberOfLines={2}
                    style={styles.textInput}
                  />
                </Card.Content>
              </Card>

              {/* Student Highlights */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Student Highlights</Title>
                  
                  {/* Add New Highlight */}
                  <View style={styles.addHighlightContainer}>
                    <TextInput
                      label="Student Name"
                      value={newStudentHighlight.studentName}
                      onChangeText={(text) => setNewStudentHighlight(prev => ({ ...prev, studentName: text }))}
                      style={styles.highlightInput}
                    />
                    
                    <View style={styles.highlightTypeContainer}>
                      <Paragraph style={styles.sectionLabel}>Type</Paragraph>
                      <View style={styles.chipGroup}>
                        {(['improvement', 'achievement', 'concern', 'milestone'] as const).map((type) => (
                          <Chip
                            key={type}
                            selected={newStudentHighlight.type === type}
                            onPress={() => setNewStudentHighlight(prev => ({ ...prev, type }))}
                            style={[
                              styles.selectionChip,
                              newStudentHighlight.type === type && { backgroundColor: getHighlightColor(type) + '20' }
                            ]}
                            icon={getHighlightIcon(type)}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </Chip>
                        ))}
                      </View>
                    </View>
                    
                    <TextInput
                      label="Note"
                      value={newStudentHighlight.note}
                      onChangeText={(text) => setNewStudentHighlight(prev => ({ ...prev, note: text }))}
                      multiline
                      numberOfLines={2}
                      style={styles.highlightInput}
                    />
                    
                    <Button
                      mode="outlined"
                      onPress={addStudentHighlight}
                      style={styles.addHighlightButton}
                      icon="plus"
                    >
                      Add Highlight
                    </Button>
                  </View>

                  {/* Existing Highlights */}
                  {feedbackForm.studentHighlights && feedbackForm.studentHighlights.length > 0 && (
                    <View style={styles.existingHighlights}>
                      <Divider style={styles.divider} />
                      <Paragraph style={styles.existingHighlightsLabel}>
                        {`Added Highlights (${feedbackForm.studentHighlights.length})`}
                      </Paragraph>
                      
                      {feedbackForm.studentHighlights.map((highlight, index) => (
                        <View key={index} style={styles.highlightItem}>
                          <View style={styles.highlightContent}>
                            <View style={styles.highlightHeader}>
                              <MaterialIcons 
                                name={getHighlightIcon(highlight.type)} 
                                size={20} 
                                color={getHighlightColor(highlight.type)} 
                              />
                              <Paragraph style={styles.highlightStudent}>{highlight.studentName}</Paragraph>
                              <Chip 
                                style={[styles.highlightTypeChip, { backgroundColor: getHighlightColor(highlight.type) + '20' }]}
                                textStyle={{ fontSize: 11 }}
                              >
                                {highlight.type}
                              </Chip>
                            </View>
                            <Paragraph style={styles.highlightNote}>{highlight.note}</Paragraph>
                          </View>
                          <IconButton
                            icon="delete"
                            onPress={() => removeStudentHighlight(index)}
                            iconColor="#f44336"
                            size={20}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>

              {/* Private Notes */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <TextInput
                    label="Private Notes (Instructor Only)"
                    value={feedbackForm.privateNotes}
                    onChangeText={(text) => setFeedbackForm(prev => ({ ...prev, privateNotes: text }))}
                    multiline
                    numberOfLines={3}
                    style={styles.textInput}
                    left={<TextInput.Icon icon="lock" size={20} />}
                  />
                </Card.Content>
              </Card>

              {/* Save Actions */}
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setFeedbackModalVisible(false)}
                  style={styles.modalActionButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={saveFeedback}
                  style={styles.modalActionButton}
                  disabled={!feedbackForm.classSummary?.trim()}
                >
                  Save Feedback
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      {/* View Feedback Modal */}
      <Portal>
        <Modal
          visible={viewFeedbackModalVisible}
          onDismiss={() => setViewFeedbackModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedClass && selectedClass.feedback && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>Class Feedback</Title>
                <IconButton
                  icon="close"
                  onPress={() => setViewFeedbackModalVisible(false)}
                  style={styles.closeButton}
                />
              </View>

              <Paragraph style={styles.classNameInModal}>
                {selectedClass.name} - {formatDate(selectedClass.date)}
              </Paragraph>

              {/* Feedback Details */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <View style={styles.feedbackRating}>
                    <View style={styles.starsContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcons
                          key={star}
                          name={star <= selectedClass.feedback!.overallRating ? "star" : "star-border"}
                          size={24}
                          color="#ffa726"
                        />
                      ))}
                    </View>
                    <View style={styles.dynamicsChips}>
                      <Chip style={styles.viewChip}>
                        {selectedClass.feedback.energyLevel} energy
                      </Chip>
                      <Chip style={styles.viewChip}>
                        {selectedClass.feedback.difficultyFeedback.replace('_', ' ')}
                      </Chip>
                    </View>
                  </View>

                  <Title style={styles.feedbackSectionTitle}>Class Summary</Title>
                  <Paragraph style={styles.feedbackText}>{selectedClass.feedback.classSummary}</Paragraph>

                  {selectedClass.feedback.achievements && (
                    <>
                      <Title style={styles.feedbackSectionTitle}>Achievements</Title>
                      <Paragraph style={styles.feedbackText}>{selectedClass.feedback.achievements}</Paragraph>
                    </>
                  )}

                  {selectedClass.feedback.challenges && (
                    <>
                      <Title style={styles.feedbackSectionTitle}>Challenges</Title>
                      <Paragraph style={styles.feedbackText}>{selectedClass.feedback.challenges}</Paragraph>
                    </>
                  )}

                  {selectedClass.feedback.improvements && (
                    <>
                      <Title style={styles.feedbackSectionTitle}>Improvements</Title>
                      <Paragraph style={styles.feedbackText}>{selectedClass.feedback.improvements}</Paragraph>
                    </>
                  )}

                  {selectedClass.feedback.studentHighlights.length > 0 && (
                    <>
                      <Title style={styles.feedbackSectionTitle}>Student Highlights</Title>
                      {selectedClass.feedback.studentHighlights.map((highlight, index) => (
                        <View key={index} style={styles.viewHighlightItem}>
                          <View style={styles.highlightHeader}>
                            <MaterialIcons 
                              name={getHighlightIcon(highlight.type)} 
                              size={18} 
                              color={getHighlightColor(highlight.type)} 
                            />
                            <Paragraph style={styles.highlightStudent}>{highlight.studentName}</Paragraph>
                            <Chip 
                              style={[styles.highlightTypeChip, { backgroundColor: getHighlightColor(highlight.type) + '20' }]}
                              textStyle={{ fontSize: 10 }}
                            >
                              {highlight.type}
                            </Chip>
                          </View>
                          <Paragraph style={styles.highlightNote}>{highlight.note}</Paragraph>
                        </View>
                      ))}
                    </>
                  )}

                  {selectedClass.feedback.privateNotes && (
                    <>
                      <Title style={styles.feedbackSectionTitle}>
                        <MaterialIcons name="lock" size={18} color="#666" /> Private Notes
                      </Title>
                      <Paragraph style={[styles.feedbackText, styles.privateText]}>
                        {selectedClass.feedback.privateNotes}
                      </Paragraph>
                    </>
                  )}
                </Card.Content>
              </Card>

              <View style={styles.modalActions}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setViewFeedbackModalVisible(false);
                    openAddFeedback(selectedClass);
                  }}
                  style={[styles.modalActionButton, { flex: 1 }]}
                  icon="pencil"
                >
                  Edit Feedback
                </Button>
              </View>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          const classWithoutFeedback = filteredClasses.find(cls => !cls.feedback);
          if (classWithoutFeedback) {
            openAddFeedback(classWithoutFeedback);
          }
        }}
        label="Add Feedback"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    gap: 12,
  },
  searchbar: {
    elevation: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'white',
  },
  filterChipSelected: {
    backgroundColor: '#e3f2fd',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  classCard: {
    marginBottom: 16,
    elevation: 2,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    marginBottom: 6,
  },
  classDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  classStatus: {
    alignItems: 'flex-end',
  },
  completedChip: {
    backgroundColor: '#e8f5e8',
  },
  pendingChip: {
    backgroundColor: '#fff3e0',
  },
  chipText: {
    fontSize: 12,
  },
  feedbackPreview: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingLabel: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  energyChip: {
    backgroundColor: '#f0f0f0',
  },
  summaryPreview: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  highlightsPreview: {
    marginTop: 4,
  },
  highlightsLabel: {
    fontSize: 12,
    color: '#2196f3',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 16,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    margin: 0,
  },
  classNameInModal: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalCard: {
    margin: 16,
    marginTop: 8,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  sectionLabel: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  selectionChip: {
    backgroundColor: 'white',
  },
  textInput: {
    marginBottom: 12,
  },
  addHighlightContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  highlightInput: {
    marginBottom: 12,
  },
  highlightTypeContainer: {
    marginBottom: 12,
  },
  addHighlightButton: {
    marginTop: 8,
  },
  existingHighlights: {
    marginTop: 16,
  },
  divider: {
    marginVertical: 16,
  },
  existingHighlightsLabel: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
  },
  highlightContent: {
    flex: 1,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  highlightStudent: {
    fontWeight: 'bold',
    flex: 1,
  },
  highlightTypeChip: {
    height: 24,
  },
  highlightNote: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    margin: 20,
    marginTop: 24,
  },
  modalActionButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  feedbackRating: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dynamicsChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  viewChip: {
    backgroundColor: '#f0f0f0',
  },
  feedbackSectionTitle: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  feedbackText: {
    lineHeight: 22,
    marginBottom: 8,
  },
  viewHighlightItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  privateText: {
    fontStyle: 'italic',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
  },
});

export default ClassFeedback; 