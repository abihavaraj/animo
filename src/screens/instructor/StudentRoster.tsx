import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Chip,
  IconButton,
  List,
  Modal,
  Paragraph,
  Portal,
  Searchbar,
  SegmentedButtons,
  Surface,
  Title
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import WebCompatibleIcon from '../../components/WebCompatibleIcon';
import { bookingService } from '../../services/bookingService';
import { BackendClass, classService } from '../../services/classService';
import { RootState } from '../../store';

interface StudentInfo {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  checked_in: boolean;
  check_in_time?: string;
  status: string;
  class_id: number;
  class_name: string;
  class_date: string;
  class_time: string;
  emergency_contact?: string;
  medical_conditions?: string;
}

function StudentRoster() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [classes, setClasses] = useState<BackendClass[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState('today'); // today, upcoming, all
  const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [processingCheckIn, setProcessingCheckIn] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [viewMode, selectedClassId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load instructor's classes
      const classResponse = await classService.getClasses({
        instructor: user?.id?.toString(),
        status: 'active'
        // Removed upcoming: true filter so instructor can see all classes including past ones
      });

      if (classResponse.success && classResponse.data) {
        const currentDate = new Date();
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        let filteredClasses = classResponse.data;

        // Apply date filter
        if (viewMode === 'today') {
          filteredClasses = classResponse.data.filter(class_ => {
            const classDate = new Date(class_.date);
            return classDate.toDateString() === today.toDateString();
          });
        } else if (viewMode === 'upcoming') {
          filteredClasses = classResponse.data.filter(class_ => {
            const classDate = new Date(class_.date);
            return classDate >= today;
          });
        }

        setClasses(filteredClasses);

        // Load students for all classes or selected class
        const classIds = selectedClassId 
          ? [selectedClassId] 
          : filteredClasses.map(c => c.id);

        if (classIds.length > 0) {
          await loadStudentsForClasses(classIds);
        } else {
          setStudents([]);
        }
      } else {
        setClasses([]);
        setStudents([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForClasses = async (classIds: number[]) => {
    try {
      const allStudents: StudentInfo[] = [];

      for (const classId of classIds) {
        const attendeesResponse = await bookingService.getClassAttendees(classId);
        
        if (attendeesResponse.success && attendeesResponse.data) {
          const classInfo = classes.find(c => c.id === classId) || 
                           await getClassInfo(classId);
          
          const studentsWithClassInfo = attendeesResponse.data.map((student: any) => ({
            ...student,
            class_id: classId,
            class_name: classInfo?.name || 'Unknown Class',
            class_date: classInfo?.date || '',
            class_time: classInfo?.time || ''
          }));

          allStudents.push(...studentsWithClassInfo);
        }
      }

      setStudents(allStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  const getClassInfo = async (classId: number) => {
    try {
      const response = await classService.getClassById(classId);
      return response.success ? response.data : null;
    } catch {
      return null;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCheckIn = async (studentId: number, bookingId: number) => {
    try {
      setProcessingCheckIn(bookingId);
      
      const response = await bookingService.checkIn(bookingId);
      
      if (response.success) {
        // Update local state
        setStudents(prev => prev.map(student => 
          student.id === bookingId 
            ? { ...student, checked_in: true, check_in_time: new Date().toISOString() }
            : student
        ));
        Alert.alert('Success', 'Student checked in successfully');
      } else {
        Alert.alert('Error', 'Failed to check in student');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check in student');
    } finally {
      setProcessingCheckIn(null);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getClassTiming = (student: StudentInfo) => {
    return `${formatDate(student.class_date)} • ${formatTime(student.class_time)}`;
  };

  const filteredStudents = students.filter(student =>
    student.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedStudents = filteredStudents.reduce((groups, student) => {
    const key = selectedClassId ? 'all' : `${student.class_name} - ${getClassTiming(student)}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(student);
    return groups;
  }, {} as Record<string, StudentInfo[]>);

  const renderStudentItem = (student: StudentInfo) => {
    const isProcessing = processingCheckIn === student.id;
    
    return (
      <List.Item
        key={`${student.class_id}-${student.user_id}`}
        title={student.user_name}
        description={selectedClassId ? getClassTiming(student) : student.user_email}
        left={() => (
          <Avatar.Text 
            size={40} 
            label={student.user_name.charAt(0).toUpperCase()}
            style={{ backgroundColor: student.checked_in ? '#4caf50' : '#2196f3' }}
          />
        )}
        right={() => (
          <View style={styles.studentActions}>
            {student.checked_in ? (
              <Chip 
                icon="check-circle" 
                style={styles.checkedInChip}
                textStyle={{ color: '#4caf50' }}
              >
                Checked In
              </Chip>
            ) : (
              <Button
                mode="contained"
                onPress={() => handleCheckIn(student.user_id, student.id)}
                loading={isProcessing}
                disabled={isProcessing}
                style={styles.checkInButton}
                compact
              >
                Check In
              </Button>
            )}
            <IconButton
              icon="account-circle"
              onPress={() => {
                setSelectedStudent(student);
                setStudentModalVisible(true);
              }}
              style={styles.infoButton}
            />
          </View>
        )}
        style={styles.studentItem}
        onPress={() => {
          setSelectedStudent(student);
          setStudentModalVisible(true);
        }}
      />
    );
  };

  const totalStudents = filteredStudents.length;
  const checkedInStudents = filteredStudents.filter(s => s.checked_in).length;

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={2}>
        <Title style={styles.headerTitle}>Student Roster</Title>
        <Paragraph style={styles.headerSubtitle}>
          {totalStudents} students • {checkedInStudents} checked in
        </Paragraph>
      </Surface>

      <View style={styles.controls}>
        <Searchbar
          placeholder="Search students or classes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <SegmentedButtons
          value={viewMode}
          onValueChange={setViewMode}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'all', label: 'All Classes' }
          ]}
          style={styles.filterButtons}
        />

        {classes.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.classFilters}
          >
            <Chip
              selected={selectedClassId === null}
              onPress={() => setSelectedClassId(null)}
              style={styles.classChip}
            >
              All Classes
            </Chip>
            {classes.map(class_ => (
              <Chip
                key={class_.id}
                selected={selectedClassId === class_.id}
                onPress={() => setSelectedClassId(class_.id)}
                style={styles.classChip}
              >
                {class_.name}
              </Chip>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Paragraph style={styles.loadingText}>Loading students...</Paragraph>
          </View>
        ) : Object.keys(groupedStudents).length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <WebCompatibleIcon name="group" size={48} color="#ccc" />
              <Title style={styles.emptyTitle}>No students found</Title>
              <Paragraph style={styles.emptyText}>
                {viewMode === 'today' 
                  ? "No students are enrolled in today's classes."
                  : "No students match your search criteria."
                }
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          Object.entries(groupedStudents).map(([groupName, groupStudents]) => (
            <Card key={groupName} style={styles.classGroup}>
              <Card.Content>
                {!selectedClassId && (
                  <Title style={styles.groupTitle}>{groupName}</Title>
                )}
                {groupStudents.map(renderStudentItem)}
              </Card.Content>
            </Card>
          ))
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
                <Avatar.Text 
                  size={60} 
                  label={selectedStudent.user_name.charAt(0).toUpperCase()}
                  style={{ backgroundColor: selectedStudent.checked_in ? '#4caf50' : '#2196f3' }}
                />
                <View style={styles.modalHeaderText}>
                  <Title style={styles.modalTitle}>{selectedStudent.user_name}</Title>
                  <Paragraph style={styles.modalSubtitle}>{selectedStudent.user_email}</Paragraph>
                </View>
                <IconButton
                  icon="close"
                  onPress={() => setStudentModalVisible(false)}
                  style={styles.closeButton}
                />
              </View>

              <Card style={styles.modalCard}>
                <Card.Content>
                  <Title>Contact Information</Title>
                  <View style={styles.modalInfo}>
                    <View style={styles.infoRow}>
                      <WebCompatibleIcon name="email" size={20} color="#666" />
                      <Paragraph style={styles.infoText}>{selectedStudent.user_email}</Paragraph>
                    </View>
                    {selectedStudent.user_phone && (
                      <View style={styles.infoRow}>
                        <WebCompatibleIcon name="phone" size={20} color="#666" />
                        <Paragraph style={styles.infoText}>{selectedStudent.user_phone}</Paragraph>
                      </View>
                    )}
                    {selectedStudent.emergency_contact && (
                      <View style={styles.infoRow}>
                        <WebCompatibleIcon name="contact-emergency" size={20} color="#666" />
                        <Paragraph style={styles.infoText}>{selectedStudent.emergency_contact}</Paragraph>
                      </View>
                    )}
                  </View>

                  <Title style={styles.sectionTitle}>Class Information</Title>
                  <View style={styles.modalInfo}>
                    <View style={styles.infoRow}>
                      <WebCompatibleIcon name="sports-handball" size={20} color="#666" />
                      <Paragraph style={styles.infoText}>{selectedStudent.class_name}</Paragraph>
                    </View>
                    <View style={styles.infoRow}>
                      <WebCompatibleIcon name="access-time" size={20} color="#666" />
                      <Paragraph style={styles.infoText}>
                        {getClassTiming(selectedStudent)}
                      </Paragraph>
                    </View>
                    <View style={styles.infoRow}>
                      <WebCompatibleIcon name={selectedStudent.checked_in ? "check-circle" : "radio-button-unchecked"} size={20} color={selectedStudent.checked_in ? "#4caf50" : "#666"} />
                      <Paragraph style={[styles.infoText, { color: selectedStudent.checked_in ? '#4caf50' : '#666' }]}>
                        {selectedStudent.checked_in 
                          ? `Checked in${selectedStudent.check_in_time ? ` at ${new Date(selectedStudent.check_in_time).toLocaleTimeString()}` : ''}`
                          : 'Not checked in'
                        }
                      </Paragraph>
                    </View>
                  </View>

                  {selectedStudent.medical_conditions && (
                    <>
                      <Title style={styles.sectionTitle}>Medical Information</Title>
                      <View style={styles.medicalInfo}>
                        <WebCompatibleIcon name="local-hospital" size={20} color="#f44336" />
                        <Paragraph style={styles.medicalText}>{selectedStudent.medical_conditions}</Paragraph>
                      </View>
                    </>
                  )}
                </Card.Content>
              </Card>

              {!selectedStudent.checked_in && (
                <View style={styles.modalActions}>
                  <Button 
                    mode="contained" 
                    onPress={() => handleCheckIn(selectedStudent.user_id, selectedStudent.id)}
                    loading={processingCheckIn === selectedStudent.id}
                    disabled={processingCheckIn === selectedStudent.id}
                    icon="check-circle"
                    style={styles.modalActionButton}
                  >
                    Check In Student
                  </Button>
                </View>
              )}
            </ScrollView>
          )}
        </Modal>
      </Portal>
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
    paddingTop: 60,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  controls: {
    padding: 15,
    gap: 15,
  },
  searchbar: {
    elevation: 2,
  },
  filterButtons: {
    elevation: 1,
  },
  classFilters: {
    flexDirection: 'row',
  },
  classChip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  classGroup: {
    marginBottom: 15,
    elevation: 2,
  },
  groupTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#6200ee',
  },
  studentItem: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
    elevation: 1,
  },
  studentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInButton: {
    minWidth: 90,
  },
  checkedInChip: {
    backgroundColor: '#e8f5e8',
  },
  infoButton: {
    margin: 0,
  },
  emptyCard: {
    margin: 20,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  modalHeaderText: {
    flex: 1,
    marginLeft: 15,
  },
  modalTitle: {
    fontSize: 20,
  },
  modalSubtitle: {
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    margin: 0,
  },
  modalCard: {
    margin: 20,
    marginTop: 0,
  },
  modalInfo: {
    marginTop: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    flex: 1,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 16,
  },
  medicalInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  medicalText: {
    marginLeft: 10,
    flex: 1,
    color: '#d32f2f',
  },
  modalActions: {
    padding: 20,
  },
  modalActionButton: {
    width: '100%',
  },
});

export default StudentRoster; 