import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
    Avatar,
    Button,
    Card,
    Chip,
    Divider,
    List,
    Paragraph,
    Surface,
    Title
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { bookingService } from '../../services/bookingService';
import { classService } from '../../services/classService';
import { RootState } from '../../store';
import { logout } from '../../store/authSlice';

interface InstructorStats {
  totalClasses: number;
  totalStudents: number;
  thisMonthClasses: number;
  avgAttendance: number;
  upcomingClasses: number;
}

function InstructorProfile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<InstructorStats>({
    totalClasses: 0,
    totalStudents: 0,
    thisMonthClasses: 0,
    avgAttendance: 0,
    upcomingClasses: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInstructorStats();
  }, []);

  const loadInstructorStats = async () => {
    try {
      setLoading(true);
      
      // Get instructor's classes
      const classResponse = await classService.getClasses({
        instructor: user?.id?.toString(),
        status: 'active'
      });

      if (classResponse.success && classResponse.data) {
        const allClasses = classResponse.data;
        const currentDate = new Date();
        const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        // Calculate this month's classes
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        const thisMonthClasses = allClasses.filter(class_ => {
          const classDate = new Date(class_.date);
          return classDate >= firstDayOfMonth && classDate <= lastDayOfMonth;
        });

        // Calculate upcoming classes
        const upcomingClasses = allClasses.filter(class_ => {
          const classDate = new Date(class_.date);
          return classDate >= today;
        });

        // Calculate total enrolled students and attendance
        const totalEnrolled = allClasses.reduce((sum, class_) => sum + (class_.enrolled || 0), 0);
        const totalCapacity = allClasses.reduce((sum, class_) => sum + class_.capacity, 0);
        const avgAttendance = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;

        // Get unique students count
        let uniqueStudents = new Set<number>();
        for (const class_ of allClasses) {
          try {
            const attendeesResponse = await bookingService.getClassAttendees(class_.id);
            if (attendeesResponse.success && attendeesResponse.data) {
              attendeesResponse.data.forEach((attendee: any) => {
                uniqueStudents.add(attendee.user_id);
              });
            }
          } catch (error) {
            console.error(`Failed to load attendees for class ${class_.id}:`, error);
          }
        }

        setStats({
          totalClasses: allClasses.length,
          totalStudents: uniqueStudents.size,
          thisMonthClasses: thisMonthClasses.length,
          avgAttendance: Math.round(avgAttendance),
          upcomingClasses: upcomingClasses.length
        });
      }
    } catch (error) {
      console.error('Failed to load instructor stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logout()),
        },
      ]
    );
  };

  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <Avatar.Text 
          size={80} 
          label={user?.name?.charAt(0).toUpperCase() || 'I'}
          style={styles.avatar}
        />
        <Title style={styles.headerTitle}>{user?.name}</Title>
        <Paragraph style={styles.headerSubtitle}>Pilates Instructor</Paragraph>
                    <Chip icon="verified-user" style={styles.verifiedChip}>
          Certified Instructor
        </Chip>
      </Surface>

      {/* Quick Stats */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Your Performance</Title>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Title style={styles.statNumber}>{stats.totalClasses}</Title>
              <Paragraph style={styles.statLabel}>Total Classes</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Title style={styles.statNumber}>{stats.totalStudents}</Title>
              <Paragraph style={styles.statLabel}>Students Taught</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Title style={styles.statNumber}>{stats.thisMonthClasses}</Title>
              <Paragraph style={styles.statLabel}>This Month</Paragraph>
            </View>
            <View style={styles.statItem}>
              <Title style={styles.statNumber}>{stats.avgAttendance}%</Title>
              <Paragraph style={styles.statLabel}>Avg Attendance</Paragraph>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Profile Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Profile Information</Title>
          <List.Section>
            <List.Item
              title="Email"
              description={user?.email || 'Not provided'}
              left={() => <List.Icon icon="email" />}
            />
            <List.Item
              title="Phone"
              description={user?.phone || 'Not provided'}
              left={() => <List.Icon icon="phone" />}
            />
            <List.Item
              title="Role"
              description="Instructor"
              left={() => <List.Icon icon="account-tie" />}
            />
            <List.Item
              title="Member Since"
              description={formatJoinDate(user?.created_at)}
              left={() => <List.Icon icon="calendar-clock" />}
            />
          </List.Section>
        </Card.Content>
      </Card>

      {/* Teaching Schedule */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Teaching Schedule</Title>
          <View style={styles.scheduleInfo}>
            <View style={styles.scheduleItem}>
              <MaterialIcons name="event" size={24} color="#6200ee" />
              <View style={styles.scheduleText}>
                <Paragraph style={styles.scheduleTitle}>Upcoming Classes</Paragraph>
                <Paragraph style={styles.scheduleValue}>{stats.upcomingClasses} classes scheduled</Paragraph>
              </View>
            </View>
            <View style={styles.scheduleItem}>
              <MaterialIcons name="trending-up" size={24} color="#4caf50" />
              <View style={styles.scheduleText}>
                <Paragraph style={styles.scheduleTitle}>This Month</Paragraph>
                <Paragraph style={styles.scheduleValue}>{stats.thisMonthClasses} classes taught</Paragraph>
              </View>
            </View>
            <View style={styles.scheduleItem}>
              <MaterialIcons name="people" size={24} color="#ff9800" />
              <View style={styles.scheduleText}>
                <Paragraph style={styles.scheduleTitle}>Student Engagement</Paragraph>
                <Paragraph style={styles.scheduleValue}>{stats.avgAttendance}% average attendance</Paragraph>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Account Actions</Title>
          <View style={styles.actionButtons}>
            <Button 
              mode="outlined" 
              icon="account-edit" 
              style={styles.actionButton}
              onPress={() => Alert.alert('Feature Coming Soon', 'Profile editing will be available in a future update.')}
            >
              Edit Profile
            </Button>
            <Button 
              mode="outlined" 
              icon="cog" 
              style={styles.actionButton}
              onPress={() => Alert.alert('Feature Coming Soon', 'Settings will be available in a future update.')}
            >
              Settings
            </Button>
          </View>
          <Divider style={styles.divider} />
          <Button 
            mode="contained" 
            icon="logout" 
            onPress={handleLogout} 
            style={styles.logoutButton}
            buttonColor="#f44336"
          >
            Logout
          </Button>
        </Card.Content>
      </Card>

      {/* App Information */}
      <Card style={[styles.card, styles.lastCard]}>
        <Card.Content>
          <Title>About</Title>
          <Paragraph style={styles.aboutText}>
            Pilates Studio Management App - Instructor Portal
          </Paragraph>
          <Paragraph style={styles.versionText}>
            Version 1.0.0
          </Paragraph>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    paddingTop: 60,
    backgroundColor: '#6200ee',
  },
  avatar: {
    backgroundColor: '#ffffff',
    marginBottom: 15,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 15,
  },
  verifiedChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  card: {
    margin: 15,
    marginTop: 0,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  scheduleInfo: {
    marginTop: 15,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  scheduleText: {
    marginLeft: 15,
    flex: 1,
  },
  scheduleTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  scheduleValue: {
    color: '#666',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  divider: {
    marginVertical: 20,
  },
  logoutButton: {
    width: '100%',
  },
  aboutText: {
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  versionText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});

export default InstructorProfile; 