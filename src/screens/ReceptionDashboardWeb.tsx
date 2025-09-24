import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Modal, Portal, TextInput } from 'react-native-paper';
import { useSelector } from 'react-redux';
import StickyNotes from '../components/StickyNotes';
import ReceptionEidMubarakMessageCard from '../components/ui/ReceptionEidMubarakMessageCard';
import WebCompatibleIcon from '../components/WebCompatibleIcon';
import { Announcement, announcementService } from '../services/announcementService';
import { ClientWithoutSubscription, subscriptionService } from '../services/subscriptionService';
import { themeService } from '../services/themeService';
import { unifiedApiService } from '../services/unifiedApi';
import { RootState, useAppDispatch } from '../store';
import { logoutUser } from '../store/authSlice';
import ClientProfile from './admin/ClientProfile';
import PCClassManagement from './admin/PCClassManagement';
import PCSubscriptionPlans from './admin/PCSubscriptionPlans';
import PCUserManagement from './admin/PCUserManagement';
import ReceptionReports from './ReceptionReports';
// Import the enhanced client profile

// Types for client profile data
interface ClientStats {
  totalSpent: number;
  totalClasses: number;
  currentPlan?: string;
  joinDate: string;
  lastActivity: string;
  attendanceRate: number;
  favoriteInstructor?: string;
  totalBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
}

interface BookingHistory {
  id: number;
  class_name: string;
  instructor_name: string;
  class_date: string;
  class_time: string;
  status: string;
  booking_date: string;
  equipment_type?: string;
}

interface PaymentHistory {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  subscription_plan_name?: string;
  transaction_id?: string;
}

interface AssignmentHistory {
  id: number;
  client_name: string;
  admin_name: string;
  admin_role: string;
  plan_name: string;
  monthly_price: number;
  classes_added: number;
  subscription_status: string;
  description: string;
  created_at: string;
}

interface SubscriptionHistory {
  id: number;
  plan_name: string;
  start_date: string;
  end_date: string;
  status: string;
  monthly_price: number;
  remaining_classes: number;
  equipment_access: string;
  assigned_by?: {
    id: number;
    name: string;
    role: string;
    assignment_date: string;
    assignment_notes: string;
  } | null;
}

// Create context for route and navigation
const MockNavigationContext = createContext<any>(null);



// Mock Navigation Provider
const MockNavigationProvider = ({ children, mockRoute, mockNavigation }: any) => {
  return (
    <MockNavigationContext.Provider value={{ route: mockRoute, navigation: mockNavigation }}>
      {children}
    </MockNavigationContext.Provider>
  );
};

// Simplified navigation wrapper for ClientProfile
const NavigationWrappedClientProfile = () => {
  const context = useContext(MockNavigationContext);
  
  if (!context) {
    console.error('NavigationWrappedClientProfile must be used within MockNavigationProvider');
    return <Text>Navigation context not available</Text>;
  }
  
  console.log('🔧 NavigationWrappedClientProfile context:', context);
  
  // Pass parameters directly as props to ClientProfile
  return (
    <ClientProfile 
      userId={context.route?.params?.userId}
      userName={context.route?.params?.userName}
    />
  );
};



// PC-Optimized Reception Dashboard
function ReceptionDashboard({ onNavigate, onStatsUpdate, navigation, waitlistModalVisible, setWaitlistModalVisible, waitlistModalData, setWaitlistModalData, waitlistModalTitle, setWaitlistModalTitle, onWaitlistClick, onWaitlistDataUpdate, onOpenThemeSwitch, currentUser }: any) {
  const [stats, setStats] = useState({
    totalClients: 0,
    todayClasses: 0,
    pendingBookings: 0,
    activeSubscriptions: 0,
    subscriptionsEndingSoon: 0,
    clientsWithoutSubscriptions: 0,
    clientsWhoDidntRenew: 0
  });
  const [additionalStats, setAdditionalStats] = useState({
    upcomingClasses: 0,
    waitlistCount: 0,
    recentBookings: 0,
    instructorCount: 0
  });
  const [classMetrics, setClassMetrics] = useState({
    todayClasses: [] as any[],
    tomorrowClasses: [] as any[],
    thisWeekClasses: [] as any[],
    waitlistToday: [] as any[],
    fullClassesToday: [] as any[]
  });
  const [rawBookingsData, setRawBookingsData] = useState<any[]>([]);
  const [rawClassesData, setRawClassesData] = useState<any[]>([]);
  const [rawWaitlistData, setRawWaitlistData] = useState<any[]>([]);
  const [activeClassFilter, setActiveClassFilter] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Activity filtering and pagination states
  const [activitySearchQuery, setActivitySearchQuery] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [activityTimeFilter, setActivityTimeFilter] = useState('recent');
  const [filteredActivity, setFilteredActivity] = useState<any[]>([]);
  const [refreshingActivities, setRefreshingActivities] = useState(false);
  
  // Pagination states for Recent Activity
  const [activityPage, setActivityPage] = useState(1);
  const [activityItemsPerPage] = useState(10);
  const [displayedActivities, setDisplayedActivities] = useState<any[]>([]);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);

  // Client modal states
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [subscriptionsEndingModalVisible, setSubscriptionsEndingModalVisible] = useState(false);
  const [subscriptionsEndingSoon, setSubscriptionsEndingSoon] = useState<any[]>([]);
  const [activeSubscriptionsModalVisible, setActiveSubscriptionsModalVisible] = useState(false);
  const [activeSubscriptionsList, setActiveSubscriptionsList] = useState<any[]>([]);
  
  // New states for clients without subscriptions
  const [clientsWithoutSubsModalVisible, setClientsWithoutSubsModalVisible] = useState(false);
  const [clientsWithoutSubscriptions, setClientsWithoutSubscriptions] = useState<ClientWithoutSubscription[]>([]);
  const [clientsWhoDidntRenewModalVisible, setClientsWhoDidntRenewModalVisible] = useState(false);
  const [clientsWhoDidntRenew, setClientsWhoDidntRenew] = useState<ClientWithoutSubscription[]>([]);

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 2 minutes to keep activities current
    const interval = setInterval(() => {
      loadDashboardData();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper function to fetch subscriptions with proper user and plan data joins
  const getSubscriptionsWithUserData = async () => {
    try {
      const { supabase } = require('../config/supabase.config');
      
      // Try the simple join first
      let { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          users(id, name, email),
          subscription_plans(id, name, description, monthly_price, monthly_classes, equipment_access)
        `)
        .order('created_at', { ascending: false });

      // If the join fails, fetch data separately and manually join
      if (error && error.message.includes('relationship')) {
        console.log('🔄 Join failed, fetching data separately and joining manually...');
        
        // Fetch subscriptions
        const { data: subscriptions, error: subError } = await supabase
          .from('user_subscriptions')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (subError) {
          console.error('❌ Error fetching subscriptions:', subError);
          return { success: false, error: subError.message };
        }

        // Fetch users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email, first_name, last_name');
          
        if (usersError) {
          console.error('❌ Error fetching users:', usersError);
          return { success: false, error: usersError.message };
        }

        // Fetch subscription plans
        const { data: plans, error: plansError } = await supabase
          .from('subscription_plans')
          .select('id, name, description, monthly_price, monthly_classes, equipment_access');
          
        if (plansError) {
          console.error('❌ Error fetching subscription plans:', plansError);
          return { success: false, error: plansError.message };
        }

        // Manually join the data
        data = subscriptions.map(subscription => {
          const user = users.find(u => u.id === subscription.user_id);
          const plan = plans.find(p => p.id === subscription.plan_id);
          
          return {
            ...subscription,
            users: user,
            subscription_plans: plan
          };
        });
        
        console.log('✅ Successfully fetched and joined subscription data manually:', data?.length || 0, 'records');
      } else if (error) {
        console.error('❌ Error fetching subscriptions with user data:', error);
        return { success: false, error: error.message };
      } else {

      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Exception fetching subscriptions with user data:', error);
      return { success: false, error: error.message };
    }
  };
  
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      

      
      // Load real data from unified API in parallel
      const { classService } = require('../services/classService');
      const [usersResponse, classesResponse, bookingsResponse, subscriptionsResponse, clientsWithoutSubsResponse, waitlistResponse] = await Promise.allSettled([
        unifiedApiService.getUsers(),
        classService.getClasses({ userRole: 'reception' }), // Ensure reception can see all classes including private ones
        unifiedApiService.getBookings(),
        // Load subscriptions with proper joins for user and plan data
        getSubscriptionsWithUserData(),
        // Load clients without active subscriptions
        subscriptionService.getClientsWithoutActiveSubscriptions(),
        // Load waitlist data from separate table
        unifiedApiService.getAllWaitlistEntries()
      ]);



      // Process users stats with better error handling
      let totalClients = 0;
      let allWaitlistEntries: any[] = [];
      if (usersResponse.status === 'fulfilled' && usersResponse.value.success && usersResponse.value.data && Array.isArray(usersResponse.value.data)) {
        const clients = usersResponse.value.data.filter((user: any) => user.role === 'client');
        totalClients = clients.length;
        console.log('✅ Loaded users data successfully:', { totalUsers: usersResponse.value.data.length, totalClients });
      } else {
        console.log('⚠️ Failed to load users data:', usersResponse.status === 'rejected' ? usersResponse.reason : usersResponse.value?.error);
        if (usersResponse.status === 'rejected') {
          console.error('❌ Users API rejected:', usersResponse.reason);
        } else if (usersResponse.value) {
          console.error('❌ Users API failed:', usersResponse.value.error);
        }
      }

      // Process classes with better error handling  
      let totalClasses = 0;
      let todayClasses = 0;
      if (classesResponse.status === 'fulfilled' && classesResponse.value.success && classesResponse.value.data && Array.isArray(classesResponse.value.data)) {
        totalClasses = classesResponse.value.data.length;
        const today = new Date().toISOString().split('T')[0];
        todayClasses = classesResponse.value.data.filter((class_: any) => class_.date === today).length;

      } else {
        console.log('⚠️ Failed to load classes data:', classesResponse.status === 'rejected' ? classesResponse.reason : classesResponse.value?.error);
        if (classesResponse.status === 'rejected') {
          console.error('❌ Classes API rejected:', classesResponse.reason);
        } else if (classesResponse.value) {
          console.error('❌ Classes API failed:', classesResponse.value.error);
        }
      }

      // Process bookings with better error handling
      let totalBookings = 0;
      let todayBookings = 0;
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && bookingsResponse.value.data && Array.isArray(bookingsResponse.value.data)) {
        totalBookings = bookingsResponse.value.data.length;
        const today = new Date().toISOString().split('T')[0];
        todayBookings = bookingsResponse.value.data.filter((booking: any) => {
          return booking.class_date === today || booking.date === today;
        }).length;

      } else {
        console.log('⚠️ Failed to load bookings data:', bookingsResponse.status === 'rejected' ? bookingsResponse.reason : bookingsResponse.value?.error);
        if (bookingsResponse.status === 'rejected') {
          console.error('❌ Bookings API rejected:', bookingsResponse.reason);
        } else if (bookingsResponse.value) {
          console.error('❌ Bookings API failed:', bookingsResponse.value.error);
        }
      }

      // Process subscriptions with better error handling
      let activeSubscriptions = 0;
      let subscriptionsEndingSoon = 0;
      let subscriptionsEndingSoonList: any[] = [];
      
      if (subscriptionsResponse.status === 'fulfilled' && subscriptionsResponse.value.success && subscriptionsResponse.value.data && Array.isArray(subscriptionsResponse.value.data)) {
        activeSubscriptions = subscriptionsResponse.value.data.filter((sub: any) => sub.status === 'active').length;
        
        // Calculate subscriptions ending soon (within next 10 days)
        const now = new Date();
        const tenDaysFromNow = new Date(now.getTime() + (10 * 24 * 60 * 60 * 1000));
        
        subscriptionsEndingSoonList = subscriptionsResponse.value.data.filter((sub: any) => {
          if (sub.status !== 'active' || !sub.end_date) return false;
          
          const endDate = new Date(sub.end_date);
          return endDate <= tenDaysFromNow && endDate > now;
        }).map((sub: any) => ({
          ...sub,
          // Ensure we have proper user name fallback
          user_name: sub.users?.name || sub.user_name || 'Unknown Client',
          // Ensure we have proper plan name
          plan_name: sub.subscription_plans?.name || 'Unknown Plan',
          // Add additional useful data
          user_email: sub.users?.email || 'No email',
          plan_price: sub.subscription_plans?.monthly_price || 0,
          equipment_access: sub.subscription_plans?.equipment_access || 'unknown'
        }));
        
        subscriptionsEndingSoon = subscriptionsEndingSoonList.length;
        

      } else {
        console.log('⚠️ Failed to load subscriptions data:', subscriptionsResponse.status === 'rejected' ? subscriptionsResponse.reason : subscriptionsResponse.value?.error);
        if (subscriptionsResponse.status === 'rejected') {
          console.error('❌ Subscriptions API rejected:', subscriptionsResponse.reason);
        } else if (subscriptionsResponse.value) {
          console.error('❌ Subscriptions API failed:', subscriptionsResponse.value.error);
        }
      }

      // Process clients without active subscriptions
      let clientsWithoutSubscriptions = 0;
      let clientsWhoDidntRenew = 0;
      let clientsWithoutSubsList: ClientWithoutSubscription[] = [];
      let clientsWhoDidntRenewList: ClientWithoutSubscription[] = [];
      
      if (clientsWithoutSubsResponse.status === 'fulfilled' && clientsWithoutSubsResponse.value.success && clientsWithoutSubsResponse.value.data) {
        const allClientsWithoutSubs = clientsWithoutSubsResponse.value.data;
        clientsWithoutSubscriptions = allClientsWithoutSubs.length;
        
        // Separate clients who never had a subscription vs those who didn't renew
        clientsWithoutSubsList = allClientsWithoutSubs.filter(client => !client.has_previous_subscription);
        clientsWhoDidntRenewList = allClientsWithoutSubs.filter(client => client.has_previous_subscription);
        
        clientsWhoDidntRenew = clientsWhoDidntRenewList.length;
        
        // Store the data for modals
        setClientsWithoutSubscriptions(clientsWithoutSubsList);
        setClientsWhoDidntRenew(clientsWhoDidntRenewList);
        
        console.log('✅ Loaded clients without subscriptions data successfully:', { 
          total: clientsWithoutSubscriptions, 
          neverHadSub: clientsWithoutSubsList.length,
          didntRenew: clientsWhoDidntRenew 
        });
      } else {
        console.log('⚠️ Failed to load clients without subscriptions data:', 
          clientsWithoutSubsResponse.status === 'rejected' ? clientsWithoutSubsResponse.reason : clientsWithoutSubsResponse.value?.error);
      }

      const newStats = {
        totalClients,
        todayClasses,
        pendingBookings: todayBookings,
        activeSubscriptions,
        subscriptionsEndingSoon,
        clientsWithoutSubscriptions,
        clientsWhoDidntRenew
      };

      // Add more dynamic metrics for better live updates
      const additionalStats = {
        upcomingClasses: 0,
        waitlistCount: 0,
        recentBookings: 0,
        instructorCount: 0
      };

      // Calculate upcoming classes (next 7 days)
      if (classesResponse.status === 'fulfilled' && classesResponse.value.success && classesResponse.value.data && Array.isArray(classesResponse.value.data)) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        additionalStats.upcomingClasses = classesResponse.value.data.filter((class_: any) => {
          const classDate = new Date(class_.date);
          return classDate > now && classDate <= nextWeek;
        }).length;

        // Count instructors
        const instructorIds = new Set(classesResponse.value.data.map((class_: any) => class_.instructor_id).filter(Boolean));
        additionalStats.instructorCount = instructorIds.size;

        // Enhanced class metrics calculation
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        const endOfWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

        // Today's classes with detailed metrics
        const todayClasses = classesResponse.value.data.filter((class_: any) => class_.date === today);
        const todayClassesWithBookings = todayClasses.map((class_: any) => {
          const classBookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)
            ? bookingsResponse.value.data.filter((booking: any) => 
                booking.class_id === class_.id && 
                (booking.status === 'confirmed' || booking.status === 'active')
              )
            : [];
          
          const waitlistBookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)
            ? bookingsResponse.value.data.filter((booking: any) => 
                booking.class_id === class_.id && 
                booking.status === 'waitlist'
              )
            : [];

          // Get actual class capacity or use a reasonable default
          const actualCapacity = class_.max_capacity || class_.capacity || 8; // Use 8 as default instead of 20

          // Get client details from users data
          const getClientDetails = (userId: any) => {
            if (usersResponse.status === 'fulfilled' && usersResponse.value.success && Array.isArray(usersResponse.value.data)) {
              const user = usersResponse.value.data.find((u: any) => u.id === userId);
              return user ? {
                id: user.id,
                name: user.name || user.first_name + ' ' + user.last_name || 'Unknown Client',
                email: user.email || 'No email'
              } : {
                id: userId,
                name: 'Unknown Client',
                email: 'No email'
              };
            }
            return {
              id: userId,
              name: 'Unknown Client',
              email: 'No email'
            };
          };

          // Get instructor details
          const getInstructorDetails = (instructorId: any) => {
            if (instructorId && usersResponse.status === 'fulfilled' && usersResponse.value.success && Array.isArray(usersResponse.value.data)) {
              const instructor = usersResponse.value.data.find((u: any) => u.id === instructorId && u.role === 'instructor');
              return instructor ? {
                id: instructor.id,
                name: instructor.name || instructor.first_name + ' ' + instructor.last_name || 'Unknown Instructor'
              } : null;
            }
            return null;
          };

          const instructorDetails = getInstructorDetails(class_.instructor_id);

          return {
            ...class_,
            confirmedBookings: classBookings.length,
            waitlistCount: waitlistBookings.length,
            isFull: classBookings.length >= actualCapacity,
            availableSpots: Math.max(0, actualCapacity - classBookings.length),
            bookingPercentage: Math.round((classBookings.length / actualCapacity) * 100),
            instructorDetails: instructorDetails,
            // Store actual client data for the View Clients functionality
            confirmedClients: classBookings.map((booking: any) => {
              const clientDetails = getClientDetails(booking.user_id);
              return {
                ...clientDetails,
                status: 'confirmed'
              };
            }),
            waitlistClients: waitlistBookings.map((booking: any) => {
              const clientDetails = getClientDetails(booking.user_id);
              return {
                ...clientDetails,
                status: 'waitlist'
              };
            })
          };
        });

        // Tomorrow's classes
        const tomorrowClasses = classesResponse.value.data.filter((class_: any) => class_.date === tomorrow);

        // This week's classes (next 7 days)
        const thisWeekClasses = classesResponse.value.data.filter((class_: any) => {
          const classDate = new Date(class_.date);
          return classDate > now && classDate <= endOfWeek;
        });

        // Calculate metrics for tomorrow and this week classes
        const tomorrowClassesWithBookings = tomorrowClasses.map((class_: any) => {
          const classBookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)
            ? bookingsResponse.value.data.filter((booking: any) => 
                booking.class_id === class_.id && 
                (booking.status === 'confirmed' || booking.status === 'active')
              )
            : [];
          
          const waitlistBookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)
            ? bookingsResponse.value.data.filter((booking: any) => 
                booking.class_id === class_.id && 
                booking.status === 'waitlist'
              )
            : [];

          const actualCapacity = class_.max_capacity || class_.capacity || 8;

          // Get client details from users data
          const getClientDetails = (userId: any) => {
            if (usersResponse.status === 'fulfilled' && usersResponse.value.success && Array.isArray(usersResponse.value.data)) {
              const user = usersResponse.value.data.find((u: any) => u.id === userId);
              return user ? {
                id: user.id,
                name: user.name || user.first_name + ' ' + user.last_name || 'Unknown Client',
                email: user.email || 'No email'
              } : {
                id: userId,
                name: 'Unknown Client',
                email: 'No email'
              };
            }
            return {
              id: userId,
              name: 'Unknown Client',
              email: 'No email'
            };
          };

          return {
            ...class_,
            confirmedBookings: classBookings.length,
            waitlistCount: waitlistBookings.length,
            isFull: classBookings.length >= actualCapacity,
            availableSpots: Math.max(0, actualCapacity - classBookings.length),
            bookingPercentage: Math.round((classBookings.length / actualCapacity) * 100),
            confirmedClients: classBookings.map((booking: any) => {
              const clientDetails = getClientDetails(booking.user_id);
              return {
                ...clientDetails,
                status: 'confirmed'
              };
            }),
            waitlistClients: waitlistBookings.map((booking: any) => {
              const clientDetails = getClientDetails(booking.user_id);
              return {
                ...clientDetails,
                status: 'waitlist'
              };
            })
          };
        });

        const thisWeekClassesWithBookings = thisWeekClasses.map((class_: any) => {
          const classBookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)
            ? bookingsResponse.value.data.filter((booking: any) => 
                booking.class_id === class_.id && 
                (booking.status === 'confirmed' || booking.status === 'active')
              )
            : [];
          
          const waitlistBookings = bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)
            ? bookingsResponse.value.data.filter((booking: any) => 
                booking.class_id === class_.id && 
                booking.status === 'waitlist'
              )
            : [];

          const actualCapacity = class_.max_capacity || class_.capacity || 8;

          // Get client details from users data
          const getClientDetails = (userId: any) => {
            if (usersResponse.status === 'fulfilled' && usersResponse.value.success && Array.isArray(usersResponse.value.data)) {
              const user = usersResponse.value.data.find((u: any) => u.id === userId);
              return user ? {
                id: user.id,
                name: user.name || user.first_name + ' ' + user.last_name || 'Unknown Client',
                email: user.email || 'No email'
              } : {
                id: userId,
                name: 'Unknown Client',
                email: 'No email'
              };
            }
            return {
              id: userId,
              name: 'Unknown Client',
              email: 'No email'
            };
          };

          return {
            ...class_,
            confirmedBookings: classBookings.length,
            waitlistCount: waitlistBookings.length,
            isFull: classBookings.length >= actualCapacity,
            availableSpots: Math.max(0, actualCapacity - classBookings.length),
            bookingPercentage: Math.round((classBookings.length / actualCapacity) * 100),
            confirmedClients: classBookings.map((booking: any) => {
              const clientDetails = getClientDetails(booking.user_id);
              return {
                ...clientDetails,
                status: 'confirmed'
              };
            }),
            waitlistClients: waitlistBookings.map((booking: any) => {
              const clientDetails = getClientDetails(booking.user_id);
              return {
                ...clientDetails,
                status: 'waitlist'
              };
            })
          };
        });

        // Process waitlist data from separate table
        console.log('🔍 DEBUG: Processing waitlist data from separate table...');
        
        if (waitlistResponse.status === 'fulfilled' && waitlistResponse.value.success && Array.isArray(waitlistResponse.value.data)) {
          allWaitlistEntries = waitlistResponse.value.data;
          console.log('⏳ Total waitlist entries found:', allWaitlistEntries.length);
          
          if (allWaitlistEntries.length > 0) {
            console.log('⏳ Waitlist entries details:', allWaitlistEntries.map(w => ({
              id: w.id,
              user_id: w.user_id,
              class_id: w.class_id,
              position: w.position,
              user_name: w.users?.name || 'Unknown',
              class_name: w.classes?.name || 'Unknown',
              class_date: w.classes?.date,
              created_at: w.created_at
            })));
          }
        } else {
          console.log('❌ Waitlist response failed:', waitlistResponse.status === 'rejected' ? waitlistResponse.reason : waitlistResponse.value?.error);
        }
        
        // Calculate waitlist for today using the separate waitlist table
        const waitlistToday = allWaitlistEntries.filter((waitlistEntry: any) => {
          const classDate = waitlistEntry.classes?.date;
          return classDate === today;
        });
        
        console.log('✅ Final waitlist today count:', waitlistToday.length);
        if (waitlistToday.length > 0) {
          console.log('✅ Waitlist today details:', waitlistToday.map(w => ({
            id: w.id,
            user_name: w.users?.name || 'Unknown',
            class_name: w.classes?.name || 'Unknown',
            position: w.position
          })));
        }

        // Full classes today
        const fullClassesToday = todayClassesWithBookings.filter((class_: any) => class_.isFull);

        setClassMetrics({
          todayClasses: todayClassesWithBookings,
          tomorrowClasses: tomorrowClassesWithBookings,
          thisWeekClasses: thisWeekClassesWithBookings,
          waitlistToday,
          fullClassesToday
        });
      }

      // Calculate waitlist count using the separate waitlist table
      additionalStats.waitlistCount = allWaitlistEntries.length;
      console.log('📊 Additional stats - Total waitlist entries:', allWaitlistEntries.length);

      // Count recent bookings (last 24 hours) from bookings table
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && bookingsResponse.value.data && Array.isArray(bookingsResponse.value.data)) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        additionalStats.recentBookings = bookingsResponse.value.data.filter((booking: any) => 
          new Date(booking.created_at) > oneDayAgo
        ).length;
      }


      setStats(newStats);
      setAdditionalStats(additionalStats); // Update the new state variable
      setSubscriptionsEndingSoon(subscriptionsEndingSoonList); // Store the list for the modal
      
      // Store raw data for dynamic calculations
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && Array.isArray(bookingsResponse.value.data)) {
        setRawBookingsData(bookingsResponse.value.data);
      }
      if (classesResponse.status === 'fulfilled' && classesResponse.value.success && Array.isArray(classesResponse.value.data)) {
        setRawClassesData(classesResponse.value.data);
      }
      
      // Store waitlist data for dynamic calculations
      setRawWaitlistData(allWaitlistEntries);
      
      // Store all active subscriptions for the Active Plans modal
      if (subscriptionsResponse.status === 'fulfilled' && subscriptionsResponse.value.success && subscriptionsResponse.value.data) {
        const allActiveSubscriptions = subscriptionsResponse.value.data
          .filter((sub: any) => sub.status === 'active')
          .map((sub: any) => ({
            ...sub,
            user_name: sub.users?.name || sub.user_name || 'Unknown Client',
            user_email: sub.users?.email || sub.user_email || '',
            plan_name: sub.subscription_plans?.name || sub.plan_name || 'Unknown Plan',
            plan_price: sub.subscription_plans?.monthly_price || 0,
            equipment_access: sub.subscription_plans?.equipment_access || 'mat'
          }));
        setActiveSubscriptionsList(allActiveSubscriptions);
      }
      
      setLastUpdateTime(new Date()); // Update timestamp
      
      // Update parent component stats for sidebar badges
      if (onStatsUpdate) {
        onStatsUpdate(newStats);
      }

      // Create activity items from real data
      const activities: any[] = [];
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

      // Helper function to check if date is within last 24 hours
      const isRecent = (dateString: string) => {
        const date = new Date(dateString);
        return date > oneDayAgo;
      };

      // Process recent user registrations
      if (usersResponse.status === 'fulfilled' && usersResponse.value.success && usersResponse.value.data && Array.isArray(usersResponse.value.data)) {
        const recentUsers = usersResponse.value.data.filter((user: any) => 
          user.role === 'client' && isRecent(user.created_at)
        );
        recentUsers.forEach((user: any) => {
          activities.push({
            id: `user-${user.id}`,
            text: `New client registration: ${user.name || user.email}`,
            time: getTimeAgo(new Date(user.created_at)),
            type: 'client',
            icon: 'person-add',
            color: '#4CAF50',
            read: false,
            created_at: user.created_at,
            userId: user.id,
            userName: user.name || user.email,
            clientId: user.id // Keep for backward compatibility
          });
        });
      }

      // Process recent bookings
      if (bookingsResponse.status === 'fulfilled' && bookingsResponse.value.success && bookingsResponse.value.data && Array.isArray(bookingsResponse.value.data)) {
        const recentBookings = bookingsResponse.value.data.filter((booking: any) => isRecent(booking.created_at));
        recentBookings.forEach((booking: any) => {
          // Get class date and time for better context
          const classDate = booking.class_date ? new Date(booking.class_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          const classTime = booking.class_time ? booking.class_time.slice(0, 5) : '';
          const classInfo = classDate && classTime ? ` (${classDate} at ${classTime})` : '';
          
          activities.push({
            id: `booking-${booking.id}`,
            text: `${booking.user_name || 'Client'} booked "${booking.class_name || 'Class'}"${classInfo}`,
            time: getTimeAgo(new Date(booking.created_at)),
            type: 'booking',
            icon: 'event',
            color: '#2196F3',
            read: false,
            created_at: booking.created_at,
            userId: booking.user_id,
            userName: booking.user_name || 'Client',
            classId: booking.class_id
          });
        });

        // Process class cancellations
        const cancelledBookings = bookingsResponse.value.data.filter((booking: any) => 
          booking.status === 'cancelled' && isRecent(booking.updated_at || booking.created_at)
        );
        cancelledBookings.forEach((booking: any) => {
          // Get class date and time for better context
          const classDate = booking.class_date ? new Date(booking.class_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
          const classTime = booking.class_time ? booking.class_time.slice(0, 5) : '';
          const classInfo = classDate && classTime ? ` (${classDate} at ${classTime})` : '';
          
          activities.push({
            id: `cancellation-${booking.id}`,
            text: `${booking.user_name || 'Client'} cancelled "${booking.class_name || 'Class'}"${classInfo}`,
            time: getTimeAgo(new Date(booking.updated_at || booking.created_at)),
            type: 'cancellation',
            icon: 'event-busy',
            color: '#F44336',
            read: false,
            created_at: booking.updated_at || booking.created_at,
            userId: booking.user_id,
            userName: booking.user_name || 'Client',
            classId: booking.class_id
          });
        });
      }

      // Process recent subscriptions
      if (subscriptionsResponse.status === 'fulfilled' && subscriptionsResponse.value.success && subscriptionsResponse.value.data && Array.isArray(subscriptionsResponse.value.data)) {
        const recentSubscriptions = subscriptionsResponse.value.data.filter((sub: any) => isRecent(sub.created_at));
        recentSubscriptions.forEach((sub: any) => {
          activities.push({
            id: `subscription-${sub.id}`,
            text: `New subscription: ${sub.user_name || 'Client'} - ${sub.plan_name || 'Plan'}`,
            time: getTimeAgo(new Date(sub.created_at)),
            type: 'subscription',
            icon: 'card-membership',
            color: '#9C27B0',
            read: false,
            created_at: sub.created_at,
            userId: sub.user_id,
            userName: sub.user_name || 'Client'
          });
        });
      }

      // Sort activities by creation date (newest first)
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Keep only last 100 activities to prevent memory issues
      const limitedActivities = activities.slice(0, 100);
      
      setAllActivities(limitedActivities);
      setFilteredActivity(limitedActivities);


    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Set default stats on error
      setStats({
        totalClients: 0,
        todayClasses: 0,
        pendingBookings: 0,
        activeSubscriptions: 0,
        subscriptionsEndingSoon: 0,
        clientsWithoutSubscriptions: 0,
        clientsWhoDidntRenew: 0
      });
      setAdditionalStats({
        upcomingClasses: 0,
        waitlistCount: 0,
        recentBookings: 0,
        instructorCount: 0
      });
      setAllActivities([]);
      setFilteredActivity([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle activity pagination when filtered activities change
  useEffect(() => {
    const startIndex = 0;
    const endIndex = activityPage * activityItemsPerPage;
    const paginatedActivities = filteredActivity.slice(startIndex, endIndex);
    
    setDisplayedActivities(paginatedActivities);
    setHasMoreActivities(endIndex < filteredActivity.length);
  }, [filteredActivity, activityPage, activityItemsPerPage]);

  // Load more activities
  const handleLoadMoreActivities = () => {
    if (!hasMoreActivities || loadingMoreActivities) return;
    
    setLoadingMoreActivities(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setActivityPage(prev => prev + 1);
      setLoadingMoreActivities(false);
    }, 500);
  };

  // Reset pagination when filtering changes
  const resetActivityPagination = () => {
    setActivityPage(1);
    setDisplayedActivities([]);
  };

  const getTimeAgo = (dateInput: Date | string): string => {
    // Handle both Date objects and string inputs
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    const now = new Date();
    
    // Ensure we have valid dates
    if (isNaN(date.getTime())) {
      return 'Unknown time';
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return 'In the future';
    }

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    // For older items, show the actual date
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSearchClients = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      
      // Get all users from REST API and filter clients
      const response = await unifiedApiService.getUsers();
      
      if (response.success && response.data && Array.isArray(response.data)) {
        const clients = response.data.filter((user: any) => 
          user.role === 'client' && 
          (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        setSearchResults(clients);
      } else {
        setSearchResults([]);
      }
      
    } catch (error) {
      console.error('Error searching clients:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshingActivities(true);
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Error refreshing activities:', error);
    } finally {
      setRefreshingActivities(false);
    }
  };

  const handleWaitlistClick = () => {
    let filteredWaitlist: any[] = [];
    let title = '';

    if (activeClassFilter === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filteredWaitlist = rawWaitlistData.filter((waitlistEntry: any) => {
        const classDate = waitlistEntry.classes?.date;
        return classDate === today;
      });
      title = 'Waitlist Today';
    } else if (activeClassFilter === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      filteredWaitlist = rawWaitlistData.filter((waitlistEntry: any) => {
        const classDate = waitlistEntry.classes?.date;
        return classDate === tomorrowStr;
      });
      title = 'Waitlist Tomorrow';
    } else {
      filteredWaitlist = rawWaitlistData;
      title = 'All Waitlist Entries';
    }

    // Update the parent component with the filtered data
    onWaitlistDataUpdate(filteredWaitlist, title);
    setWaitlistModalVisible(true);
  };

  const quickActions = [
    {
      title: 'Create New Client',
      icon: 'person-add',
      action: () => onNavigate('Clients'),
      color: '#4CAF50'
    },
    {
      title: 'View All Clients',
      icon: 'people',
      action: () => onNavigate('Clients'),
      color: '#673AB7'
    },
    {
      title: 'Schedule Class',
      icon: 'event',
      action: () => onNavigate('Classes'),
      color: '#2196F3'
    },
    {
      title: 'Manage Plans',
      icon: 'card-membership',
      action: () => onNavigate('Plans'),
      color: '#FF9800'
    },
    {
      title: 'View Reports',
      icon: 'assessment',
      action: () => onNavigate('Reports'),
      color: '#9C27B0'
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B8A7D" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }
   
  return (
    <>
      {/* Sticky Notes Section - Only on Dashboard */}
      <StickyNotes userId={currentUser?.id || 'reception'} />
      
      {/* Quick Client Search */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>Quick Client Search</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            right={
              searchResults.length > 0 ? (
                <TextInput.Icon 
                  icon="close" 
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                />
              ) : undefined
            }
            onSubmitEditing={handleSearchClients}
            theme={{
              colors: {
                primary: '#9B8A7D',
                placeholder: '#999'
              }
            }}
          />
          <TouchableOpacity 
            style={[styles.searchButton, searching && styles.searchButtonDisabled]}
            onPress={handleSearchClients}
            disabled={searching}
          >
            <WebCompatibleIcon 
              name={searching ? "hourglass-empty" : "search"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.searchResultsTitle}>
                Found {searchResults.length} client{searchResults.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {searchResults.map((client, index) => (
              <TouchableOpacity
                key={client.id || index}
                style={styles.searchResultItem}
                onPress={() => {
                  console.log('Search result clicked:', client.id, client.name);
                  if (client.id) {
                    const userName = client.name || client.email || 'Unknown Client';
                    
                    console.log('Navigating to ReceptionClientProfile for search result:', client.id);
                    
                    // Use React Navigation to navigate to ClientProfile (which renders ReceptionClientProfile)
                    if (navigation && navigation.navigate) {
                      try {
                        navigation.navigate('ClientProfile', { 
                          userId: client.id, 
                          userName: userName 
                        });
                        console.log('✅ Navigation to ReceptionClientProfile completed');
                        
                        // Clear search after successful navigation
                        setSearchQuery('');
                        setSearchResults([]);
                      } catch (error) {
                        console.error('❌ Navigation failed:', error);
                        alert('Navigation Error: Failed to open client profile');
                      }
                    } else {
                      console.error('❌ Navigation object not available');
                      alert('Navigation Error: Navigation not available');
                    }
                  } else {
                    alert('Unable to navigate: Client ID not found');
                  }
                }}
              >
                <View style={styles.searchResultAvatar}>
                  <WebCompatibleIcon name="person" size={24} color="#9B8A7D" />
                </View>
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{client.name}</Text>
                  <Text style={styles.searchResultEmail}>{client.email}</Text>
                  <Text style={styles.searchResultStatus}>
                    {client.status === 'active' ? '● Active' : '○ Inactive'}
                  </Text>
                </View>
                <WebCompatibleIcon name="arrow-forward" size={20} color="#9B8A7D" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsHeader}>
          <Text style={styles.sectionTitle}>Live Metrics</Text>
          <View style={styles.statsStatus}>
            <View style={[styles.liveIndicator, { backgroundColor: loading ? '#FF9800' : '#4CAF50' }]}>
              <Text style={styles.liveIndicatorText}>
                {loading ? '🔄 Updating...' : '● Live'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
              onPress={loadDashboardData}
              disabled={loading}
            >
              <WebCompatibleIcon 
                name={loading ? "hourglass-empty" : "refresh"} 
                size={20} 
                color={loading ? "#9CA3AF" : "#9B8A7D"} 
              />
              <Text style={[styles.refreshText, loading && styles.refreshTextDisabled]}>
                {loading ? 'Loading...' : 'Refresh Metrics'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.statsTimestamp}>
          <Text style={styles.timestampText}>
            Last updated: {lastUpdateTime.toLocaleTimeString()} • Auto-refresh every 2 minutes
          </Text>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <WebCompatibleIcon name="people" size={32} color="#4CAF50" />
            <Text style={styles.statNumber}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
          </View>
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => setActiveSubscriptionsModalVisible(true)}
          >
            <WebCompatibleIcon name="card-membership" size={32} color="#9C27B0" />
            <Text style={styles.statNumber}>{stats.activeSubscriptions}</Text>
            <Text style={styles.statLabel}>Active Plans</Text>
            <Text style={styles.statSubtext}>Click to view</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statCard,
              stats.subscriptionsEndingSoon > 0 && styles.statCardWarning
            ]}
            onPress={() => setSubscriptionsEndingModalVisible(true)}
          >
            <WebCompatibleIcon 
              name={stats.subscriptionsEndingSoon > 0 ? "warning" : "schedule"} 
              size={32} 
              color={stats.subscriptionsEndingSoon > 0 ? "#F44336" : "#FF9800"} 
            />
            <Text style={[
              styles.statNumber,
              stats.subscriptionsEndingSoon > 0 && styles.statNumberWarning
            ]}>
              {stats.subscriptionsEndingSoon}
            </Text>
            <Text style={styles.statLabel}>Ending Soon</Text>
            <Text style={styles.statSubtext}>
              {stats.subscriptionsEndingSoon > 0 ? '⚠️ Click to view' : 'Click to view'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statCard,
              stats.clientsWithoutSubscriptions > 0 && styles.statCardWarning
            ]}
            onPress={() => setClientsWithoutSubsModalVisible(true)}
          >
                        <WebCompatibleIcon
              name={stats.clientsWithoutSubscriptions > 0 ? "person-remove" : "person-outline"} 
              size={32}
              color={stats.clientsWithoutSubscriptions > 0 ? "#F44336" : "#9CA3AF"}
            />
            <Text style={[
              styles.statNumber,
              stats.clientsWithoutSubscriptions > 0 && styles.statNumberWarning
            ]}>
              {stats.clientsWithoutSubscriptions}
            </Text>
            <Text style={styles.statLabel}>No Active Plan</Text>
            <Text style={styles.statSubtext}>
              {stats.clientsWithoutSubscriptions > 0 ? '⚠️ Click to view' : 'All have plans'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statCard,
              stats.clientsWhoDidntRenew > 0 && styles.statCardWarning
            ]}
            onPress={() => setClientsWhoDidntRenewModalVisible(true)}
          >
                        <WebCompatibleIcon
              name={stats.clientsWhoDidntRenew > 0 ? "refresh" : "replay"} 
              size={32}
              color={stats.clientsWhoDidntRenew > 0 ? "#FF9800" : "#9CA3AF"}
            />
            <Text style={[
              styles.statNumber,
              stats.clientsWhoDidntRenew > 0 && styles.statNumberWarning
            ]}>
              {stats.clientsWhoDidntRenew}
            </Text>
            <Text style={styles.statLabel}>Didn't Renew</Text>
            <Text style={styles.statSubtext}>
              {stats.clientsWhoDidntRenew > 0 ? '⚠️ Click to view' : 'All renewed'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Class Metrics */}
      <View style={styles.classMetricsSection}>
        {/* Quick Summary */}
        {classMetrics.todayClasses.length > 0 && (
          <View style={styles.quickSummary}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📊 Today's Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Classes:</Text>
                  <Text style={styles.summaryValue}>{classMetrics.todayClasses.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Full Classes:</Text>
                  <Text style={[styles.summaryValue, { color: classMetrics.fullClassesToday.length > 0 ? '#F44336' : '#4CAF50' }]}>
                    {classMetrics.fullClassesToday.length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Waitlist:</Text>
                  <Text style={[styles.summaryValue, { color: classMetrics.waitlistToday.length > 0 ? '#FF9800' : '#4CAF50' }]}>
                    {classMetrics.waitlistToday.length}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Bookings:</Text>
                  <Text style={styles.summaryValue}>
                    {classMetrics.todayClasses.reduce((total: number, c: any) => total + (c.confirmedBookings || 0), 0)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.classMetricsHeader}>
          <Text style={styles.sectionTitle}>Class Overview</Text>
          <View style={styles.classMetricsControls}>
            <View style={styles.classFilterTabs}>
              <TouchableOpacity 
                style={[styles.filterTab, { backgroundColor: '#2196F3' }]}
                onPress={() => setActiveClassFilter('today')}
              >
                <Text style={styles.filterTabText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterTab, { backgroundColor: '#9C27B0' }]}
                onPress={() => setActiveClassFilter('tomorrow')}
              >
                <Text style={styles.filterTabText}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterTab, { backgroundColor: '#FF9800' }]}
                onPress={() => setActiveClassFilter('week')}
              >
                <Text style={styles.filterTabText}>This Week</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
              onPress={loadDashboardData}
              disabled={loading}
            >
              <WebCompatibleIcon 
                name={loading ? "hourglass-empty" : "refresh"} 
                size={20} 
                color={loading ? "#9CA3AF" : "#9B8A7D"} 
              />
              <Text style={[styles.refreshText, loading && styles.refreshTextDisabled]}>
                {loading ? 'Loading...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.classMetricsGrid}>
          {/* Today's Classes Summary */}
          <View style={styles.classMetricCard}>
            <View style={styles.classMetricHeader}>
              <WebCompatibleIcon name="fitness-center" size={24} color="#2196F3" />
              <Text style={styles.classMetricTitle}>
                {activeClassFilter === 'today' ? "Today's Classes" : 
                 activeClassFilter === 'tomorrow' ? "Tomorrow's Classes" : "This Week's Classes"}
              </Text>
            </View>
            <Text style={styles.classMetricNumber}>
              {activeClassFilter === 'today' ? classMetrics.todayClasses.length :
               activeClassFilter === 'tomorrow' ? classMetrics.tomorrowClasses.length :
               classMetrics.thisWeekClasses.length}
            </Text>
            <Text style={styles.classMetricSubtext}>
              {activeClassFilter === 'today' ? 
                `${classMetrics.fullClassesToday.length} Full • ${classMetrics.waitlistToday.length} Waitlist` :
               activeClassFilter === 'tomorrow' ? 
                'Classes scheduled for tomorrow' :
                'Classes in next 7 days'}
            </Text>
          </View>

          {/* Waitlist Count */}
          <View style={styles.classMetricCard}>
            <View style={styles.classMetricHeader}>
              <WebCompatibleIcon name="schedule" size={24} color="#FF9800" />
              <Text style={styles.classMetricTitle}>
                {activeClassFilter === 'today' ? 'Waitlist Today' : 'Waitlist'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleWaitlistClick} style={styles.clickableMetricNumber}>
              <Text style={[styles.classMetricNumber, { color: '#FF9800' }]}>
                {(() => {
                  if (activeClassFilter === 'today') {
                    return classMetrics.waitlistToday.length;
                  } else if (activeClassFilter === 'tomorrow') {
                    // Calculate waitlist for tomorrow using waitlist data
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                    
                    return rawWaitlistData.filter((waitlistEntry: any) => {
                      const classDate = waitlistEntry.classes?.date;
                      return classDate === tomorrowStr;
                    }).length;
                  } else {
                    // For 'all' or other filters, show total waitlist count
                    return additionalStats.waitlistCount || 0;
                  }
                })()}
            </Text>
            </TouchableOpacity>
            <Text style={styles.classMetricSubtext}>
              {(() => {
                const waitlistCount = (() => {
                  if (activeClassFilter === 'today') {
                    return classMetrics.waitlistToday.length;
                  } else if (activeClassFilter === 'tomorrow') {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const tomorrowStr = tomorrow.toISOString().split('T')[0];
                    return rawWaitlistData.filter((waitlistEntry: any) => {
                      const classDate = waitlistEntry.classes?.date;
                      return classDate === tomorrowStr;
                    }).length;
                  } else {
                    return additionalStats.waitlistCount || 0;
                  }
                })();
                
                if (waitlistCount > 0) {
                  return 'People waiting for spots';
                } else if (activeClassFilter === 'today') {
                  return 'No waitlist today';
                } else if (activeClassFilter === 'tomorrow') {
                  return 'No waitlist tomorrow';
                } else {
                  return 'Check individual classes';
                }
              })()}
            </Text>
          </View>

          {/* Full Classes */}
          <View style={styles.classMetricCard}>
            <View style={styles.classMetricHeader}>
              <WebCompatibleIcon name="event-busy" size={24} color="#F44336" />
              <Text style={styles.classMetricTitle}>
                {activeClassFilter === 'today' ? 'Full Classes' : 'At Capacity'}
              </Text>
            </View>
            <Text style={styles.classMetricNumber}>
              {activeClassFilter === 'today' ? classMetrics.fullClassesToday.length :
               activeClassFilter === 'tomorrow' ? 
                 classMetrics.tomorrowClasses.filter((c: any) => {
                   const bookings = c.confirmedBookings || 0;
                   return bookings >= (c.max_capacity || 20);
                 }).length :
                 classMetrics.thisWeekClasses.filter((c: any) => {
                   const bookings = c.confirmedBookings || 0;
                   return bookings >= (c.max_capacity || 20);
                 }).length}
            </Text>
            <Text style={styles.classMetricSubtext}>
              {activeClassFilter === 'today' ? 
                (classMetrics.fullClassesToday.length > 0 ? 'At capacity' : 'All classes have spots') :
               'Classes that are full'}
            </Text>
          </View>

          {/* Available Spots */}
          <View style={styles.classMetricCard}>
            <View style={styles.classMetricHeader}>
              <WebCompatibleIcon name="event-available" size={24} color="#4CAF50" />
              <Text style={styles.classMetricTitle}>Available Spots</Text>
            </View>
            <Text style={styles.classMetricNumber}>
              {(() => {
                const classes = activeClassFilter === 'today' ? classMetrics.todayClasses :
                               activeClassFilter === 'tomorrow' ? classMetrics.tomorrowClasses :
                               classMetrics.thisWeekClasses;
                return classes.reduce((total: number, c: any) => {
                  const bookings = c.confirmedBookings || 0;
                  const capacity = c.max_capacity || 20;
                  return total + Math.max(0, capacity - bookings);
                }, 0);
              })()}
            </Text>
            <Text style={styles.classMetricSubtext}>
              Total available spots across all classes
            </Text>
          </View>
        </View>

        {/* Today's Classes Detail */}
        {(() => {
          const classesToShow = activeClassFilter === 'today' ? classMetrics.todayClasses :
                               activeClassFilter === 'tomorrow' ? classMetrics.tomorrowClasses :
                               classMetrics.thisWeekClasses;
          
          if (classesToShow.length === 0) {
            return (
              <View style={styles.todayClassesDetail}>
                <Text style={styles.subsectionTitle}>
                  {activeClassFilter === 'today' ? "Today's Classes" :
                   activeClassFilter === 'tomorrow' ? "Tomorrow's Classes" :
                   "This Week's Classes"}
                </Text>
                <View style={styles.emptyClasses}>
                  <WebCompatibleIcon name="fitness-center" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyClassesText}>
                    No classes scheduled for {activeClassFilter === 'today' ? 'today' :
                                          activeClassFilter === 'tomorrow' ? 'tomorrow' :
                                          'this week'}
                  </Text>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.todayClassesDetail}>
              <Text style={styles.subsectionTitle}>
                {activeClassFilter === 'today' ? "Today's Class Details" :
                 activeClassFilter === 'tomorrow' ? "Tomorrow's Class Details" :
                 "This Week's Class Details"}
              </Text>
              <View style={styles.classesList}>
                {classesToShow.map((class_, index) => {
                  // Calculate metrics for classes that don't have them yet
                  const confirmedBookings = class_.confirmedBookings || 0;
                  const waitlistCount = class_.waitlistCount || 0;
                  const maxCapacity = class_.max_capacity || class_.capacity || 8; // Use actual capacity
                  const isFull = confirmedBookings >= maxCapacity;
                  const availableSpots = Math.max(0, maxCapacity - confirmedBookings);
                  const bookingPercentage = Math.round((confirmedBookings / maxCapacity) * 100);

                  return (
                    <View key={class_.id || index} style={[styles.classItem, isFull && styles.fullClassItem]}>
                      <View style={styles.classHeader}>
                        <View style={styles.classInfo}>
                          <Text style={styles.className}>{class_.name || 'Unnamed Class'}</Text>
                          <Text style={styles.classTime}>
                            {class_.date} at {class_.time || 'No time'} • {class_.instructorDetails?.name || class_.instructor_name || 'No instructor'}
                          </Text>
                        </View>
                        <View style={styles.classStatus}>
                          {isFull ? (
                            <View style={styles.fullClassBadge}>
                              <Text style={styles.fullClassBadgeText}>FULL</Text>
                            </View>
                          ) : (
                            <View style={styles.availableClassBadge}>
                              <Text style={styles.availableClassBadgeText}>
                                {availableSpots} spots
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.classMetrics}>
                        <View style={styles.classMetric}>
                          <Text style={styles.classMetricLabel}>Bookings:</Text>
                          <Text style={styles.classMetricValue}>
                            {confirmedBookings}/{maxCapacity}
                          </Text>
                        </View>
                        <View style={styles.classMetric}>
                          <Text style={styles.classMetricLabel}>Waitlist:</Text>
                          <Text style={styles.classMetricValue}>{waitlistCount}</Text>
                        </View>
                        <View style={styles.classMetric}>
                          <Text style={styles.classMetricLabel}>Capacity:</Text>
                          <Text style={styles.classMetricValue}>
                            {bookingPercentage}%
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.capacityBar}>
                        <View 
                          style={[
                            styles.capacityFill, 
                            { 
                              width: `${bookingPercentage}%`,
                              backgroundColor: isFull ? '#F44336' : 
                                             bookingPercentage > 80 ? '#FF9800' : '#4CAF50'
                            }
                          ]} 
                        />
                      </View>

                      {/* View Clients Button */}
                      <View style={styles.classActions}>
                        <TouchableOpacity 
                          style={styles.viewClientsButton}
                          onPress={() => {
                            setSelectedClass(class_);
                            setClientModalVisible(true);
                          }}
                        >
                          <WebCompatibleIcon name="people" size={16} color="#2196F3" />
                          <Text style={styles.viewClientsButtonText}>
                            View Clients ({confirmedBookings + waitlistCount})
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* Waitlist Details */}
        {classMetrics.waitlistToday.length > 0 && (
          <View style={styles.waitlistDetail}>
            <Text style={styles.subsectionTitle}>Waitlist Details</Text>
            <View style={styles.waitlistList}>
              {classMetrics.waitlistToday.map((waitlistItem, index) => {
                const class_ = classMetrics.todayClasses.find((c: any) => c.id === waitlistItem.class_id);
                return (
                  <View key={waitlistItem.id || index} style={styles.waitlistItem}>
                    <View style={styles.waitlistInfo}>
                      <Text style={styles.waitlistClientName}>
                        {waitlistItem.user_name || 'Unknown Client'}
                      </Text>
                      <Text style={styles.waitlistClassInfo}>
                        Waiting for: {class_?.name || 'Unknown Class'} at {class_?.time || 'Unknown Time'}
                      </Text>
                    </View>
                    <View style={styles.waitlistActions}>
                      <TouchableOpacity style={styles.waitlistActionButton}>
                        <WebCompatibleIcon name="check" size={16} color="#4CAF50" />
                        <Text style={styles.waitlistActionText}>Move to Class</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickActionCard, { borderLeftColor: action.color }]}
              onPress={action.action}
            >
              <WebCompatibleIcon name={action.icon as any} size={24} color={action.color} />
              <Text style={styles.quickActionText}>{action.title}</Text>
              <WebCompatibleIcon name="arrow-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Islamic Celebration Card */}
      <ReceptionEidMubarakMessageCard 
        onPress={onOpenThemeSwitch}
        showAnimations={true}
      />

      {/* Recent Activity */}
      <View style={styles.recentActivitySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityControls}>
            <TouchableOpacity 
              style={[styles.refreshButton, refreshingActivities && styles.refreshButtonDisabled]}
              onPress={handleManualRefresh}
              disabled={refreshingActivities}
            >
              <WebCompatibleIcon 
                name={refreshingActivities ? "hourglass-empty" : "refresh"} 
                size={20} 
                color={refreshingActivities ? "#9CA3AF" : "#9B8A7D"} 
              />
              <Text style={[styles.refreshText, refreshingActivities && styles.refreshTextDisabled]}>
                {refreshingActivities ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.activityCount}>
              {filteredActivity.length} activities
            </Text>
          </View>
        </View>

        <ScrollView style={styles.activityScrollContainer} showsVerticalScrollIndicator={true}>
          <View style={styles.activityList}>
            {displayedActivities.length > 0 ? (
              displayedActivities.map((activity, index) => (
                <TouchableOpacity 
                  key={activity.id || index} 
                  style={styles.activityItem}
                                  onPress={() => {
                  console.log('Activity clicked:', activity);
                  
                  // Navigate based on activity type - prioritize client profile navigation
                  if (activity.userId || activity.clientId) {
                    const userId = activity.userId || activity.clientId;
                    const userName = activity.userName || 'Unknown Client';
                    
                    console.log('Navigating to ReceptionClientProfile for userId:', userId);
                    
                    // Use React Navigation to navigate to ClientProfile (which renders ReceptionClientProfile)
                    if (navigation && navigation.navigate) {
                      try {
                        navigation.navigate('ClientProfile', { 
                          userId: userId, 
                          userName: userName 
                        });
                        console.log('✅ Navigation to ReceptionClientProfile completed');
                      } catch (error) {
                        console.error('❌ Navigation failed:', error);
                        alert('Navigation Error: Failed to open client profile');
                      }
                    } else {
                      console.error('❌ Navigation object not available');
                      alert('Navigation Error: Navigation not available');
                    }
                  } else if (activity.type === 'booking' && activity.classId) {
                    // Navigate to class management for booking activities without user info
                    console.log('Navigating to class management for classId:', activity.classId);
                    onNavigate('ClassManagement');
                  } else {
                    // Show activity details for activities without navigation data
                    console.log('Showing activity details for:', activity);
                    alert(`Activity Details:\n${activity.text}\n\nTime: ${activity.time}`);
                  }
                }}
                >
                  <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                    <WebCompatibleIcon name={activity.icon as any} size={20} color={activity.color} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.text}</Text>
                    <View style={styles.activityMeta}>
                      <View style={[styles.activityType, { backgroundColor: `${activity.color}20` }]}>
                        <Text style={[styles.activityTypeText, { color: activity.color }]}>
                          {activity.type === 'subscription' ? '💳 Subscription' : 
                           activity.type === 'client' ? '👤 New Client' :
                           activity.type === 'booking' ? '📅 Booking' :
                           activity.type === 'cancellation' ? '❌ Cancellation' : 
                           activity.type === 'notification' ? '🔔 Notification' : activity.type}
                        </Text>
                      </View>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                  <WebCompatibleIcon name="chevron-right" size={16} color="#9B8A7D" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <WebCompatibleIcon name="schedule" size={48} color="#9B8A7D" />
                <Text style={styles.emptyActivityText}>No recent activity</Text>
                <Text style={styles.emptyActivitySubtext}>
                  Activities will appear here as they happen
                </Text>
              </View>
            )}
            
            {/* Load More Button */}
            {hasMoreActivities && (
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={handleLoadMoreActivities}
                disabled={loadingMoreActivities}
              >
                <WebCompatibleIcon 
                  name={loadingMoreActivities ? "hourglass-empty" : "add"} 
                  size={20} 
                  color={loadingMoreActivities ? "#9CA3AF" : "#9B8A7D"} 
                />
                <Text style={[styles.loadMoreText, loadingMoreActivities && styles.loadMoreTextDisabled]}>
                  {loadingMoreActivities ? 'Loading...' : `Load More (${filteredActivity.length - displayedActivities.length} remaining)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>

      {/* Bottom padding for scroll */}
      <View style={styles.bottomPadding} />

      {/* Client Modal */}
      <Portal>
        <Modal
          visible={clientModalVisible}
          onDismiss={() => setClientModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="people" size={24} color="#2196F3" />
                </View>
                <Text style={styles.modalTitle}>
                  {selectedClass?.name || 'Class'} - Client List
                </Text>
                <TouchableOpacity 
                  onPress={() => setClientModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              {selectedClass && (
                <View style={styles.clientModalContent}>
                  {/* Class Info */}
                  <View style={styles.classInfoCard}>
                    <Text style={styles.classInfoTitle}>Class Information</Text>
                    <View style={styles.classInfoGrid}>
                      <View style={styles.classInfoItem}>
                        <Text style={styles.classInfoLabel}>Date & Time:</Text>
                        <Text style={styles.classInfoValue}>
                          {selectedClass.date} at {selectedClass.time || 'No time'}
                        </Text>
                      </View>
                                             <View style={styles.classInfoItem}>
                         <Text style={styles.classInfoLabel}>Instructor:</Text>
                         <Text style={styles.classInfoValue}>
                           {selectedClass.instructorDetails?.name || selectedClass.instructor_name || 'No instructor'}
                         </Text>
                       </View>
                      <View style={styles.classInfoItem}>
                        <Text style={styles.classInfoLabel}>Capacity:</Text>
                        <Text style={styles.classInfoValue}>
                          {selectedClass.confirmedBookings || 0}/{selectedClass.max_capacity || selectedClass.capacity || 8}
                        </Text>
                      </View>
                      <View style={styles.classInfoItem}>
                        <Text style={styles.classInfoLabel}>Waitlist:</Text>
                        <Text style={styles.classInfoValue}>
                          {selectedClass.waitlistCount || 0}
                        </Text>
                      </View>
                      <View style={styles.classInfoItem}>
                        <Text style={styles.classInfoLabel}>Instructor:</Text>
                        <Text style={styles.classInfoValue}>
                          {selectedClass.instructorDetails?.name || selectedClass.instructor_name || 'No instructor'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Confirmed Clients */}
                  {selectedClass.confirmedClients && selectedClass.confirmedClients.length > 0 && (
                    <View style={styles.clientSection}>
                      <Text style={styles.clientSectionTitle}>
                        ✅ Confirmed Clients ({selectedClass.confirmedClients.length})
                      </Text>
                      <View style={styles.clientList}>
                        {selectedClass.confirmedClients.map((client: any, index: number) => (
                          <View key={client.id || index} style={styles.clientItem}>
                            <View style={styles.clientAvatar}>
                              <WebCompatibleIcon name="person" size={20} color="#4CAF50" />
                            </View>
                            <View style={styles.clientInfo}>
                              <Text style={styles.clientName}>{client.name}</Text>
                              <Text style={styles.clientEmail}>{client.email}</Text>
                            </View>
                            <View style={styles.clientStatus}>
                              <Text style={styles.confirmedStatus}>Confirmed</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Waitlist Clients */}
                  {selectedClass.waitlistClients && selectedClass.waitlistClients.length > 0 && (
                    <View style={styles.clientSection}>
                      <Text style={styles.clientSectionTitle}>
                        ⏳ Waitlist Clients ({selectedClass.waitlistClients.length})
                      </Text>
                      <View style={styles.clientList}>
                        {selectedClass.waitlistClients.map((client: any, index: number) => (
                          <View key={client.id || index} style={styles.clientItem}>
                            <View style={styles.clientAvatar}>
                              <WebCompatibleIcon name="person" size={20} color="#FF9800" />
                            </View>
                            <View style={styles.clientInfo}>
                              <Text style={styles.clientName}>{client.name}</Text>
                              <Text style={styles.clientEmail}>{client.email}</Text>
                            </View>
                            <View style={styles.clientStatus}>
                              <Text style={styles.waitlistStatus}>Waitlist</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* No Clients Message */}
                  {(!selectedClass.confirmedClients || selectedClass.confirmedClients.length === 0) && 
                   (!selectedClass.waitlistClients || selectedClass.waitlistClients.length === 0) && (
                    <View style={styles.noClientsMessage}>
                      <WebCompatibleIcon name="people-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.noClientsText}>No clients registered for this class</Text>
                      <Text style={styles.noClientsSubtext}>
                        Clients will appear here once they book or join the waitlist
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setClientModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Subscriptions Ending Soon Modal */}
      <Portal>
        <Modal
          visible={subscriptionsEndingModalVisible}
          onDismiss={() => setSubscriptionsEndingModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="schedule" size={24} color="#FF9800" />
                </View>
                <Text style={styles.modalTitle}>
                  Subscriptions Ending Soon
                  {subscriptionsEndingSoon.length > 0 && (
                    <Text style={styles.modalSubtitle}>
                      {'\n'}(Within next 10 days)
                    </Text>
                  )}
                </Text>
                <TouchableOpacity 
                  onPress={() => setSubscriptionsEndingModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
                            <View style={styles.subscriptionsEndingContent}>
                {subscriptionsEndingSoon.length > 0 ? (
                  <>
                    {/* Summary stats */}
                    <View style={styles.modalSummary}>
                      <View style={styles.modalSummaryItem}>
                        <Text style={styles.modalSummaryNumber}>{subscriptionsEndingSoon.length}</Text>
                        <Text style={styles.modalSummaryLabel}>Total Expiring</Text>
                      </View>
                      <View style={styles.modalSummaryItem}>
                        <Text style={styles.modalSummaryNumber}>
                          {subscriptionsEndingSoon.filter(s => {
                            const days = Math.ceil((new Date(s.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return days <= 7;
                          }).length}
                        </Text>
                        <Text style={styles.modalSummaryLabel}>This Week</Text>
                      </View>
                      <View style={styles.modalSummaryItem}>
                        <Text style={styles.modalSummaryNumber}>
                          ${subscriptionsEndingSoon.reduce((total, s) => total + (s.plan_price || 0), 0).toFixed(0)}
                        </Text>
                        <Text style={styles.modalSummaryLabel}>Monthly Revenue</Text>
                      </View>
                    </View>

                    {/* Subscription list */}
                    <ScrollView style={styles.subscriptionsList} showsVerticalScrollIndicator={true}>
                      {subscriptionsEndingSoon.map((subscription, index) => {
                        const daysUntilExpiry = Math.ceil(
                          (new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        
                        const urgencyLevel = daysUntilExpiry <= 7 ? 'critical' : 
                                           daysUntilExpiry <= 14 ? 'warning' : 'normal';
                        
                         return (
                           <TouchableOpacity 
                             key={subscription.id || index} 
                             style={[
                               styles.subscriptionItem,
                               urgencyLevel === 'critical' && styles.subscriptionItemCritical,
                               urgencyLevel === 'warning' && styles.subscriptionItemWarning
                             ]}
                             onPress={() => {
                               // Navigate to client profile
                               if (subscription.user_id && navigation && navigation.navigate) {
                                 const userName = subscription.user_name || 'Unknown Client';
                                 try {
                                   navigation.navigate('ClientProfile', { 
                                     userId: subscription.user_id.toString(), 
                                     userName: userName 
                                   });
                                   setSubscriptionsEndingModalVisible(false);
                                 } catch (error) {
                                   console.error('Navigation failed:', error);
                                 }
                               }
                             }}
                           >
                             <View style={[
                               styles.subscriptionAvatar,
                               urgencyLevel === 'critical' && { backgroundColor: '#FFEBEE' },
                               urgencyLevel === 'warning' && { backgroundColor: '#FFF3E0' }
                             ]}>
                               <WebCompatibleIcon 
                                 name={urgencyLevel === 'critical' ? "warning" : "person"} 
                                 size={20} 
                                 color={urgencyLevel === 'critical' ? '#F44336' : '#FF9800'} 
                               />
                             </View>
                             <View style={styles.subscriptionInfo}>
                               <Text style={styles.subscriptionClientName}>
                                 {subscription.user_name}
                               </Text>
                               <Text style={styles.subscriptionEmail}>
                                 {subscription.user_email}
                               </Text>
                               <View style={styles.subscriptionPlanRow}>
                                 <Text style={styles.subscriptionPlanName}>
                                   {subscription.plan_name}
                                 </Text>
                                 {subscription.plan_price > 0 && (
                                   <Text style={styles.subscriptionPrice}>
                                     ${subscription.plan_price}/mo
                                   </Text>
                                 )}
                               </View>
                               <Text style={styles.subscriptionEndDate}>
                                 Ends: {new Date(subscription.end_date).toLocaleDateString('en-US', {
                                   weekday: 'short',
                                   month: 'short', 
                                   day: 'numeric',
                                   year: 'numeric'
                                 })}
                               </Text>
                               {subscription.equipment_access && subscription.equipment_access !== 'unknown' && (
                                 <Text style={styles.subscriptionEquipment}>
                                   Access: {subscription.equipment_access.charAt(0).toUpperCase() + subscription.equipment_access.slice(1)}
                                 </Text>
                               )}
                             </View>
                             <View style={styles.subscriptionStatus}>
                               <View style={[
                                 styles.expiryBadge,
                                 { backgroundColor: urgencyLevel === 'critical' ? '#FFEBEE' : 
                                                   urgencyLevel === 'warning' ? '#FFF3E0' : '#F3F4F6' }
                               ]}>
                                 <Text style={[
                                   styles.expiryWarning,
                                   { color: urgencyLevel === 'critical' ? '#F44336' : 
                                           urgencyLevel === 'warning' ? '#FF9800' : '#FFC107' }
                                 ]}>
                                   {daysUntilExpiry === 0 ? 'Today' :
                                    daysUntilExpiry === 1 ? 'Tomorrow' :
                                    `${daysUntilExpiry} days`}
                                 </Text>
                               </View>
                               <WebCompatibleIcon name="chevron-right" size={16} color="#9CA3AF" />
                             </View>
                           </TouchableOpacity>
                         );
                       })}
                     </ScrollView>
                  </>
                ) : (
                  <View style={styles.noSubscriptionsMessage}>
                    <WebCompatibleIcon name="check-circle" size={48} color="#4CAF50" />
                    <Text style={styles.noSubscriptionsText}>No subscriptions ending soon</Text>
                    <Text style={styles.noSubscriptionsSubtext}>
                      All active subscriptions are valid for more than 10 days
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setSubscriptionsEndingModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Active Subscriptions Modal */}
      <Portal>
        <Modal
          visible={activeSubscriptionsModalVisible}
          onDismiss={() => setActiveSubscriptionsModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="card-membership" size={24} color="#9C27B0" />
                </View>
                <Text style={styles.modalTitle}>
                  Active Subscriptions
                  {activeSubscriptionsList.length > 0 && (
                    <Text style={styles.modalSubtitle}>
                      {'\n'}({activeSubscriptionsList.length} active plans)
                    </Text>
                  )}
                </Text>
                <TouchableOpacity 
                  onPress={() => setActiveSubscriptionsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.subscriptionsEndingContent}>
                {activeSubscriptionsList.length > 0 ? (
                  <>
                    {/* Summary stats */}
                    <View style={styles.modalSummary}>
                      <View style={styles.modalSummaryItem}>
                        <Text style={styles.modalSummaryNumber}>{activeSubscriptionsList.length}</Text>
                        <Text style={styles.modalSummaryLabel}>Total Active</Text>
                      </View>
                      <View style={styles.modalSummaryItem}>
                        <Text style={styles.modalSummaryNumber}>
                          {[...new Set(activeSubscriptionsList.map(s => s.plan_name))].length}
                        </Text>
                        <Text style={styles.modalSummaryLabel}>Different Plans</Text>
                      </View>
                      <View style={styles.modalSummaryItem}>
                        <Text style={styles.modalSummaryNumber}>
                          ${activeSubscriptionsList.reduce((total, s) => total + (s.plan_price || 0), 0).toFixed(0)}
                        </Text>
                        <Text style={styles.modalSummaryLabel}>Monthly Revenue</Text>
                      </View>
                    </View>

                    {/* Active subscriptions list */}
                    <ScrollView style={styles.subscriptionsList} showsVerticalScrollIndicator={true}>
                      {activeSubscriptionsList.map((subscription, index) => {
                        const startDate = new Date(subscription.start_date);
                        const endDate = new Date(subscription.end_date);
                        const daysRemaining = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <TouchableOpacity 
                            key={subscription.id || index} 
                            style={styles.subscriptionItem}
                            onPress={() => {
                              // Navigate to client profile
                              if (subscription.user_id && navigation && navigation.navigate) {
                                const userName = subscription.user_name || 'Unknown Client';
                                try {
                                  navigation.navigate('ClientProfile', { 
                                    userId: subscription.user_id.toString(), 
                                    userName: userName 
                                  });
                                  setActiveSubscriptionsModalVisible(false);
                                } catch (error) {
                                  console.error('Navigation failed:', error);
                                }
                              }
                            }}
                          >
                            <View style={styles.subscriptionAvatar}>
                              <WebCompatibleIcon name="person" size={20} color="#9C27B0" />
                            </View>
                            <View style={styles.subscriptionInfo}>
                              <Text style={styles.subscriptionClientName}>
                                {subscription.user_name}
                              </Text>
                              <Text style={styles.subscriptionEmail}>
                                {subscription.user_email}
                              </Text>
                              <View style={styles.subscriptionPlanRow}>
                                <Text style={styles.subscriptionPlanName}>
                                  {subscription.plan_name}
                                </Text>
                                {subscription.plan_price > 0 && (
                                  <Text style={styles.subscriptionPrice}>
                                    ${subscription.plan_price}/mo
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.subscriptionEndDate}>
                                Expires: {endDate.toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </Text>
                              {subscription.equipment_access && subscription.equipment_access !== 'unknown' && (
                                <Text style={styles.subscriptionEquipment}>
                                  Access: {subscription.equipment_access.charAt(0).toUpperCase() + subscription.equipment_access.slice(1)}
                                </Text>
                              )}
                              {subscription.remaining_classes !== undefined && (
                                <Text style={styles.subscriptionRemainingClasses}>
                                  Remaining: {subscription.remaining_classes} classes
                                </Text>
                              )}
                            </View>
                            <View style={styles.subscriptionStatus}>
                              <View style={[
                                styles.expiryBadge,
                                { backgroundColor: daysRemaining <= 10 ? '#FFF3E0' : '#E8F5E8' }
                              ]}>
                                <Text style={[
                                  styles.expiryWarning,
                                  { color: daysRemaining <= 10 ? '#FF9800' : '#4CAF50' }
                                ]}>
                                  {daysRemaining <= 0 ? 'Expired' :
                                   daysRemaining === 1 ? '1 day left' :
                                   `${daysRemaining} days left`}
                                </Text>
                              </View>
                              <WebCompatibleIcon name="chevron-right" size={16} color="#9CA3AF" />
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.noSubscriptionsMessage}>
                    <WebCompatibleIcon name="card-membership" size={48} color="#9CA3AF" />
                    <Text style={styles.noSubscriptionsText}>No active subscriptions</Text>
                    <Text style={styles.noSubscriptionsSubtext}>
                      Active subscriptions will appear here once clients sign up for plans
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => setActiveSubscriptionsModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Clients Without Active Subscriptions Modal */}
      <Portal>
        <Modal
          visible={clientsWithoutSubsModalVisible}
          onDismiss={() => setClientsWithoutSubsModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="person-remove" size={24} color="#F44336" />
                </View>
                <Text style={styles.modalTitle}>
                  Clients Without Active Subscriptions
                  {clientsWithoutSubscriptions.length > 0 && (
                    <Text style={styles.modalSubtitle}>
                      {'\n'}({clientsWithoutSubscriptions.length} clients found)
                    </Text>
                  )}
                </Text>
                <TouchableOpacity 
                  onPress={() => setClientsWithoutSubsModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.subscriptionsEndingContent}>
                {clientsWithoutSubscriptions.length > 0 ? (
                  <ScrollView style={styles.subscriptionsList} showsVerticalScrollIndicator={true}>
                    {clientsWithoutSubscriptions.map((client, index) => (
                      <View key={client.id} style={styles.subscriptionItem}>
                        <View style={styles.subscriptionItemHeader}>
                          <View style={styles.subscriptionItemInfo}>
                            <Text style={styles.subscriptionItemClient}>{client.name}</Text>
                            <Text style={styles.subscriptionItemPlan}>Never had a subscription</Text>
                            <Text style={styles.subscriptionItemEmail}>{client.email}</Text>
                            {client.phone && (
                              <Text style={styles.subscriptionItemDate}>📞 {client.phone}</Text>
                            )}
                            <Text style={styles.subscriptionItemDate}>
                              Joined: {new Date(client.join_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.subscriptionItemButton}
                            onPress={() => {
                              try {
                                if (navigation?.navigate) {
                                  navigation.navigate('ClientProfile', { 
                                    userId: client.id,
                                    userName: client.name 
                                  });
                                  setClientsWithoutSubsModalVisible(false);
                                } else {
                                  console.error('Navigation failed: No navigation object');
                                }
                              } catch (navError) {
                                console.error('Navigation failed:', navError);
                              }
                            }}
                          >
                            <Text style={styles.subscriptionItemButtonText}>View Profile</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noSubscriptionsMessage}>
                    <WebCompatibleIcon name="person-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.noSubscriptionsText}>All clients have active subscriptions</Text>
                    <Text style={styles.noSubscriptionsSubtext}>
                      Great! All your clients are actively subscribed to plans
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => setClientsWithoutSubsModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Clients Who Didn't Renew Modal */}
      <Portal>
        <Modal
          visible={clientsWhoDidntRenewModalVisible}
          onDismiss={() => setClientsWhoDidntRenewModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="refresh" size={24} color="#FF9800" />
                </View>
                <Text style={styles.modalTitle}>
                  Clients Who Didn't Renew
                  {clientsWhoDidntRenew.length > 0 && (
                    <Text style={styles.modalSubtitle}>
                      {'\n'}({clientsWhoDidntRenew.length} clients with expired plans)
                    </Text>
                  )}
                </Text>
                <TouchableOpacity 
                  onPress={() => setClientsWhoDidntRenewModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.subscriptionsEndingContent}>
                {clientsWhoDidntRenew.length > 0 ? (
                  <ScrollView style={styles.subscriptionsList} showsVerticalScrollIndicator={true}>
                    {clientsWhoDidntRenew.map((client, index) => (
                      <View key={client.id} style={styles.subscriptionItem}>
                        <View style={styles.subscriptionItemHeader}>
                          <View style={styles.subscriptionItemInfo}>
                            <Text style={styles.subscriptionItemClient}>{client.name}</Text>
                            {client.last_subscription ? (
                              <>
                                <Text style={styles.subscriptionItemPlan}>
                                  Last Plan: {client.last_subscription.plan_name}
                                </Text>
                                <Text style={styles.subscriptionItemDate}>
                                  Expired: {new Date(client.last_subscription.end_date).toLocaleDateString()}
                                </Text>
                                <Text style={styles.subscriptionItemStatus}>
                                  Status: {client.last_subscription.status}
                                </Text>
                              </>
                            ) : (
                              <Text style={styles.subscriptionItemPlan}>No previous subscription found</Text>
                            )}
                            <Text style={styles.subscriptionItemEmail}>{client.email}</Text>
                            {client.phone && (
                              <Text style={styles.subscriptionItemDate}>📞 {client.phone}</Text>
                            )}
                          </View>
                          <TouchableOpacity 
                            style={styles.subscriptionItemButton}
                            onPress={() => {
                              try {
                                if (navigation?.navigate) {
                                  navigation.navigate('ClientProfile', { 
                                    userId: client.id,
                                    userName: client.name 
                                  });
                                  setClientsWhoDidntRenewModalVisible(false);
                                } else {
                                  console.error('Navigation failed: No navigation object');
                                }
                              } catch (navError) {
                                console.error('Navigation failed:', navError);
                              }
                            }}
                          >
                            <Text style={styles.subscriptionItemButtonText}>View Profile</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.noSubscriptionsMessage}>
                    <WebCompatibleIcon name="replay" size={48} color="#9CA3AF" />
                    <Text style={styles.noSubscriptionsText}>All clients renewed their subscriptions</Text>
                    <Text style={styles.noSubscriptionsSubtext}>
                      Excellent! All clients with previous subscriptions have renewed
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => setClientsWhoDidntRenewModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>
    </>
  );
}

// PC Sidebar Navigation with real data badges
function ReceptionSidebar({ activeScreen, onNavigate, stats, onOpenAnnouncements, onOpenThemeSwitch }: any) {
  const menuItems = [
    { key: 'Dashboard', icon: 'dashboard', label: 'Dashboard', badge: null },
    { key: 'Clients', icon: 'people', label: 'Client Management', badge: stats?.totalClients?.toString() || '0' },
    { key: 'Classes', icon: 'fitness-center', label: 'Class Management', badge: stats?.todayClasses?.toString() || '0' },
    { key: 'Plans', icon: 'card-membership', label: 'Subscription Plans', badge: null },
    { key: 'Reports', icon: 'assessment', label: 'Reports & Analytics', badge: null },
  ];

  const specialItems = [
    { key: 'Announcements', icon: 'campaign', label: 'Manage Announcements', badge: null, action: onOpenAnnouncements },
    { key: 'SwitchTheme', icon: 'color-lens', label: 'Manage Client Themes', badge: null, action: onOpenThemeSwitch },
  ];

  // Add back button when viewing client profile
  const displayMenuItems = activeScreen === 'ClientProfile' 
    ? [{ key: 'BackToDashboard', icon: 'arrow-back', label: '← Back to Dashboard', badge: null }, ...menuItems]
    : menuItems;

  return (
    <View style={styles.sidebar}>
      {/* Sidebar Header */}
      <View style={styles.sidebarHeader}>
        <View style={styles.logoContainer}>
          <WebCompatibleIcon name="business" size={32} color="#9B8A7D" />
          <View>
            <Text style={styles.sidebarTitle}>Reception</Text>
            <Text style={styles.sidebarSubtitle}>Management Portal</Text>
          </View>
        </View>
      </View>
      
      {/* Navigation Menu */}
      <ScrollView style={styles.sidebarMenu}>
        {displayMenuItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.sidebarItem,
              activeScreen === item.key && styles.sidebarItemActive
            ]}
            onPress={() => onNavigate(item.key === 'BackToDashboard' ? 'Dashboard' : item.key)}
          >
            <WebCompatibleIcon 
              name={item.icon as any} 
              size={24} 
              color={activeScreen === item.key ? '#fff' : '#9B8A7D'} 
            />
            <View style={styles.sidebarItemContent}>
              <Text style={[
                styles.sidebarItemText,
                activeScreen === item.key && styles.sidebarItemTextActive
              ]}>
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.sidebarBadge}>
                  <Text style={styles.sidebarBadgeText}>{item.badge}</Text>
                </View>
              )}
            </View>
            {activeScreen === item.key && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        ))}

        {/* Specials Section */}
        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarSectionTitle}>Specials</Text>
          {specialItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.sidebarItem}
              onPress={item.action}
            >
              <WebCompatibleIcon 
                name={item.icon as any} 
                size={24} 
                color="#9B8A7D" 
              />
              <View style={styles.sidebarItemContent}>
                <Text style={styles.sidebarItemText}>
                  {item.label}
                </Text>
                {item.badge && (
                  <View style={styles.sidebarBadge}>
                    <Text style={styles.sidebarBadgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sidebar Footer */}
      <View style={styles.sidebarFooter}>
        <TouchableOpacity style={styles.helpButton}>
          <WebCompatibleIcon name="help-outline" size={20} color="#9B8A7D" />
          <Text style={styles.helpText}>Help & Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}



// Wrapper components to handle navigation properly
function ClientsScreen({ navigation, onViewProfile }: any) {
  // Add auth state debugging
  const authState = useSelector((state: RootState) => state.auth);
  
  const handleViewProfile = (userId: string, userName: string, userRole?: string) => {
    console.log('🔍 ClientsScreen received profile view request:', { userId, userName, userRole });
    console.log('🔍 Auth state when clicking view profile:', {
      isLoggedIn: authState.isLoggedIn,
      userExists: !!authState.user,
      userRole: authState.user?.role,
      tokenExists: !!authState.token
    });
    
    // Prioritize React Navigation over custom callback for proper routing
    if (navigation && navigation.navigate) {
      console.log('🔍 Using React Navigation (preferred)');
      try {
        // Route to appropriate profile based on user role
        if (userRole === 'instructor') {
          navigation.navigate('InstructorProfile', { userId, userName });
        } else {
          navigation.navigate('ClientProfile', { userId, userName });
        }
        console.log('✅ Navigation call completed successfully');
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        // Fallback to custom callback if navigation fails
        if (onViewProfile) {
          console.log('🔍 Falling back to reception onViewProfile callback');
          onViewProfile(userId, userName, userRole);
        }
      }
    } else if (onViewProfile) {
      console.log('🔍 Using reception onViewProfile callback (fallback)');
      onViewProfile(userId, userName, userRole);
    } else {
      console.error('❌ No navigation method available');
    }
  };
  
  console.log('👥 ClientsScreen rendering with navigation:', !!navigation);
  return <PCUserManagement navigation={navigation} onViewProfile={handleViewProfile} hideAdminUsers={true} />;
}

function ClassesScreen({ navigation }: any) {
  return <PCClassManagement />;
}

function PlansScreen({ navigation }: any) {
  return <PCSubscriptionPlans />;
}

// Main PC Layout Container
function ReceptionPCLayout({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [activeScreen, setActiveScreen] = useState('Dashboard');
  const [navigationParams, setNavigationParams] = useState<any>(null);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));
  
  // Announcement states
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementModalVisible, setAnnouncementModalVisible] = useState(false);
  
  // Theme colors
  const backgroundColor = '#FFFFFF'; // Default background
  const surfaceColor = '#FFFFFF'; // Default surface
  const textColor = '#1A1A1A'; // Default text
  const textSecondaryColor = '#666666'; // Default secondary text
  const primaryColor = '#E91E63'; // Default primary (pink)
  
  // Theme management states (for managing client themes from reception)
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  
  // Form states for announcements
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'urgent'>('info');
  
  const [stats, setStats] = useState({
    totalClients: 0,
    todayClasses: 0,
    pendingBookings: 0,
    activeSubscriptions: 0,
    subscriptionsEndingSoon: 0
  });
  

  
  // Modal states
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  
  // Waitlist modal states
  const [waitlistModalVisible, setWaitlistModalVisible] = useState(false);
  const [waitlistModalData, setWaitlistModalData] = useState<any[]>([]);
  const [waitlistModalTitle, setWaitlistModalTitle] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);

  const [notificationSettings, setNotificationSettings] = useState({
    enableNotifications: true,
    defaultReminderMinutes: 5,
    enablePushNotifications: true,
    enableEmailNotifications: true
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  // Load announcements
  useEffect(() => {
    loadAnnouncements();
    
    // Set up auto-refresh every 2 minutes
    const interval = setInterval(() => {
      loadAnnouncements();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load announcements only
  const loadAnnouncements = async () => {
    try {
      const announcementsData = await announcementService.getActiveAnnouncements();
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  // Helper functions for announcements and themes
  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;

    try {
      await announcementService.createAnnouncement({
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        type: announcementType,
      });
      
      // Reset form and refresh
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementType('info');
      setAnnouncementModalVisible(false);
      await loadAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  // Theme management functions (for managing client app themes)
  const handleSwitchTheme = async (themeName: string) => {
    try {
      console.log('🎨 Reception: Switching client app theme to:', themeName);
      
      if (themeName === 'default') {
        // For default theme, activate the actual "default" theme record in the database
        console.log('🎨 Reception: Activating default theme record in database');
        await themeService.switchTheme('default');
      } else {
        // Switch to specific theme
        await themeService.switchTheme(themeName);
      }
      
      console.log('✅ Reception: Successfully switched client theme');
      setThemeModalVisible(false);
    } catch (error) {
      console.error('❌ Reception: Error switching client theme:', error);
    }
  };

  const handleWaitlistClick = () => {
    // This function is implemented in the ReceptionDashboard component
    // and will be called when the waitlist number is clicked
  };

  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'warning': return 'alert-circle';
      case 'urgent': return 'alert-octagon';
      default: return 'information';
    }
  };

  const getAnnouncementColor = (type: string) => {
    switch (type) {
      case 'warning': return '#FF9800';
      case 'urgent': return '#f44336';
      default: return '#2196F3';
    }
  };

  const handleNavigate = (screenKey: string, params?: any) => {
    console.log('🏢 Reception navigating to:', screenKey, 'with params:', params);
    setActiveScreen(screenKey);
    if (params) {
      setNavigationParams(params);
    }
  };

  const renderMainContent = () => {
    
    switch (activeScreen) {
      case 'Clients':

        return <ClientsScreen navigation={navigation} />;
      case 'Classes':

        return <ClassesScreen navigation={navigation} />;
      case 'Plans':

        return <PCSubscriptionPlans />;
      case 'Reports':

        return <ReceptionReports />;
      case 'ClientProfile':

        return (
          <MockNavigationProvider 
            mockRoute={{
              params: {
                userId: navigationParams?.userId || null,
                userName: navigationParams?.userName || 'Unknown Client'
              }
            }}
            mockNavigation={{
              navigate: (screen: string, params?: any) => {
                console.log('Mock navigation to:', screen, params);
                handleNavigate(screen, params);
              },
              goBack: () => {
                console.log('Mock navigation goBack');
                handleNavigate('Dashboard');
              }
            }}
          >
            <NavigationWrappedClientProfile />
          </MockNavigationProvider>
        );
      case 'Dashboard':
      default:

        return (
          <ReceptionDashboard 
            navigation={navigation} 
            onNavigate={handleNavigate}
            onStatsUpdate={(newStats: any) => setStats(newStats)}
            waitlistModalVisible={waitlistModalVisible}
            setWaitlistModalVisible={setWaitlistModalVisible}
            waitlistModalData={waitlistModalData}
            setWaitlistModalData={setWaitlistModalData}
            waitlistModalTitle={waitlistModalTitle}
            setWaitlistModalTitle={setWaitlistModalTitle}
            onWaitlistClick={handleWaitlistClick}
            onWaitlistDataUpdate={(data: any, filter: string) => {
              // This will be called from ReceptionDashboard to update waitlist data
              setWaitlistModalData(data);
              setWaitlistModalTitle(filter);
            }}
            onOpenThemeSwitch={() => setThemeModalVisible(true)}
            currentUser={currentUser}
          />
        );
    }
  };

  // Handle logout
  const handleLogout = async () => {
    console.log('🚪 Reception user logging out...');
    setLogoutModalVisible(false);
    await dispatch(logoutUser());
  };

  const showLogoutConfirmation = () => {
    console.log('🚪 Showing logout confirmation...');
    setLogoutModalVisible(true);
  };

  // Use mobile layout if screen is too small
  if (screenDimensions.width < 1024) {
    return (
      <View style={styles.mobileContainer}>
        <Text style={styles.mobileWarning}>
          📱 Reception Portal is optimized for desktop use. 
          Please use a larger screen for the best experience.
        </Text>
        {renderMainContent()}
      </View>
    );
  }

  return (
    <View style={styles.pcContainer}>
      <ReceptionSidebar 
        activeScreen={activeScreen} 
        onNavigate={handleNavigate}
        stats={stats}
        onOpenAnnouncements={() => setAnnouncementModalVisible(true)}
        onOpenThemeSwitch={() => setThemeModalVisible(true)}
      />
      <View style={styles.mainContent}>
        <View style={styles.contentHeader}>
          <View style={styles.titleSection}>
            <Text style={styles.contentTitle}>
              {activeScreen === 'Clients' 
                ? 'User Management'
                : activeScreen}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Notification Button */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => setNotificationModalVisible(true)}
            >
              <WebCompatibleIcon name="notifications" size={24} color="#9B8A7D" />
              {notifications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Logout Button */}
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={showLogoutConfirmation}
            >
              <WebCompatibleIcon name="logout" size={24} color="#d32f2f" />
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView 
          style={styles.contentBody}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Active Announcements Banner */}
          {announcements.length > 0 && (
            <View style={[styles.announcementBanner, { backgroundColor: surfaceColor, borderLeftColor: primaryColor }]}>
              <Text style={[styles.bannerTitle, { color: textColor }]}>📢 Active Announcements</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {announcements.map((announcement) => (
                  <View key={announcement.id} style={[styles.announcementCard, { backgroundColor: surfaceColor, borderLeftColor: getAnnouncementColor(announcement.type) }]}>
                    <View style={styles.announcementHeader}>
                      <WebCompatibleIcon 
                        name={getAnnouncementIcon(announcement.type)} 
                        size={16} 
                        color={getAnnouncementColor(announcement.type)} 
                      />
                      <Text style={[styles.announcementTitle, { color: textColor }]}>{announcement.title}</Text>
                    </View>
                    <Text style={[styles.announcementMessage, { color: textSecondaryColor }]}>{announcement.message}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {renderMainContent()}
        </ScrollView>
      </View>

      {/* Logout Confirmation Modal */}
      <Portal>
        <Modal
          visible={logoutModalVisible}
          onDismiss={() => setLogoutModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="logout" size={24} color="#d32f2f" />
                </View>
                <Text style={styles.modalTitle}>Logout</Text>
                <TouchableOpacity 
                  onPress={() => setLogoutModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.logoutModalContent}>
                <Text style={styles.logoutModalMessage}>
                  Are you sure you want to logout from the reception portal?
                </Text>
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setLogoutModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleLogout}
                  style={styles.logoutConfirmButton}
                >
                  <Text style={styles.logoutConfirmButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Notification Modal */}
      <Portal>
        <Modal
          visible={notificationModalVisible}
          onDismiss={() => setNotificationModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="notifications" size={24} color="#9B8A7D" />
                </View>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity 
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.notificationModalContent}>
                {notifications.length > 0 ? (
                  <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={true}>
                    {notifications.map((notification, index) => (
                      <View key={index} style={styles.notificationItem}>
                        <View style={styles.notificationIcon}>
                          <WebCompatibleIcon name="info" size={16} color="#2196F3" />
                        </View>
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationTitle}>System Notification</Text>
                          <Text style={styles.notificationText}>{notification.message || 'New activity in the system'}</Text>
                          <Text style={styles.notificationTime}>Just now</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyNotifications}>
                    <WebCompatibleIcon name="notifications" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyNotificationsText}>No new notifications</Text>
                    <Text style={styles.emptyNotificationsSubtext}>
                      You'll see important updates here when they arrive
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Close</Text>
                </TouchableOpacity>
                {notifications.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      setNotifications([]);
                      setNotificationModalVisible(false);
                    }}
                    style={styles.clearNotificationsButton}
                  >
                    <Text style={styles.clearNotificationsButtonText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

      {/* Announcement Management Modal */}
      <Portal>
        <Modal
          visible={announcementModalVisible}
          onDismiss={() => setAnnouncementModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Announcements</Text>
            
            {/* Create Announcement Form */}
            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Create New Announcement</Text>
              
              <TextInput
                style={styles.formInput}
                placeholder="Announcement title..."
                value={announcementTitle}
                onChangeText={setAnnouncementTitle}
                mode="outlined"
              />
              
              <TextInput
                style={[styles.formInput, styles.multilineInput]}
                placeholder="Announcement message..."
                value={announcementMessage}
                onChangeText={setAnnouncementMessage}
                mode="outlined"
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.typeSelection}>
                <Text style={styles.typeLabel}>Type:</Text>
                {['info', 'warning', 'urgent'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      announcementType === type && styles.typeOptionSelected
                    ]}
                    onPress={() => setAnnouncementType(type as 'info' | 'warning' | 'urgent')}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      announcementType === type && styles.typeOptionTextSelected
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateAnnouncement}
                disabled={!announcementTitle.trim() || !announcementMessage.trim()}
              >
                <Text style={styles.createButtonText}>Create Announcement</Text>
              </TouchableOpacity>
            </View>
            
            {/* Current Announcements */}
            <View style={styles.currentSection}>
              <Text style={styles.formTitle}>Current Announcements</Text>
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <View key={announcement.id} style={styles.announcementItem}>
                    <View style={styles.announcementItemHeader}>
                      <Text style={styles.announcementItemTitle}>{announcement.title}</Text>
                      <Text style={[styles.announcementItemType, { color: getAnnouncementColor(announcement.type) }]}>
                        {announcement.type.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.announcementItemMessage}>{announcement.message}</Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        announcementService.deleteAnnouncement(announcement.id)
                          .then(() => loadAnnouncements())
                          .catch(console.error);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noAnnouncementsText}>No active announcements</Text>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAnnouncementModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>

      {/* Client Theme Management Modal */}
      <Portal>
        <Modal
          visible={themeModalVisible}
          onDismiss={() => setThemeModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Client App Themes</Text>
            
            <Text style={styles.modalDescription}>
              Switch themes for the client mobile app experience. This will not affect the reception dashboard.
            </Text>
            
            <View style={styles.receptionThemesGrid}>
              {/* Default Theme Option */}
              <TouchableOpacity
                style={[styles.receptionThemeOption]}
                onPress={() => handleSwitchTheme('default')}
              >
                <View style={styles.receptionThemePreview}>
                  <View style={[styles.receptionThemePreviewHeader, { backgroundColor: '#007AFF' }]}>
                    <Text style={[styles.receptionThemePreviewText, { color: '#FFFFFF' }]}>
                      Default Theme
                    </Text>
                  </View>
                  <View style={[styles.receptionThemePreviewContent, { backgroundColor: '#F8F9FA' }]}>
                    <View style={[styles.receptionThemePreviewButton, { backgroundColor: '#4ECDC4' }]}>
                      <Text style={styles.receptionThemePreviewButtonText}>Clean & Simple</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* Predefined Theme Options */}
              {[
                { name: 'womens_day', display: "👩 Women's Day", description: 'Celebration theme' },
                { name: 'christmas', display: '🎄 Christmas', description: 'Holiday festivities' },
                { name: 'eid_mubarak_2025', display: '🕌 Eid Mubarak 2025', description: 'Traditional Islamic celebration' },
                { name: 'ramadan_2025', display: '🌙 Ramadan 2025', description: 'Sacred holy month' },
                { name: 'new_year', display: '🎊 New Year', description: 'New Year celebration' },
                { name: 'pink_october', display: '🌸 Pink October', description: 'Breast Cancer Awareness Month' }
              ].map((theme) => (
                <TouchableOpacity
                  key={theme.name}
                  style={[styles.receptionThemeOption]}
                  onPress={() => handleSwitchTheme(theme.name)}
                >
                  <View style={styles.receptionThemePreview}>
                    <View style={[styles.receptionThemePreviewHeader, { backgroundColor: '#9B8A7D' }]}>
                      <Text style={[styles.receptionThemePreviewText, { color: '#FFFFFF' }]}>
                        {theme.display}
                      </Text>
                    </View>
                    <View style={[styles.receptionThemePreviewContent, { backgroundColor: '#F5F5F5' }]}>
                      <View style={[styles.receptionThemePreviewButton, { backgroundColor: '#D4B08A' }]}>
                        <Text style={styles.receptionThemePreviewButtonText}>{theme.description}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setThemeModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>

      {/* Waitlist Modal */}
      <Portal>
        <Modal
          visible={waitlistModalVisible}
          onDismiss={() => setWaitlistModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <WebCompatibleIcon name="schedule" size={24} color="#FF9800" />
                </View>
                <Text style={styles.modalTitle}>{waitlistModalTitle}</Text>
                <TouchableOpacity 
                  onPress={() => setWaitlistModalVisible(false)}
                  style={styles.closeButton}
                >
                  <WebCompatibleIcon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {waitlistModalData.length === 0 ? (
                  <View style={styles.emptyState}>
                    <WebCompatibleIcon name="check-circle" size={48} color="#4CAF50" />
                    <Text style={styles.emptyStateTitle}>No Waitlist Entries</Text>
                    <Text style={styles.emptyStateText}>
                      No clients currently on waitlist
                    </Text>
                  </View>
                ) : (
                  <View style={styles.waitlistList}>
                    {waitlistModalData.map((waitlistEntry, index) => (
                      <View key={waitlistEntry.id} style={styles.waitlistItem}>
                        <View style={styles.waitlistItemHeader}>
                          <View style={styles.waitlistPosition}>
                            <Text style={styles.waitlistPositionNumber}>#{waitlistEntry.position}</Text>
                          </View>
                          <View style={styles.waitlistClientInfo}>
                            <Text style={styles.waitlistClientName}>
                              {waitlistEntry.users?.name || 'Unknown Client'}
                            </Text>
                            <Text style={styles.waitlistClientEmail}>
                              {waitlistEntry.users?.email || 'No email'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.waitlistClassContainer}>
                          <Text style={styles.waitlistClassName}>
                            {waitlistEntry.classes?.name || 'Unknown Class'}
                          </Text>
                          <Text style={styles.waitlistClassDetails}>
                            {waitlistEntry.classes?.date ? new Date(waitlistEntry.classes.date).toLocaleDateString() : 'No date'} • 
                            {waitlistEntry.classes?.time || 'No time'} • 
                            {waitlistEntry.classes?.equipment_type || 'Unknown equipment'}
                          </Text>
                        </View>
                        <View style={styles.waitlistTimestamp}>
                          <Text style={styles.waitlistTimestampText}>
                            Added: {new Date(waitlistEntry.created_at).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
              
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={() => setWaitlistModalVisible(false)}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Portal>

    </View>
  );
}

// Main Reception Dashboard for Web
function ReceptionDashboardWeb({ navigation }: any) {

  
  return <ReceptionPCLayout navigation={navigation} />;
}

const styles = StyleSheet.create({
  // PC Container
  pcContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    minHeight: '100%',
  },
  
  // Mobile Container
  mobileContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileWarning: {
    fontSize: 16,
    color: '#FF9800',
    textAlign: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },

  // Sidebar Styles
  sidebar: {
    width: 280,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  sidebarHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  sidebarSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  sidebarMenu: {
    flex: 1,
    padding: 16,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderRadius: 8,
    position: 'relative',
  },
  sidebarItemActive: {
    backgroundColor: '#9B8A7D',
  },
  sidebarItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  sidebarItemTextActive: {
    color: '#ffffff',
  },
  sidebarBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sidebarBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sidebarSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sidebarSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  helpText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6B7280',
  },

  // Main Content
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  contentBody: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 40,
    paddingBottom: 120,
  },

  // Dashboard Content
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  dashboardScrollView: {
    flex: 1,
  },
  dashboardScrollContent: {
    padding: 40,
    paddingBottom: 120,
  },
  dashboardHeader: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 40,
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statSubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    backgroundColor: '#FEF2F2',
  },
  statNumberWarning: {
    color: '#F44336',
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    elevation: 3,
    minHeight: 80,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 12,
  },

  // Search Section
  searchSection: {
    marginBottom: 40,
    maxWidth: 800,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginRight: 12,
  },
  searchButton: {
    padding: 12,
    backgroundColor: '#9B8A7D',
    borderRadius: 6,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchResults: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 2,
    maxHeight: 200,
    overflow: 'hidden',
  },
  searchResultsHeader: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  searchResultsTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultInfo: {
    marginLeft: 12,
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchResultEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  searchResultStatus: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },

  // Recent Activity
  recentActivitySection: {
    marginBottom: 32,
    marginTop: 16,
    minHeight: 400,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9B8A7D',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshTextDisabled: {
    color: '#9CA3AF',
  },
  activityCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  activityList: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 2,
    minHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityType: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activityTypeText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyActivity: {
    alignItems: 'center',
    padding: 40,
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },

  // Modal Styles
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalIcon: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: 'normal',
  },
  closeButton: {
    padding: 5,
  },
  logoutModalContent: {
    marginBottom: 20,
  },
  logoutModalMessage: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
  logoutConfirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  logoutConfirmButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },

  bottomPadding: {
    height: 100,
  },

  // ScrollView and Load More styles
  activityScrollContainer: {
    maxHeight: 400,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginTop: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  loadMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9B8A7D',
    fontWeight: '500',
  },
  loadMoreTextDisabled: {
    color: '#9CA3AF',
  },

  // Notification Modal Styles
  notificationModalContent: {
    marginBottom: 20,
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  notificationText: {
    fontSize: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  emptyNotifications: {
    alignItems: 'center',
    padding: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyNotificationsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  clearNotificationsButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  clearNotificationsButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },

  // Stats Section
  statsSection: {
    marginBottom: 32,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveIndicatorText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  statsTimestamp: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  timestampText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Enhanced Class Metrics Section
  classMetricsSection: {
    marginBottom: 32,
  },
  quickSummary: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  summaryItem: {
    flex: 1,
    minWidth: 120,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  classMetricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  classMetricsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  classFilterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  classMetricsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  classMetricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  classMetricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  classMetricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  classMetricNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  classMetricSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  todayClassesDetail: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  classesList: {
    //
  },
  emptyClasses: {
    alignItems: 'center',
    padding: 40,
  },
  emptyClassesText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  classItem: {
    flexDirection: 'column',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fullClassItem: {
    backgroundColor: '#FFFBEB', // Light yellow background for full classes
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B', // Orange border for full classes
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  classTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  classStatus: {
    //
  },
  fullClassBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullClassBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  availableClassBadge: {
    backgroundColor: '#E0F2F7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableClassBadgeText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  classMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  classMetric: {
    alignItems: 'center',
  },
  classMetricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  classMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  capacityBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 10,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  waitlistDetail: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  waitlistList: {
    //
  },
  waitlistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  waitlistInfo: {
    flex: 1,
  },
  waitlistClientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  waitlistClassInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  waitlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  waitlistActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
  },
  waitlistActionText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 5,
  },

  // Debug Section
  debugSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  debugGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  debugItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  debugValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  debugActions: {
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  debugButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  classActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  viewClientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E0F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  viewClientsButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
    marginLeft: 5,
  },
  clientModalContent: {
    padding: 20,
  },
  classInfoCard: {
    marginBottom: 20,
  },
  classInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  classInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  classInfoItem: {
    flex: 1,
    minWidth: 120,
  },
  classInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  classInfoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  clientSection: {
    marginBottom: 15,
  },
  clientSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  clientList: {
    //
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 10,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  clientEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  clientStatus: {
    //
  },
  confirmedStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  waitlistStatus: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  noClientsMessage: {
    alignItems: 'center',
    padding: 40,
  },
  noClientsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  noClientsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Subscriptions Ending Soon Modal Styles
  subscriptionsEndingContent: {
    marginBottom: 20,
    maxHeight: 500,
  },
  modalSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  modalSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  modalSummaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalSummaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  subscriptionsList: {
    maxHeight: 350,
    paddingHorizontal: 4, // Add padding for better scrollbar visibility
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#ffffff',
  },
  subscriptionItemCritical: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
    backgroundColor: '#FFFBFB',
  },
  subscriptionItemWarning: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFFEF7',
  },
  subscriptionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  subscriptionEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  subscriptionPlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subscriptionPlanName: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    flex: 1,
  },
  subscriptionPrice: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subscriptionEndDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  subscriptionEquipment: {
    fontSize: 11,
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  subscriptionRemainingClasses: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  subscriptionStatus: {
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  expiryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  expiryWarning: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  noSubscriptionsMessage: {
    alignItems: 'center',
    padding: 40,
  },
  noSubscriptionsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontWeight: '500',
  },
  noSubscriptionsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },

  // Modal button styles
  modalButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Announcement Banner Styles
  announcementBanner: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  announcementCard: {
    padding: 12,
    marginRight: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    minWidth: 280,
    maxWidth: 320,
    elevation: 1,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  announcementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  announcementMessage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Management Section Styles
  managementSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 1,
  },
  managementRow: {
    flexDirection: 'row',
    gap: 12,
  },
  managementButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  managementButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },

  // Announcement Modal Styles
  formSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  formInput: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  multilineInput: {
    minHeight: 80,
  },
  typeSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 12,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  typeOptionSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  typeOptionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  typeOptionTextSelected: {
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Current Announcements Styles
  currentSection: {
    marginBottom: 24,
  },
  announcementItem: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  announcementItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  announcementItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  announcementItemType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  announcementItemMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  noAnnouncementsText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },

  // Theme Modal Styles
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  themeOption: {
    width: '48%',
    minWidth: 200,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  themeOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  themePreview: {
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 1,
  },
  themePreviewHeader: {
    padding: 8,
    alignItems: 'center',
  },
  themePreviewText: {
    fontSize: 12,
    fontWeight: '600',
  },
  themePreviewContent: {
    padding: 12,
    alignItems: 'center',
  },
  themePreviewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  themePreviewButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  themeOptionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  themeActiveIndicator: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  // New Year Theme Styles
  newYearSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  newYearTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  newYearDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 16,
  },
  newYearButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newYearButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Reception Theme Modal Styles (updated to avoid duplicates)
  receptionThemesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  receptionThemeOption: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  receptionThemePreview: {
    height: 120,
    overflow: 'hidden',
  },
  receptionThemePreviewHeader: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  receptionThemePreviewContent: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  receptionThemePreviewButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  receptionThemePreviewButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  receptionThemePreviewText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  modalCloseButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Subscription modal styles
  subscriptionItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  subscriptionItemInfo: {
    flex: 1,
    marginRight: 16,
  },
  subscriptionItemClient: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subscriptionItemPlan: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  subscriptionItemEmail: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  subscriptionItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  subscriptionItemStatus: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  subscriptionItemButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  subscriptionItemButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Waitlist Modal Styles
  clickableMetricNumber: {
    cursor: 'pointer',
  },
  waitlistItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waitlistPosition: {
    backgroundColor: '#FF9800',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  waitlistPositionNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitlistClientInfo: {
    flex: 1,
  },
  waitlistClientEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  waitlistClassContainer: {
    marginBottom: 8,
  },
  waitlistClassName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  waitlistClassDetails: {
    fontSize: 13,
    color: '#6B7280',
  },
  waitlistTimestamp: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  waitlistTimestampText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  
  // Additional modal styles
  modalBody: {
    maxHeight: 400,
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});

export default ReceptionDashboardWeb;