import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Chip, FAB, IconButton, List, Modal, Paragraph, Portal, Searchbar, Surface, TextInput, Title } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface Student {
  id: number;
  name: string;
  email: string;
  phone?: string;
  emergency_contact?: string;
  medical_conditions?: string;
  profile_image?: string;
  totalClasses: number;
  attendanceRate: number;
  lastClassDate?: string;
  progressNotes: ProgressNote[];
}

interface ProgressNote {
  id: number;
  studentId: number;
  instructorId: number;
  classId?: number;
  className?: string;
  classDate?: string;
  note: string;
  category: 'improvement' | 'concern' | 'achievement' | 'general';
  private: boolean;
  createdAt: string;
  updatedAt: string;
}

function StudentProgress() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [addNoteModalVisible, setAddNoteModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'attendance'>('name');
  
  // New note form state
  const [newNote, setNewNote] = useState({
    note: '',
    category: 'general' as ProgressNote['category'],
    private: false,
    classId: undefined as number | undefined,
  });

  useEffect(() => {
    loadStudentData();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, sortBy]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      // This would be a new endpoint to get instructor's students with progress data
      // For now, we'll simulate the data structure
      const mockStudents: Student[] = [
        {
          id: 1,
          name: 'Sarah Wilson',
          email: 'sarah@example.com',
          phone: '+1 (555) 123-4567',
          emergency_contact: 'John Wilson - (555) 987-6543',
          medical_conditions: 'Lower back sensitivity',
          totalClasses: 24,
          attendanceRate: 89,
          lastClassDate: '2025-06-02',
          progressNotes: [
            {
              id: 1,
              studentId: 1,
              instructorId: user?.id || 5,
              classId: 45,
              className: 'Power Mat',
              classDate: '2025-06-02',
              note: 'Excellent improvement in core strength. Held plank for full 60 seconds today!',
              category: 'achievement',
              private: false,
              createdAt: '2025-06-02T10:30:00Z',
              updatedAt: '2025-06-02T10:30:00Z',
            },
            {
              id: 2,
              studentId: 1,
              instructorId: user?.id || 5,
              note: 'Needs to focus on breathing during challenging poses. Tends to hold breath.',
              category: 'improvement',
              private: true,
              createdAt: '2025-05-28T09:15:00Z',
              updatedAt: '2025-05-28T09:15:00Z',
            }
          ]
        },
        {
          id: 2,
          name: 'Michael Chen',
          email: 'michael@example.com',
          phone: '+1 (555) 234-5678',
          totalClasses: 31,
          attendanceRate: 94,
          lastClassDate: '2025-06-01',
          progressNotes: [
            {
              id: 3,
              studentId: 2,
              instructorId: user?.id || 5,
              classId: 44,
              className: 'Reformer Flow',
              classDate: '2025-06-01',
              note: 'Ready to advance to intermediate reformer classes. Shows great control and form.',
              category: 'achievement',
              private: false,
              createdAt: '2025-06-01T14:20:00Z',
              updatedAt: '2025-06-01T14:20:00Z',
            }
          ]
        },
        {
          id: 3,
          name: 'Emma Rodriguez',
          email: 'emma@example.com',
          phone: '+1 (555) 345-6789',
          emergency_contact: 'Carlos Rodriguez - (555) 876-5432',
          medical_conditions: 'Pregnancy - Second trimester',
          totalClasses: 12,
          attendanceRate: 75,
          lastClassDate: '2025-05-30',
          progressNotes: [
            {
              id: 4,
              studentId: 3,
              instructorId: user?.id || 5,
              note: 'Ensure modifications are being followed. Check comfort level regularly.',
              category: 'concern',
              private: true,
              createdAt: '2025-05-30T11:45:00Z',
              updatedAt: '2025-05-30T11:45:00Z',
            }
          ]
        }
      ];
      
      setStudents(mockStudents);
    } catch (error) {
      console.error('Failed to load student data:', error);
      Alert.alert('Error', 'Failed to load student progress data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStudentData();
    setRefreshing(false);
  };

  const filterStudents = () => {
    let filtered = students.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort students
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent':
          return new Date(b.lastClassDate || 0).getTime() - new Date(a.lastClassDate || 0).getTime();
        case 'attendance':
          return b.attendanceRate - a.attendanceRate;
        default:
          return 0;
      }
    });

    setFilteredStudents(filtered);
  };

  const openStudentDetails = (student: Student) => {
    setSelectedStudent(student);
    setStudentModalVisible(true);
  };

  const openAddNote = (student: Student) => {
    setSelectedStudent(student);
    setNewNote({
      note: '',
      category: 'general',
      private: false,
      classId: undefined,
    });
    setAddNoteModalVisible(true);
  };

  const saveProgressNote = async () => {
    if (!selectedStudent || !newNote.note.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      // This would call a backend API to save the progress note
      const noteData: Partial<ProgressNote> = {
        studentId: selectedStudent.id,
        instructorId: user?.id || 5,
        note: newNote.note.trim(),
        category: newNote.category,
        private: newNote.private,
        classId: newNote.classId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Update local state for immediate feedback
      const updatedStudents = students.map(student => {
        if (student.id === selectedStudent.id) {
          return {
            ...student,
            progressNotes: [
              {
                ...noteData,
                id: Date.now(), // Temporary ID
              } as ProgressNote,
              ...student.progressNotes,
            ]
          };
        }
        return student;
      });

      setStudents(updatedStudents);
      setAddNoteModalVisible(false);
      Alert.alert('Success', 'Progress note saved successfully');
    } catch (error) {
      console.error('Failed to save progress note:', error);
      Alert.alert('Error', 'Failed to save progress note');
    }
  };

  const getCategoryIcon = (category: ProgressNote['category']) => {
    switch (category) {
      case 'achievement': return 'star';
      case 'improvement': return 'trending-up';
      case 'concern': return 'warning';
      default: return 'note';
    }
  };

  const getCategoryColor = (category: ProgressNote['category']) => {
    switch (category) {
      case 'achievement': return '#4caf50';
      case 'improvement': return '#2196f3';
      case 'concern': return '#ff9800';
      default: return '#666';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <Title style={styles.headerTitle}>Student Progress</Title>
        <Paragraph style={styles.headerSubtitle}>
          Track and manage student development
        </Paragraph>
      </Surface>

      {/* Search and Filter Controls */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search students..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.sortContainer}>
          {['name', 'recent', 'attendance'].map((sort) => (
            <Chip
              key={sort}
              selected={sortBy === sort}
              onPress={() => setSortBy(sort as typeof sortBy)}
              style={[styles.sortChip, sortBy === sort && styles.sortChipSelected]}
            >
              {sort === 'name' ? 'Name' : sort === 'recent' ? 'Recent' : 'Attendance'}
            </Chip>
          ))}
        </View>
      </View>

      {/* Student List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredStudents.map((student) => (
          <Card key={student.id} style={styles.studentCard}>
            <Card.Content>
              <View style={styles.studentHeader}>
                <View style={styles.studentInfo}>
                  <Avatar.Text 
                    size={50} 
                    label={student.name.split(' ').map(n => n[0]).join('')}
                    style={styles.avatar}
                  />
                  <View style={styles.studentDetails}>
                    <Title style={styles.studentName}>{student.name}</Title>
                    <Paragraph style={styles.studentEmail}>{student.email}</Paragraph>
                    {student.lastClassDate && (
                      <Paragraph style={styles.lastClass}>
                        Last class: {formatDate(student.lastClassDate)}
                      </Paragraph>
                    )}
                  </View>
                </View>
                
                <View style={styles.studentStats}>
                  <View style={styles.statItem}>
                    <Paragraph style={styles.statNumber}>{student.totalClasses}</Paragraph>
                    <Paragraph style={styles.statLabel}>Classes</Paragraph>
                  </View>
                  <View style={styles.statItem}>
                    <Paragraph style={styles.statNumber}>{student.attendanceRate}%</Paragraph>
                    <Paragraph style={styles.statLabel}>Attendance</Paragraph>
                  </View>
                </View>
              </View>

              {/* Recent Progress Notes */}
              {student.progressNotes.length > 0 && (
                <View style={styles.recentNotes}>
                  <Paragraph style={styles.recentNotesTitle}>Recent Notes</Paragraph>
                  {student.progressNotes.slice(0, 2).map((note) => (
                    <View key={note.id} style={styles.notePreview}>
                      <MaterialIcons 
                        name={getCategoryIcon(note.category)} 
                        size={16} 
                        color={getCategoryColor(note.category)} 
                      />
                      <Paragraph style={styles.noteText} numberOfLines={2}>
                        {note.note}
                      </Paragraph>
                      {note.private && (
                        <MaterialIcons name="lock" size={14} color="#666" />
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  onPress={() => openStudentDetails(student)}
                  style={styles.actionButton}
                  icon="eye"
                  compact
                >
                  View Details
                </Button>
                <Button
                  mode="contained"
                  onPress={() => openAddNote(student)}
                  style={styles.actionButton}
                  icon="note-plus"
                  compact
                >
                  Add Note
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}

        {filteredStudents.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="school" size={64} color="#ccc" />
            <Title style={styles.emptyTitle}>No Students Found</Title>
            <Paragraph style={styles.emptyText}>
              {searchQuery ? 'No students match your search' : 'No students have attended your classes yet'}
            </Paragraph>
          </View>
        )}
      </ScrollView>

      {/* Student Details Modal */}
      <Portal>
        <Modal
          visible={studentModalVisible}
          onDismiss={() => setStudentModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          {selectedStudent && (
            <ScrollView>
              <View style={styles.modalHeader}>
                <Title style={styles.modalTitle}>{selectedStudent.name}</Title>
                <IconButton
                  icon="close"
                  onPress={() => setStudentModalVisible(false)}
                  style={styles.closeButton}
                />
              </View>

              {/* Student Information */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Student Information</Title>
                  <List.Item
                    title="Email"
                    description={selectedStudent.email}
                    left={() => <MaterialIcons name="email" size={24} color="#666" />}
                  />
                  {selectedStudent.phone && (
                    <List.Item
                      title="Phone"
                      description={selectedStudent.phone}
                      left={() => <MaterialIcons name="phone" size={24} color="#666" />}
                    />
                  )}
                  {selectedStudent.emergency_contact && (
                    <List.Item
                      title="Emergency Contact"
                      description={selectedStudent.emergency_contact}
                      left={() => <MaterialIcons name="contact-phone" size={24} color="#666" />}
                    />
                  )}
                  {selectedStudent.medical_conditions && (
                    <List.Item
                      title="Medical Conditions"
                      description={selectedStudent.medical_conditions}
                      left={() => <MaterialIcons name="medical-services" size={24} color="#f44336" />}
                    />
                  )}
                </Card.Content>
              </Card>

              {/* Progress Statistics */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Progress Statistics</Title>
                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Paragraph style={styles.statNumber}>{selectedStudent.totalClasses}</Paragraph>
                      <Paragraph style={styles.statLabel}>Total Classes</Paragraph>
                    </View>
                    <View style={styles.statCard}>
                      <Paragraph style={styles.statNumber}>{selectedStudent.attendanceRate}%</Paragraph>
                      <Paragraph style={styles.statLabel}>Attendance Rate</Paragraph>
                    </View>
                    <View style={styles.statCard}>
                      <Paragraph style={styles.statNumber}>{selectedStudent.progressNotes.length}</Paragraph>
                      <Paragraph style={styles.statLabel}>Progress Notes</Paragraph>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* All Progress Notes */}
              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Progress Notes ({selectedStudent.progressNotes.length})</Title>
                  {selectedStudent.progressNotes.map((note) => (
                    <View key={note.id} style={styles.noteItem}>
                      <View style={styles.noteHeader}>
                        <View style={styles.noteCategory}>
                          <MaterialIcons 
                            name={getCategoryIcon(note.category)} 
                            size={20} 
                            color={getCategoryColor(note.category)} 
                          />
                          <Paragraph style={styles.categoryText}>
                            {note.category.charAt(0).toUpperCase() + note.category.slice(1)}
                          </Paragraph>
                          {note.private && (
                            <MaterialIcons name="lock" size={16} color="#666" />
                          )}
                        </View>
                        <Paragraph style={styles.noteDate}>
                          {formatDate(note.createdAt)}
                        </Paragraph>
                      </View>
                      
                      {note.className && (
                        <Paragraph style={styles.noteClass}>
                          Class: {note.className} - {note.classDate && formatDate(note.classDate)}
                        </Paragraph>
                      )}
                      
                      <Paragraph style={styles.noteContent}>{note.note}</Paragraph>
                    </View>
                  ))}
                  
                  {selectedStudent.progressNotes.length === 0 && (
                    <View style={styles.noNotesContainer}>
                      <Paragraph style={styles.noNotesText}>No progress notes yet</Paragraph>
                      <Button
                        mode="contained"
                        onPress={() => {
                          setStudentModalVisible(false);
                          openAddNote(selectedStudent);
                        }}
                        style={styles.addFirstNoteButton}
                      >
                        Add First Note
                      </Button>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </ScrollView>
          )}
        </Modal>
      </Portal>

      {/* Add Note Modal */}
      <Portal>
        <Modal
          visible={addNoteModalVisible}
          onDismiss={() => setAddNoteModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Title style={styles.modalTitle}>Add Progress Note</Title>
            <IconButton
              icon="close"
              onPress={() => setAddNoteModalVisible(false)}
              style={styles.closeButton}
            />
          </View>

          {selectedStudent && (
            <View>
              <Paragraph style={styles.studentNameInModal}>
                For: {selectedStudent.name}
              </Paragraph>

              <TextInput
                label="Progress Note"
                value={newNote.note}
                onChangeText={(text) => setNewNote(prev => ({ ...prev, note: text }))}
                multiline
                numberOfLines={4}
                style={styles.noteInput}
              />

              <View style={styles.categorySelection}>
                <Paragraph style={styles.categoryLabel}>Category</Paragraph>
                <View style={styles.categoryChips}>
                  {(['general', 'improvement', 'achievement', 'concern'] as const).map((category) => (
                    <Chip
                      key={category}
                      selected={newNote.category === category}
                      onPress={() => setNewNote(prev => ({ ...prev, category }))}
                      style={[
                        styles.categoryChip,
                        newNote.category === category && { backgroundColor: getCategoryColor(category) + '20' }
                      ]}
                      icon={getCategoryIcon(category)}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Chip>
                  ))}
                </View>
              </View>

              <List.Item
                title="Private Note"
                description="Only visible to instructors"
                left={() => (
                  <MaterialIcons 
                    name={newNote.private ? "lock" : "lock-open"} 
                    size={24} 
                    color={newNote.private ? "#666" : "#ccc"} 
                  />
                )}
                right={() => (
                  <IconButton
                    icon={newNote.private ? "toggle-switch" : "toggle-switch-off"}
                    onPress={() => setNewNote(prev => ({ ...prev, private: !prev.private }))}
                    iconColor={newNote.private ? "#4caf50" : "#ccc"}
                  />
                )}
                onPress={() => setNewNote(prev => ({ ...prev, private: !prev.private }))}
                style={styles.privateToggle}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setAddNoteModalVisible(false)}
                  style={styles.modalActionButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={saveProgressNote}
                  style={styles.modalActionButton}
                  disabled={!newNote.note.trim()}
                >
                  Save Note
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          if (filteredStudents.length > 0) {
            openAddNote(filteredStudents[0]);
          }
        }}
        label="Add Note"
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
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortChip: {
    backgroundColor: 'white',
  },
  sortChipSelected: {
    backgroundColor: '#e3f2fd',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  studentCard: {
    marginBottom: 16,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    marginBottom: 4,
  },
  studentEmail: {
    color: '#666',
    fontSize: 14,
  },
  lastClass: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  studentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  recentNotes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  recentNotesTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  notePreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
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
  modalCard: {
    margin: 16,
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 80,
  },
  noteItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  noteDate: {
    fontSize: 12,
    color: '#666',
  },
  noteClass: {
    fontSize: 12,
    color: '#2196f3',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  noteContent: {
    lineHeight: 20,
  },
  noNotesContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noNotesText: {
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  addFirstNoteButton: {
    marginTop: 8,
  },
  studentNameInModal: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  noteInput: {
    margin: 16,
    marginTop: 8,
  },
  categorySelection: {
    margin: 16,
  },
  categoryLabel: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: 'white',
  },
  privateToggle: {
    marginHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
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
});

export default StudentProgress; 