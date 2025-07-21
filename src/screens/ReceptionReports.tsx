import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Card, Divider, Modal, Portal } from 'react-native-paper';
import { apiService } from '../services/api';

interface TodayData {
  schedule: {
    totalClasses: number;
    completedClasses: number;
    upcomingClasses: any[];
    classAttendance: { [key: string]: number };
  };
  checkIns: {
    expectedClients: number;
    checkedIn: number;
    noShows: number;
    lateArrivals: number;
    clientsList: any[];
  };
  followUps: {
    paymentsOverdue: any[];
    renewalsDue: any[];
    newClientFollowUps: any[];
    medicalNotes: any[];
  };
  weekSummary: {
    totalAttendance: number;
    popularClasses: any[];
    instructorSummary: any[];
    weeklyTrends: any[];
  };
}

function ReceptionReports() {
  const [reportData, setReportData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('today');
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReceptionData();
  }, []);

  const loadReceptionData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfWeek = getStartOfWeek();
      const endOfWeek = getEndOfWeek();

      // Load reception-focused data in parallel
      const [
        todayClassesResponse,
        bookingsResponse,
        usersResponse,
        paymentsResponse,
        notesResponse,
      ] = await Promise.all([
        apiService.get(`/api/classes?date=${today}`),
        apiService.get('/api/bookings'),
        apiService.get('/api/users?role=client'),
        apiService.get('/api/payments'),
        apiService.get('/api/client-notes/reminders'),
      ]);

      // Process today's schedule
      const todayClasses = Array.isArray(todayClassesResponse.data) ? todayClassesResponse.data : [];
      const schedule = {
        totalClasses: todayClasses.length,
        completedClasses: todayClasses.filter((c: any) => 
          new Date(`${c.date}T${c.time}`) < new Date()
        ).length,
        upcomingClasses: todayClasses.filter((c: any) => 
          new Date(`${c.date}T${c.time}`) >= new Date()
        ),
        classAttendance: {},
      };

      // Process check-ins and attendance
      const allBookings = Array.isArray(bookingsResponse.data) ? bookingsResponse.data : [];
      const todayBookings = allBookings.filter((b: any) => b.class_date === today);
      
      const checkIns = {
        expectedClients: todayBookings.length,
        checkedIn: todayBookings.filter((b: any) => b.status === 'completed').length,
        noShows: todayBookings.filter((b: any) => b.status === 'no_show').length,
        lateArrivals: 0, // Could track this if we had check-in times
        clientsList: todayBookings.map((b: any) => ({
          id: b.id,
          clientName: b.user_name,
          className: b.class_name,
          classTime: b.class_time,
          status: b.status,
          notes: ''
        })),
      };

      // Process follow-ups and action items
      const allUsers = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      const allPayments = Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [];
      const allNotes = Array.isArray(notesResponse.data) ? notesResponse.data : [];

      const followUps = {
        paymentsOverdue: [], // Would need to calculate based on subscription dues
        renewalsDue: allUsers.filter((user: any) => {
          // Check if renewal is due in next 7 days
          return user.subscription_end_date && 
            new Date(user.subscription_end_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }),
        newClientFollowUps: allUsers.filter((user: any) => {
          const joinDate = new Date(user.created_at);
          const daysSinceJoin = (Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 1000);
          return daysSinceJoin <= 7; // New clients from last week
        }),
        medicalNotes: allNotes.filter((note: any) => note.note_type === 'medical' || note.priority === 'urgent'),
      };

      // Process weekly summary
      const weekBookings = allBookings.filter((b: any) => {
        const bookingDate = new Date(b.class_date);
        return bookingDate >= new Date(startOfWeek) && bookingDate <= new Date(endOfWeek);
      });

      const weekSummary = {
        totalAttendance: weekBookings.filter((b: any) => b.status === 'completed').length,
        popularClasses: getPopularClasses(weekBookings),
        instructorSummary: getInstructorSummary(todayClasses, weekBookings),
        weeklyTrends: [], // Could add if needed
      };

      setReportData({
        schedule,
        checkIns,
        followUps,
        weekSummary,
      });

    } catch (error) {
      console.error('Failed to load reception data:', error);
      Alert.alert('Error', 'Failed to load reception reports. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStartOfWeek = () => {
    const today = new Date();
    const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
    return firstDay.toISOString().split('T')[0];
  };

  const getEndOfWeek = () => {
    const today = new Date();
    const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
    return lastDay.toISOString().split('T')[0];
  };

  const getPopularClasses = (bookings: any[]) => {
    const classCount: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      if (booking.status === 'completed') {
        classCount[booking.class_name] = (classCount[booking.class_name] || 0) + 1;
      }
    });
    
    return Object.entries(classCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, attendance: count }));
  };

  const getInstructorSummary = (todayClasses: any[], weekBookings: any[]) => {
    const instructorStats: { [key: string]: { classes: number, attendance: number } } = {};
    
    todayClasses.forEach((cls) => {
      if (!instructorStats[cls.instructor_name]) {
        instructorStats[cls.instructor_name] = { classes: 0, attendance: 0 };
      }
      instructorStats[cls.instructor_name].classes += 1;
    });

    weekBookings.forEach((booking) => {
      if (booking.status === 'completed' && booking.instructor_name) {
        if (!instructorStats[booking.instructor_name]) {
          instructorStats[booking.instructor_name] = { classes: 0, attendance: 0 };
        }
        instructorStats[booking.instructor_name].attendance += 1;
      }
    });

    return Object.entries(instructorStats).map(([name, stats]) => ({
      name,
      ...stats
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReceptionData();
  };

  const handleExportDailyReport = () => {
    // Generate today's summary for printing or emailing
    const today = new Date().toLocaleDateString();
    const report = `Daily Reception Report - ${today}\n\n` +
      `Classes Today: ${reportData?.schedule.totalClasses || 0}\n` +
      `Expected Clients: ${reportData?.checkIns.expectedClients || 0}\n` +
      `Checked In: ${reportData?.checkIns.checkedIn || 0}\n` +
      `No Shows: ${reportData?.checkIns.noShows || 0}\n\n` +
      `Follow-ups Needed: ${(reportData?.followUps.renewalsDue.length || 0) + (reportData?.followUps.newClientFollowUps.length || 0)}\n`;
    
    Alert.alert('Daily Report', report, [
      { text: 'Copy', onPress: () => console.log('Copy to clipboard') },
      { text: 'Print', onPress: () => console.log('Print report') },
      { text: 'Close' }
    ]);
  };

  // Reception-focused sidebar
  const ReceptionSidebar = () => {
    const sidebarItems = [
      { key: 'today', icon: 'today', label: '📅 Today\'s Schedule', color: '#2196F3' },
      { key: 'checkins', icon: 'how-to-reg', label: '✅ Check-ins & Attendance', color: '#4CAF50' },
      { key: 'followups', icon: 'assignment', label: '📋 Follow-ups & Actions', color: '#FF9800' },
      { key: 'weekly', icon: 'view-week', label: '📊 Weekly Summary', color: '#9C27B0' },
    ];

    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <MaterialIcons name="assignment" size={28} color="#9B8A7D" />
          <View style={styles.sidebarTitleContainer}>
            <Text style={styles.sidebarTitle}>Reception Reports</Text>
            <Text style={styles.sidebarSubtitle}>Daily Operations</Text>
          </View>
        </View>
        
        <View style={styles.sidebarMenu}>
          {sidebarItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.sidebarItem,
                activeSection === item.key && styles.sidebarItemActive
              ]}
              onPress={() => setActiveSection(item.key)}
            >
              <MaterialIcons 
                name={item.icon as any} 
                size={24} 
                color={activeSection === item.key ? '#fff' : '#9B8A7D'} 
              />
              <Text style={[
                styles.sidebarItemText,
                activeSection === item.key && styles.sidebarItemTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sidebarFooter}>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={() => setExportModalVisible(true)}
          >
            <MaterialIcons name="print" size={20} color="#9B8A7D" />
            <Text style={styles.exportButtonText}>Export Daily Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <MaterialIcons 
              name={refreshing ? "hourglass-empty" : "refresh"} 
              size={20} 
              color="#9B8A7D" 
            />
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh Data'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderTodaySchedule = () => (
    <ScrollView style={styles.contentArea}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📅 Today's Schedule</Text>
        <Text style={styles.sectionSubtitle}>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.schedule.totalClasses || 0}</Text>
            <Text style={styles.statLabel}>Classes Today</Text>
            <MaterialIcons name="fitness-center" size={24} color="#2196F3" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.schedule.completedClasses || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>
              {(reportData?.schedule.totalClasses || 0) - (reportData?.schedule.completedClasses || 0)}
            </Text>
            <Text style={styles.statLabel}>Upcoming</Text>
            <MaterialIcons name="schedule" size={24} color="#FF9800" />
          </View>
        </Card>
      </View>

      {/* Upcoming Classes */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🕒 Upcoming Classes</Text>
        </View>
        <Divider />
        {reportData?.schedule.upcomingClasses.length ? (
          reportData.schedule.upcomingClasses.map((cls: any, index: number) => (
            <View key={index} style={styles.classItem}>
              <View style={styles.classTime}>
                <Text style={styles.timeText}>{cls.time}</Text>
                <Text style={styles.durationText}>{cls.duration}min</Text>
              </View>
              <View style={styles.classDetails}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.instructorName}>👨‍🏫 {cls.instructor_name}</Text>
                <Text style={styles.classInfo}>
                  👥 {cls.current_bookings || 0}/{cls.capacity} • 📍 {cls.room || 'Main Studio'}
                </Text>
              </View>
              <View style={styles.classActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <MaterialIcons name="list" size={16} color="#2196F3" />
                  <Text style={styles.actionText}>View List</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No more classes today</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );

  const renderCheckIns = () => (
    <ScrollView style={styles.contentArea}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>✅ Check-ins & Attendance</Text>
        <Text style={styles.sectionSubtitle}>Track today's client attendance</Text>
      </View>

      {/* Attendance Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.checkIns.expectedClients || 0}</Text>
            <Text style={styles.statLabel}>Expected</Text>
            <MaterialIcons name="people" size={24} color="#2196F3" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.checkIns.checkedIn || 0}</Text>
            <Text style={styles.statLabel}>Checked In</Text>
            <MaterialIcons name="check" size={24} color="#4CAF50" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.checkIns.noShows || 0}</Text>
            <Text style={styles.statLabel}>No Shows</Text>
            <MaterialIcons name="close" size={24} color="#f44336" />
          </View>
        </Card>
      </View>

      {/* Client List */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👥 Today's Client List</Text>
        </View>
        <Divider />
        {reportData?.checkIns.clientsList.length ? (
          reportData.checkIns.clientsList.map((client: any, index: number) => (
            <View key={index} style={styles.clientItem}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.clientName}</Text>
                <Text style={styles.classInfo}>
                  {client.className} • {client.classTime}
                </Text>
              </View>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusChip,
                  { backgroundColor: 
                    client.status === 'completed' ? '#E8F5E8' :
                    client.status === 'no_show' ? '#FFEBEE' : '#FFF3E0'
                  }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: 
                      client.status === 'completed' ? '#2E7D32' :
                      client.status === 'no_show' ? '#C62828' : '#E65100'
                    }
                  ]}>
                    {client.status === 'completed' ? 'Checked In' :
                     client.status === 'no_show' ? 'No Show' : 'Expected'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No clients expected today</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );

  const renderFollowUps = () => (
    <ScrollView style={styles.contentArea}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📋 Follow-ups & Action Items</Text>
        <Text style={styles.sectionSubtitle}>Tasks requiring attention</Text>
      </View>

      {/* Follow-up Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.followUps.renewalsDue.length || 0}</Text>
            <Text style={styles.statLabel}>Renewals Due</Text>
            <MaterialIcons name="autorenew" size={24} color="#FF9800" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.followUps.newClientFollowUps.length || 0}</Text>
            <Text style={styles.statLabel}>New Clients</Text>
            <MaterialIcons name="person-add" size={24} color="#4CAF50" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.followUps.medicalNotes.length || 0}</Text>
            <Text style={styles.statLabel}>Medical Notes</Text>
            <MaterialIcons name="local-hospital" size={24} color="#f44336" />
          </View>
        </Card>
      </View>

      {/* Renewals Due */}
      {(reportData?.followUps.renewalsDue.length || 0) > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🔄 Renewals Due (Next 7 Days)</Text>
          </View>
          <Divider />
          {reportData?.followUps.renewalsDue.map((client: any, index: number) => (
            <View key={index} style={styles.followUpItem}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.followUpText}>
                  Plan expires: {new Date(client.subscription_end_date).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="phone" size={16} color="#2196F3" />
                <Text style={styles.actionText}>Call</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}

      {/* New Client Follow-ups */}
      {(reportData?.followUps.newClientFollowUps.length || 0) > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👋 New Client Follow-ups</Text>
          </View>
          <Divider />
          {reportData?.followUps.newClientFollowUps.map((client: any, index: number) => (
            <View key={index} style={styles.followUpItem}>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.name}</Text>
                <Text style={styles.followUpText}>
                  Joined: {new Date(client.created_at).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="chat" size={16} color="#4CAF50" />
                <Text style={styles.actionText}>Check In</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );

  const renderWeeklySummary = () => (
    <ScrollView style={styles.contentArea}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📊 Weekly Summary</Text>
        <Text style={styles.sectionSubtitle}>This week's overview</Text>
      </View>

      {/* Weekly Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.weekSummary.totalAttendance || 0}</Text>
            <Text style={styles.statLabel}>Total Attendance</Text>
            <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.weekSummary.popularClasses.length || 0}</Text>
            <Text style={styles.statLabel}>Active Classes</Text>
            <MaterialIcons name="fitness-center" size={24} color="#2196F3" />
          </View>
        </Card>
        
        <Card style={styles.statCard}>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{reportData?.weekSummary.instructorSummary.length || 0}</Text>
            <Text style={styles.statLabel}>Active Instructors</Text>
            <MaterialIcons name="school" size={24} color="#9C27B0" />
          </View>
        </Card>
      </View>

      {/* Popular Classes */}
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔥 Popular Classes This Week</Text>
        </View>
        <Divider />
        {reportData?.weekSummary.popularClasses.length ? (
          reportData.weekSummary.popularClasses.map((cls: any, index: number) => (
            <View key={index} style={styles.popularClassItem}>
              <View style={styles.classRank}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.classDetails}>
                <Text style={styles.className}>{cls.name}</Text>
                <Text style={styles.attendanceText}>{cls.attendance} attendees</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="bar-chart" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No class data available</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );

  const renderMainContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9B8A7D" />
          <Text style={styles.loadingText}>Loading Reception Reports...</Text>
        </View>
      );
    }

    return (
      <View style={styles.mainContent}>
        {activeSection === 'today' && renderTodaySchedule()}
        {activeSection === 'checkins' && renderCheckIns()}
        {activeSection === 'followups' && renderFollowUps()}
        {activeSection === 'weekly' && renderWeeklySummary()}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ReceptionSidebar />
      {renderMainContent()}

      {/* Export Modal */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => setExportModalVisible(false)}
          contentContainerStyle={styles.exportModal}
        >
          <View style={styles.exportHeader}>
            <Text style={styles.exportTitle}>📄 Export Daily Report</Text>
            <TouchableOpacity
              onPress={() => setExportModalVisible(false)}
              style={styles.exportCloseButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.exportDescription}>
            Generate today's reception summary for handoff, printing, or email.
          </Text>
          
          <View style={styles.exportOptions}>
            <Button 
              mode="contained" 
              style={styles.exportButton} 
              onPress={handleExportDailyReport}
            >
              📋 Generate Daily Summary
            </Button>
            
            <Button 
              mode="outlined" 
              style={styles.exportButton}
              onPress={() => console.log('Print class schedules')}
            >
              🖨️ Print Class Schedules
            </Button>
            
            <Button 
              mode="outlined" 
              style={styles.exportButton}
              onPress={() => console.log('Email follow-up list')}
            >
              📧 Email Follow-up List
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
  },
  
  // Sidebar Styles
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sidebarTitleContainer: {
    marginLeft: 12,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sidebarSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  sidebarMenu: {
    flex: 1,
    paddingTop: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
  },
  sidebarItemActive: {
    backgroundColor: '#9B8A7D',
  },
  sidebarItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  sidebarItemTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  exportButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },

  // Main Content Styles
  mainContent: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentArea: {
    flex: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },

  // Section Headers
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statContent: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },

  // Class Items
  classItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  classTime: {
    width: 80,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  durationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  classDetails: {
    flex: 1,
    marginLeft: 16,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  instructorName: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  classInfo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  classActions: {
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },

  // Client Items
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Follow-up Items
  followUpItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  followUpText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Popular Classes
  popularClassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  classRank: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  attendanceText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Export Modal
  exportModal: {
    backgroundColor: '#ffffff',
    margin: 40,
    borderRadius: 12,
    padding: 24,
    maxHeight: '80%',
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  exportCloseButton: {
    padding: 8,
  },
  exportDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  exportOptions: {
    gap: 12,
  },
});

export default ReceptionReports; 