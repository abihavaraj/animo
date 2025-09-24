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
import { Card, Divider, TextInput } from 'react-native-paper';
import WebCompatibleIcon from '../components/WebCompatibleIcon';

interface ReceptionData {
  todaySchedule: {
    totalClasses: number;
    completedClasses: number;
    upcomingClasses: any[];
    instructorStats: { [key: string]: { classes: number; attendance: number } };
  };
  checkIns: {
    expectedClients: number;
    checkedIn: number;
    noShows: number;
    lateArrivals: number;
    clientsList: any[];
    attendanceRate: number;
  };
  waitlist: {
    totalWaiting: number;
    classWaitlists: any[];
  };
  urgentActions: {
    failedPayments: any[];
    expiringSubscriptions: any[];
    overdueFollowUps: any[];
    equipmentIssues: any[];
  };
  weeklyStats: {
    totalRevenue: number;
    newClients: number;
    totalAttendance: number;
    popularClasses: any[];
    cancellationRate: number;
  };
}

function ReceptionReports() {
  const [data, setData] = useState<ReceptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 minutes for real-time updates
    const interval = setInterval(loadData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const startOfWeek = getStartOfWeek();
      const endOfWeek = getEndOfWeek();

      // Use Supabase directly for reception reports with proper joins
      const { supabase } = require('../config/supabase.config');

      // Load ALL data for reception (not user-specific)
      const [classesResponse, bookingsResponse, usersResponse, paymentsResponse, waitlistResponse] = await Promise.allSettled([
        // Get classes with instructor info
        supabase
          .from('classes')
          .select(`
            *,
            users!classes_instructor_id_fkey (name),
            bookings (id, status, user_id)
          `)
          .eq('date', today),
        
        // Get ALL bookings with user and class info  
        supabase
          .from('bookings')
          .select(`
            *,
            users!bookings_user_id_fkey (id, name, email, phone),
            classes!bookings_class_id_fkey (name, date, time, instructor_id)
          `),
        
        // Get users with subscription info
        supabase
          .from('users')
          .select(`
            *,
            user_subscriptions (
              status, 
              end_date, 
              remaining_classes,
              subscription_plans (name)
            )
          `)
          .eq('role', 'client'),
        
        // Get payments with user info
        supabase
          .from('payments')
          .select(`
            *,
            users!payments_user_id_fkey (name, email)
          `),
        
        // Get waitlist with user and class info
        supabase
          .from('waitlist')
          .select(`
            *,
            users!waitlist_user_id_fkey (name, email),
            classes!waitlist_class_id_fkey (name, date, time)
          `)
      ]);

      // Process today's schedule with instructor stats and actual enrollment
      let todayClasses: any[] = [];
      let instructorStats: { [key: string]: { classes: number; attendance: number } } = {};
      
      if (classesResponse.status === 'fulfilled' && !classesResponse.value.error) {
        todayClasses = classesResponse.value.data || [];
        
        // Calculate instructor stats with actual bookings
        todayClasses.forEach((cls: any) => {
          const instructorName = cls.users?.name || 'Unknown Instructor';
          const confirmedBookings = cls.bookings?.filter((b: any) => b.status === 'confirmed').length || 0;
          
          if (!instructorStats[instructorName]) {
            instructorStats[instructorName] = { classes: 0, attendance: 0 };
          }
          instructorStats[instructorName].classes += 1;
          instructorStats[instructorName].attendance += confirmedBookings;
        });
      }

      // Process comprehensive check-ins data with real user names
      let todayBookings: any[] = [];
      let weekBookings: any[] = [];
      
      if (bookingsResponse.status === 'fulfilled' && !bookingsResponse.value.error) {
        const allBookings = bookingsResponse.value.data || [];
        
        todayBookings = allBookings.filter((b: any) => {
          const bookingDate = b.classes?.date || b.booking_date;
          return bookingDate === today;
        });
        
        weekBookings = allBookings.filter((b: any) => {
          const bookingDate = new Date(b.classes?.date || b.booking_date);
          return bookingDate >= new Date(startOfWeek) && bookingDate <= new Date(endOfWeek);
        });
      }

      // Calculate attendance metrics
      const checkedIn = todayBookings.filter((b: any) => b.status === 'completed').length;
      const noShows = todayBookings.filter((b: any) => b.status === 'no_show').length;
      const lateArrivals = todayBookings.filter((b: any) => b.status === 'late').length;
      const attendanceRate = todayBookings.length > 0 ? (checkedIn / todayBookings.length) * 100 : 0;

      // Process waitlist data
      let waitlistData: any[] = [];
      let totalWaiting = 0;
      
      if (waitlistResponse.status === 'fulfilled' && !waitlistResponse.value.error) {
        waitlistData = waitlistResponse.value.data || [];
        totalWaiting = waitlistData.length;
      }

      // Group waitlist by class
      const classWaitlists = waitlistData.reduce((acc: any, item: any) => {
        const classId = item.class_id;
        if (!acc[classId]) {
          acc[classId] = {
            classId,
            className: item.classes?.name || 'Unknown Class',
            classDate: item.classes?.date,
            classTime: item.classes?.time,
            waitingClients: []
          };
        }
        acc[classId].waitingClients.push({
          id: item.id,
          clientName: item.users?.name || 'Unknown Client',
          clientEmail: item.users?.email,
          position: item.position,
          addedAt: item.created_at
        });
        return acc;
      }, {});

      // Process urgent actions with real user data
      let failedPayments: any[] = [];
      let expiringSubscriptions: any[] = [];
      let overdueFollowUps: any[] = [];
      
      if (paymentsResponse.status === 'fulfilled' && !paymentsResponse.value.error) {
        const allPayments = paymentsResponse.value.data || [];
        failedPayments = allPayments
          .filter((p: any) => p.status === 'failed')
          .map((p: any) => ({
            ...p,
            user_name: p.users?.name,
            user_email: p.users?.email
          }));
      }

      if (usersResponse.status === 'fulfilled' && !usersResponse.value.error) {
        const allUsers = usersResponse.value.data || [];
        
        // Expiring subscriptions (next 7 days)
        expiringSubscriptions = allUsers.filter((user: any) => {
          if (!user.user_subscriptions?.length) return false;
          const activeSubscription = user.user_subscriptions.find((sub: any) => sub.status === 'active');
          if (!activeSubscription?.end_date) return false;
          
          const endDate = new Date(activeSubscription.end_date);
          const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          return endDate <= sevenDaysFromNow && endDate >= new Date();
        }).map((user: any) => ({
          ...user,
          subscription_end_date: user.user_subscriptions.find((sub: any) => sub.status === 'active')?.end_date
        }));

        // New clients needing follow-up (joined in last 3 days)
        overdueFollowUps = allUsers.filter((user: any) => {
          const joinDate = new Date(user.created_at);
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          return joinDate >= threeDaysAgo;
        });
      }

      // Calculate weekly stats
      const weeklyRevenue = weekBookings
        .filter((b: any) => b.status === 'completed')
        .reduce((sum: number, b: any) => sum + (parseFloat(b.amount) || 0), 0);
      
      const weeklyAttendance = weekBookings.filter((b: any) => b.status === 'completed').length;
      const cancellations = weekBookings.filter((b: any) => b.status === 'cancelled').length;
      const cancellationRate = weekBookings.length > 0 ? (cancellations / weekBookings.length) * 100 : 0;

      // Popular classes this week
      const classAttendance: { [key: string]: number } = {};
      weekBookings
        .filter((b: any) => b.status === 'completed')
        .forEach((b: any) => {
          const className = b.classes?.name || 'Unknown Class';
          classAttendance[className] = (classAttendance[className] || 0) + 1;
        });

      const popularClasses = Object.entries(classAttendance)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, attendance: count }));

      setData({
        todaySchedule: {
          totalClasses: todayClasses.length,
          completedClasses: todayClasses.filter((c: any) => 
            new Date(`${c.date}T${c.time}`) < new Date()
          ).length,
          upcomingClasses: todayClasses.filter((c: any) => 
            new Date(`${c.date}T${c.time}`) >= new Date()
          ).map((cls: any) => ({
            ...cls,
            instructor_name: cls.users?.name || 'Unknown Instructor',
            current_bookings: cls.bookings?.filter((b: any) => b.status === 'confirmed').length || 0
          })),
          instructorStats,
        },
        checkIns: {
          expectedClients: todayBookings.length,
          checkedIn,
          noShows,
          lateArrivals,
          attendanceRate,
          clientsList: todayBookings.map((b: any) => ({
            id: b.id,
            user_id: b.user_id,
            clientName: b.users?.name || 'Unknown Client',
            clientEmail: b.users?.email,
            clientPhone: b.users?.phone,
            className: b.classes?.name || 'Unknown Class',
            classTime: b.classes?.time || 'N/A',
            status: b.status,
            bookingDate: b.created_at,
          })),
        },
        waitlist: {
          totalWaiting,
          classWaitlists: Object.values(classWaitlists),
        },
        urgentActions: {
          failedPayments,
          expiringSubscriptions,
          overdueFollowUps,
          equipmentIssues: [], // Placeholder for future equipment tracking
        },
        weeklyStats: {
          totalRevenue: weeklyRevenue,
          newClients: overdueFollowUps.length,
          totalAttendance: weeklyAttendance,
          popularClasses,
          cancellationRate,
        },
      });

    } catch (error) {
      console.error('Failed to load reception data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleCheckIn = async (bookingId: string, clientName: string) => {
    try {
      const { supabase } = require('../config/supabase.config');
      
      // Update booking status to completed (checked in)
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) {
        Alert.alert('Error', `Failed to check in ${clientName}: ${error.message}`);
        return;
      }

      Alert.alert('✅ Success', `${clientName} checked in successfully!`);
      await loadData(); // Refresh data
    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in client');
    }
  };

  const handleCallClient = (clientName: string, clientPhone?: string, clientEmail?: string) => {
    const options: any[] = [
      { text: 'Cancel', style: 'cancel' }
    ];

    if (clientPhone) {
      options.unshift({
        text: `📞 Call ${clientPhone}`,
        onPress: () => {
          // You can implement actual calling functionality here
          Alert.alert('Calling', `Calling ${clientName} at ${clientPhone}`);
        }
      });
    }

    if (clientEmail) {
      options.unshift({
        text: `✉️ Email ${clientEmail}`,
        onPress: () => {
          // You can implement actual email functionality here
          Alert.alert('Email', `Sending email to ${clientName} at ${clientEmail}`);
        }
      });
    }

    options.unshift({
      text: `💬 Send SMS`,
      onPress: () => {
        Alert.alert('SMS', `Sending SMS to ${clientName}${clientPhone ? ` at ${clientPhone}` : ''}`);
      }
    });

    Alert.alert(
      'Contact Client',
      `How would you like to contact ${clientName}?`,
      options
    );
  };

  const handleRenewSubscription = async (userId: string, userName: string) => {
    try {
      Alert.alert(
        'Renew Subscription',
        `Renewing subscription for ${userName}`,
        [
          {
            text: 'Open Subscription Plans',
            onPress: () => {
              // Navigate to subscription management or show subscription options
              Alert.alert('Subscription Plans', 'This would open the subscription management screen for the client.');
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process subscription renewal');
    }
  };

  const handleFollowUp = async (userId: string, userName: string) => {
    try {
      Alert.alert(
        'Follow Up with Client',
        `Follow up with ${userName}`,
        [
          {
            text: 'Mark as Contacted',
            onPress: async () => {
              // You could add a follow-up log to the database here
              Alert.alert('✅ Success', `Follow-up marked as completed for ${userName}`);
              await loadData();
            }
          },
          {
            text: 'Schedule Call',
            onPress: () => {
              Alert.alert('Schedule Call', `Call scheduled for ${userName}`);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process follow-up');
    }
  };

  const handleRetryPayment = async (paymentId: string, userName: string, amount: number) => {
    try {
      Alert.alert(
        'Retry Payment',
        `Retry failed payment of $${amount.toFixed(2)} for ${userName}?`,
        [
          {
            text: 'Retry Payment',
            onPress: () => {
              // Implement payment retry logic here
              Alert.alert('Payment Retry', `Payment retry initiated for ${userName}`);
            }
          },
          {
            text: 'Contact Client',
            onPress: () => {
              Alert.alert('Contact Client', `Contacting ${userName} about failed payment`);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process payment retry');
    }
  };

  const handlePromoteFromWaitlist = async (waitlistId: string, clientName: string, className: string) => {
    try {
      Alert.alert(
        'Promote from Waitlist',
        `Promote ${clientName} from the waitlist to book ${className}?`,
        [
          {
            text: 'Promote Now',
            onPress: async () => {
              try {
                const { supabase } = require('../config/supabase.config');
                
                // Get waitlist entry details
                const { data: waitlistEntry, error: waitlistError } = await supabase
                  .from('waitlist')
                  .select('*, classes(*)')
                  .eq('id', waitlistId)
                  .single();
                
                if (waitlistError || !waitlistEntry) {
                  Alert.alert('Error', 'Could not find waitlist entry');
                  return;
                }
                
                // Create booking for the client
                const { error: bookingError } = await supabase
                  .from('bookings')
                  .insert({
                    user_id: waitlistEntry.user_id,
                    class_id: waitlistEntry.class_id,
                    status: 'confirmed',
                    booking_date: new Date().toISOString()
                  });
                
                if (bookingError) {
                  Alert.alert('Error', `Failed to create booking: ${bookingError.message}`);
                  return;
                }
                
                // Remove from waitlist
                const { error: removeError } = await supabase
                  .from('waitlist')
                  .delete()
                  .eq('id', waitlistId);
                
                if (removeError) {
                  console.warn('Failed to remove from waitlist:', removeError);
                }
                
                Alert.alert('✅ Success', `${clientName} promoted from waitlist and booked into ${className}!`);
                await loadData(); // Refresh data
              } catch (error) {
                Alert.alert('Error', 'Failed to promote from waitlist');
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process waitlist promotion');
    }
  };

  const handlePrintReport = () => {
    if (!data) return;
    
    const report = generateDailyReport(data);
    Alert.alert('Print Report', report, [
      { text: 'Print', onPress: () => console.log('Printing report') },
      { text: 'Email', onPress: () => console.log('Emailing report') },
      { text: 'Cancel' }
    ]);
  };

  const generateDailyReport = (reportData: ReceptionData) => {
    const today = new Date().toLocaleDateString();
    return `DAILY RECEPTION REPORT - ${today}

📅 SCHEDULE OVERVIEW:
• Total Classes: ${reportData.todaySchedule.totalClasses}
• Completed: ${reportData.todaySchedule.completedClasses}
• Upcoming: ${reportData.todaySchedule.totalClasses - reportData.todaySchedule.completedClasses}

✅ ATTENDANCE:
• Expected: ${reportData.checkIns.expectedClients}
• Checked In: ${reportData.checkIns.checkedIn}
• No Shows: ${reportData.checkIns.noShows}
• Rate: ${reportData.checkIns.attendanceRate.toFixed(1)}%

🚨 URGENT ACTIONS:
• Failed Payments: ${reportData.urgentActions.failedPayments.length}
• Expiring Subscriptions: ${reportData.urgentActions.expiringSubscriptions.length}
• Follow-ups Needed: ${reportData.urgentActions.overdueFollowUps.length}

📊 WEEKLY SUMMARY:
• Revenue: $${reportData.weeklyStats.totalRevenue.toFixed(2)}
• New Clients: ${reportData.weeklyStats.newClients}
• Total Attendance: ${reportData.weeklyStats.totalAttendance}
• Cancellation Rate: ${reportData.weeklyStats.cancellationRate.toFixed(1)}%`;
  };

  const filteredClients = data?.checkIns.clientsList.filter((client: any) =>
    client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.className.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B8A7D" />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Actions */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Reception Reports</Text>
          <Text style={styles.headerSubtitle}>
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <WebCompatibleIcon name="refresh" size={20} color="#9B8A7D" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.printButton} onPress={handlePrintReport}>
            <WebCompatibleIcon name="print" size={20} color="#ffffff" />
            <Text style={styles.printButtonText}>Print Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats Dashboard */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{data?.todaySchedule.totalClasses || 0}</Text>
          <Text style={styles.statLabel}>Classes Today</Text>
          <WebCompatibleIcon name="fitness-center" size={24} color="#2196F3" />
        </Card>
        
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{data?.checkIns.checkedIn || 0}</Text>
          <Text style={styles.statLabel}>Checked In</Text>
          <WebCompatibleIcon name="check-circle" size={24} color="#4CAF50" />
        </Card>
        
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>{data?.checkIns.attendanceRate.toFixed(0) || 0}%</Text>
          <Text style={styles.statLabel}>Attendance Rate</Text>
          <WebCompatibleIcon name="trending-up" size={24} color="#FF9800" />
        </Card>
        
        <Card style={[styles.statCard, styles.urgentCard]}>
          <Text style={styles.statNumber}>
            {(data?.urgentActions.failedPayments.length || 0) + 
             (data?.urgentActions.expiringSubscriptions.length || 0)}
          </Text>
          <Text style={styles.statLabel}>Urgent Actions</Text>
          <WebCompatibleIcon name="priority-high" size={24} color="#f44336" />
        </Card>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
            📅 Today
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'checkins' && styles.activeTab]}
          onPress={() => setActiveTab('checkins')}
        >
          <Text style={[styles.tabText, activeTab === 'checkins' && styles.activeTabText]}>
            ✅ Check-ins
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'urgent' && styles.activeTab]}
          onPress={() => setActiveTab('urgent')}
        >
          <Text style={[styles.tabText, activeTab === 'urgent' && styles.activeTabText]}>
            🚨 Urgent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'waitlist' && styles.activeTab]}
          onPress={() => setActiveTab('waitlist')}
        >
          <Text style={[styles.tabText, activeTab === 'waitlist' && styles.activeTabText]}>
            ⏳ Waitlist
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>
            📊 Weekly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'today' && (
          <View>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            
            {/* Instructor Performance */}
            {Object.keys(data?.todaySchedule.instructorStats || {}).length > 0 && (
              <Card style={styles.sectionCard}>
                <Text style={styles.cardTitle}>👨‍🏫 Instructor Overview</Text>
                <Divider />
                {Object.entries(data?.todaySchedule.instructorStats || {}).map(([instructor, stats], index) => (
                  <View key={index} style={styles.instructorItem}>
                    <View style={styles.instructorInfo}>
                      <Text style={styles.instructorName}>{instructor}</Text>
                      <Text style={styles.instructorStats}>
                        {stats.classes} classes • {stats.attendance} students
                      </Text>
                    </View>
                    <View style={styles.instructorRating}>
                      <Text style={styles.ratingNumber}>
                        {stats.classes > 0 ? Math.round(stats.attendance / stats.classes) : 0}
                      </Text>
                      <Text style={styles.ratingLabel}>avg/class</Text>
                    </View>
                  </View>
                ))}
              </Card>
            )}

            {/* Upcoming Classes */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardTitle}>🕒 Upcoming Classes</Text>
              <Divider />
              {data?.todaySchedule.upcomingClasses.length ? (
                data.todaySchedule.upcomingClasses.map((cls: any, index: number) => (
                  <View key={index} style={styles.classItem}>
                    <View style={styles.classTime}>
                      <Text style={styles.timeText}>{cls.time}</Text>
                      <Text style={styles.durationText}>{cls.duration || 60}min</Text>
                    </View>
                    <View style={styles.classDetails}>
                      <Text style={styles.className}>{cls.name}</Text>
                      <Text style={styles.instructorNameInClass}>👨‍🏫 {cls.instructor_name}</Text>
                      <Text style={styles.classInfo}>
                        👥 {cls.current_bookings || 0}/{cls.capacity} • 📍 {cls.room || 'Studio'}
                      </Text>
                    </View>
                    <View style={styles.classStatus}>
                      <View style={[
                        styles.capacityIndicator,
                        { backgroundColor: (cls.current_bookings / cls.capacity) > 0.8 ? '#f44336' : 
                          (cls.current_bookings / cls.capacity) > 0.6 ? '#FF9800' : '#4CAF50' }
                      ]}>
                        <Text style={styles.capacityText}>
                          {Math.round((cls.current_bookings / cls.capacity) * 100)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No more classes today</Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {activeTab === 'checkins' && (
          <View>
            <Text style={styles.sectionTitle}>Client Check-ins</Text>
            
            {/* Search Bar */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients or classes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              left={<TextInput.Icon icon="magnify" />}
              mode="outlined"
            />

            {/* Attendance Summary */}
            <Card style={styles.attendanceCard}>
              <Text style={styles.cardTitle}>📊 Attendance Summary</Text>
              <View style={styles.attendanceGrid}>
                <View style={styles.attendanceItem}>
                  <Text style={styles.attendanceNumber}>{data?.checkIns.expectedClients || 0}</Text>
                  <Text style={styles.attendanceLabel}>Expected</Text>
                </View>
                <View style={styles.attendanceItem}>
                  <Text style={styles.attendanceNumber}>{data?.checkIns.checkedIn || 0}</Text>
                  <Text style={styles.attendanceLabel}>Present</Text>
                </View>
                <View style={styles.attendanceItem}>
                  <Text style={styles.attendanceNumber}>{data?.checkIns.noShows || 0}</Text>
                  <Text style={styles.attendanceLabel}>No Shows</Text>
                </View>
                <View style={styles.attendanceItem}>
                  <Text style={styles.attendanceNumber}>{data?.checkIns.lateArrivals || 0}</Text>
                  <Text style={styles.attendanceLabel}>Late</Text>
                </View>
              </View>
            </Card>

            {/* Client List */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardTitle}>👥 Client List ({filteredClients.length})</Text>
              <Divider />
              {filteredClients.length ? (
                filteredClients.map((client: any, index: number) => (
                  <View key={index} style={styles.clientItem}>
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.clientName}</Text>
                      <Text style={styles.clientClass}>
                        {client.className} • {client.classTime}
                      </Text>
                      <Text style={styles.clientBookingDate}>
                        Booked: {new Date(client.bookingDate).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <View style={styles.clientActions}>
                      <View style={[
                        styles.statusChip,
                        { backgroundColor: 
                          client.status === 'completed' ? '#E8F5E8' :
                          client.status === 'no_show' ? '#FFEBEE' : 
                          client.status === 'late' ? '#FFF3E0' : '#F3F4F6'
                        }
                      ]}>
                        <Text style={[
                          styles.statusText,
                          { color: 
                            client.status === 'completed' ? '#2E7D32' :
                            client.status === 'no_show' ? '#C62828' : 
                            client.status === 'late' ? '#E65100' : '#6B7280'
                          }
                        ]}>
                          {client.status === 'completed' ? '✅ Present' :
                           client.status === 'no_show' ? '❌ No Show' : 
                           client.status === 'late' ? '⏰ Late' : '⏳ Expected'}
                        </Text>
                      </View>
                      
                      <View style={styles.actionButtons}>
                        {client.status !== 'completed' && (
                          <TouchableOpacity 
                            style={styles.checkInButton}
                            onPress={() => handleCheckIn(client.id, client.clientName)}
                          >
                            <WebCompatibleIcon name="check" size={16} color="#ffffff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={styles.callButton}
                          onPress={() => handleCallClient(client.clientName, client.clientPhone, client.clientEmail)}
                        >
                          <WebCompatibleIcon name="phone" size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No clients found' : 'No clients expected today'}
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}

        {activeTab === 'urgent' && (
          <View>
            <Text style={styles.sectionTitle}>Urgent Actions</Text>
            
            {/* Failed Payments */}
            {data?.urgentActions.failedPayments.length > 0 && (
              <Card style={styles.urgentActionCard}>
                <Text style={styles.urgentTitle}>💳 Failed Payments ({data.urgentActions.failedPayments.length})</Text>
                <Divider />
                {data.urgentActions.failedPayments.map((payment: any, index: number) => (
                  <View key={index} style={styles.urgentItem}>
                    <View style={styles.urgentInfo}>
                      <Text style={styles.urgentText}>Payment failed: ${payment.amount}</Text>
                      <Text style={styles.urgentSubtext}>
                        Client: {payment.user_name || 'Unknown'} • {new Date(payment.payment_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.urgentButton}
                      onPress={() => handleRetryPayment(payment.id, payment.user_name || 'Client', payment.amount || 0)}
                    >
                      <Text style={styles.urgentButtonText}>Retry Payment</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}

            {/* Expiring Subscriptions */}
            {data?.urgentActions.expiringSubscriptions.length > 0 && (
              <Card style={styles.urgentActionCard}>
                <Text style={styles.urgentTitle}>🔄 Expiring Subscriptions ({data.urgentActions.expiringSubscriptions.length})</Text>
                <Divider />
                {data.urgentActions.expiringSubscriptions.map((user: any, index: number) => (
                  <View key={index} style={styles.urgentItem}>
                    <View style={styles.urgentInfo}>
                      <Text style={styles.urgentText}>
                        {user.name || user.email}
                      </Text>
                      <Text style={styles.urgentSubtext}>
                        Expires: {new Date(user.subscription_end_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.urgentButton}
                      onPress={() => handleRenewSubscription(user.id, user.name || user.email)}
                    >
                      <Text style={styles.urgentButtonText}>Renew</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}

            {/* Follow-ups Needed */}
            {data?.urgentActions.overdueFollowUps.length > 0 && (
              <Card style={styles.urgentActionCard}>
                <Text style={styles.urgentTitle}>👋 New Client Follow-ups ({data.urgentActions.overdueFollowUps.length})</Text>
                <Divider />
                {data.urgentActions.overdueFollowUps.map((user: any, index: number) => (
                  <View key={index} style={styles.urgentItem}>
                    <View style={styles.urgentInfo}>
                      <Text style={styles.urgentText}>
                        {user.name || user.email}
                      </Text>
                      <Text style={styles.urgentSubtext}>
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.urgentButton}
                      onPress={() => handleFollowUp(user.id, user.name || user.email)}
                    >
                      <Text style={styles.urgentButtonText}>Follow Up</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}

            {/* No urgent actions */}
            {(!data?.urgentActions.failedPayments.length && 
              !data?.urgentActions.expiringSubscriptions.length && 
              !data?.urgentActions.overdueFollowUps.length) && (
              <Card style={styles.sectionCard}>
                <View style={styles.emptyState}>
                  <WebCompatibleIcon name="check-circle" size={48} color="#4CAF50" />
                  <Text style={styles.emptyText}>No urgent actions needed</Text>
                  <Text style={styles.emptySubtext}>All clients are up to date!</Text>
                </View>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'waitlist' && (
          <View>
            <Text style={styles.sectionTitle}>Class Waitlists</Text>
            
            {/* Waitlist Summary */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardTitle}>⏳ Waitlist Summary</Text>
              <View style={styles.waitlistSummary}>
                <View style={styles.waitlistStat}>
                  <Text style={styles.waitlistNumber}>{data?.waitlist.totalWaiting || 0}</Text>
                  <Text style={styles.waitlistLabel}>Total Waiting</Text>
                </View>
                <View style={styles.waitlistStat}>
                  <Text style={styles.waitlistNumber}>{data?.waitlist.classWaitlists.length || 0}</Text>
                  <Text style={styles.waitlistLabel}>Classes with Waitlists</Text>
                </View>
              </View>
            </Card>

            {/* Individual Class Waitlists */}
            {data?.waitlist.classWaitlists.length ? (
              data.waitlist.classWaitlists.map((waitlist: any, index: number) => (
                <Card key={index} style={styles.waitlistCard}>
                  <Text style={styles.waitlistCardTitle}>
                    📅 {waitlist.className}
                  </Text>
                  <Text style={styles.waitlistCardSubtitle}>
                    {new Date(waitlist.classDate).toLocaleDateString()} • {waitlist.classTime}
                  </Text>
                  <Divider />
                  
                  <Text style={styles.waitlistClientsHeader}>
                    👥 Waiting Clients ({waitlist.waitingClients.length})
                  </Text>
                  
                  {waitlist.waitingClients.map((client: any, clientIndex: number) => (
                    <View key={clientIndex} style={styles.waitlistClientItem}>
                      <View style={styles.waitlistPosition}>
                        <Text style={styles.positionNumber}>#{client.position}</Text>
                      </View>
                      
                      <View style={styles.waitlistClientInfo}>
                        <Text style={styles.waitlistClientName}>{client.clientName}</Text>
                        <Text style={styles.waitlistClientEmail}>{client.clientEmail}</Text>
                        <Text style={styles.waitlistClientDate}>
                          Added: {new Date(client.addedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.waitlistClientActions}>
                        <TouchableOpacity 
                          style={styles.promoteButton}
                          onPress={() => handlePromoteFromWaitlist(client.id, client.clientName, waitlist.className)}
                        >
                          <WebCompatibleIcon name="arrow-upward" size={16} color="#ffffff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.callButton}
                          onPress={() => handleCallClient(client.clientName, '', client.clientEmail)}
                        >
                          <WebCompatibleIcon name="phone" size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </Card>
              ))
            ) : (
              <Card style={styles.sectionCard}>
                <View style={styles.emptyState}>
                  <WebCompatibleIcon name="event-available" size={48} color="#4CAF50" />
                  <Text style={styles.emptyText}>No one is on waitlists</Text>
                  <Text style={styles.emptySubtext}>All classes have available spots!</Text>
                </View>
              </Card>
            )}
          </View>
        )}

        {activeTab === 'weekly' && (
          <View>
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            
            {/* Weekly Stats */}
            <View style={styles.weeklyStatsGrid}>
              <Card style={styles.weeklyStatCard}>
                <Text style={styles.weeklyStatNumber}>${data?.weeklyStats.totalRevenue.toFixed(0) || 0}</Text>
                <Text style={styles.weeklyStatLabel}>Revenue</Text>
                <WebCompatibleIcon name="attach-money" size={20} color="#4CAF50" />
              </Card>
              
              <Card style={styles.weeklyStatCard}>
                <Text style={styles.weeklyStatNumber}>{data?.weeklyStats.totalAttendance || 0}</Text>
                <Text style={styles.weeklyStatLabel}>Attendance</Text>
                <WebCompatibleIcon name="people" size={20} color="#2196F3" />
              </Card>
              
              <Card style={styles.weeklyStatCard}>
                <Text style={styles.weeklyStatNumber}>{data?.weeklyStats.newClients || 0}</Text>
                <Text style={styles.weeklyStatLabel}>New Clients</Text>
                <WebCompatibleIcon name="person-add" size={20} color="#9C27B0" />
              </Card>
              
              <Card style={styles.weeklyStatCard}>
                <Text style={styles.weeklyStatNumber}>{data?.weeklyStats.cancellationRate.toFixed(1) || 0}%</Text>
                <Text style={styles.weeklyStatLabel}>Cancellations</Text>
                <WebCompatibleIcon name="event-busy" size={20} color="#f44336" />
              </Card>
            </View>

            {/* Popular Classes */}
            <Card style={styles.sectionCard}>
              <Text style={styles.cardTitle}>🔥 Popular Classes This Week</Text>
              <Divider />
              {data?.weeklyStats.popularClasses.length ? (
                data.weeklyStats.popularClasses.map((cls: any, index: number) => (
                  <View key={index} style={styles.popularClassItem}>
                    <View style={styles.classRank}>
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    </View>
                    <View style={styles.popularClassInfo}>
                      <Text style={styles.popularClassName}>{cls.name}</Text>
                      <Text style={styles.popularClassAttendance}>{cls.attendance} attendees</Text>
                    </View>
                    <View style={styles.popularityBar}>
                      <View 
                        style={[
                          styles.popularityFill, 
                          { width: `${Math.min((cls.attendance / (data?.weeklyStats.popularClasses[0]?.attendance || 1)) * 100, 100)}%` }
                        ]} 
                      />
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No class data available</Text>
                </View>
              )}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#9B8A7D',
    borderRadius: 8,
    gap: 8,
  },
  printButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeTab: {
    backgroundColor: '#9B8A7D',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 16,
    paddingBottom: 12,
  },

  // Instructor Items
  instructorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  instructorStats: {
    fontSize: 14,
    color: '#6B7280',
  },
  instructorRating: {
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Class Items
  classItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  classTime: {
    width: 80,
    alignItems: 'center',
    marginRight: 16,
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
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  instructorNameInClass: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  classInfo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  classStatus: {
    alignItems: 'center',
  },
  capacityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  capacityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Search Input
  searchInput: {
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },

  // Attendance Card
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  attendanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  attendanceItem: {
    alignItems: 'center',
  },
  attendanceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  attendanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
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
  clientClass: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientBookingDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  clientActions: {
    alignItems: 'flex-end',
    gap: 8,
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
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  checkInButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 6,
  },
  callButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 6,
  },

  // Urgent Actions
  urgentActionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  urgentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 16,
    paddingBottom: 12,
  },
  urgentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  urgentInfo: {
    flex: 1,
  },
  urgentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  urgentSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  urgentButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  urgentButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Weekly Stats
  weeklyStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  weeklyStatCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  weeklyStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  weeklyStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
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
  popularClassInfo: {
    flex: 1,
    marginRight: 16,
  },
  popularClassName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  popularClassAttendance: {
    fontSize: 14,
    color: '#6B7280',
  },
  popularityBar: {
    width: 60,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  popularityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },

  // Empty States
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },

  // Waitlist Styles
  waitlistSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
  },
  waitlistStat: {
    alignItems: 'center',
  },
  waitlistNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  waitlistLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  waitlistCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  waitlistCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 16,
    paddingBottom: 4,
  },
  waitlistCardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  waitlistClientsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    padding: 16,
    paddingBottom: 8,
  },
  waitlistClientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  waitlistPosition: {
    width: 40,
    height: 40,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  positionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  waitlistClientInfo: {
    flex: 1,
  },
  waitlistClientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  waitlistClientEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  waitlistClientDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  waitlistClientActions: {
    flexDirection: 'row',
    gap: 8,
  },
  promoteButton: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 6,
  },

  // Loading
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
});

export default ReceptionReports;