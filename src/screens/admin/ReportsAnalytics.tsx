import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Caption, Modal, Card as PaperCard, Portal, Text, Title } from 'react-native-paper';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { spacing } from '../../constants/Spacing';

interface OverviewStats {
  totalClients: number;
  activeSubscriptionClients: number;
  clientsWithoutSubscription: number;
  clientsEndingSoon: number;
}

interface BusinessActivity {
  id: string;
  type: 'new_subscription' | 'new_client';
  title: string;
  description: string;
  client_name: string;
  client_id: string;
  created_at: string;
  metadata?: {
    plan_name?: string;
    monthly_price?: number;
    subscription_id?: string;
    client_email?: string;
    client_phone?: string;
  };
}

interface BusinessActivityStats {
  newSubscriptionsToday: number;
  newSubscriptionsWeek: number;
  newClientsToday: number;
  newClientsWeek: number;
  recentActivities: BusinessActivity[];
}

interface ReferralSource {
  source: string;
  count: number;
  percentage: number;
  recent_clients: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    created_at: string;
    subscription_status: 'active' | 'inactive' | 'never_subscribed';
  }>;
}

interface ReferralSourceStats {
  totalClients: number;
  totalWithSources: number;
  totalWithoutSources: number;
  mostPopularSource: string;
  sources: ReferralSource[];
  monthlyTrends: Array<{
    month: string;
    total_clients: number;
    sources: Array<{
      source: string;
      count: number;
    }>;
  }>;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  join_date?: string;
  status: string;
  subscription_info?: any;
}

interface ClientsData {
  newClients: ClientData[];
  neverSubscribed: ClientData[];
  didntRenew: ClientData[];
  prospects: ClientData[];
}

interface SubscriptionData {
  id: string;
  name: string;
  description?: string;
  monthly_price: number;
  monthly_classes: number;
  equipment_access: string;
  category: string;
  client_count: number;
  clients: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    start_date: string;
    end_date: string;
    status: string;
    remaining_classes: number;
  }>;
}

interface RevenueData {
  totalRevenue: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;
  todayRevenue: number;
  averageDailyRevenue: number;
  growthPercentage: number;
  revenueBySource: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    amount: number;
  }>;
}

const ReportsAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'subscriptions' | 'revenue' | 'instructors' | 'sources'>('overview');
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalClients: 0,
    activeSubscriptionClients: 0,
    clientsWithoutSubscription: 0,
    clientsEndingSoon: 0
  });

  // Business activity data
  const [businessActivityStats, setBusinessActivityStats] = useState<BusinessActivityStats>({
    newSubscriptionsToday: 0,
    newSubscriptionsWeek: 0,
    newClientsToday: 0,
    newClientsWeek: 0,
    recentActivities: []
  });
  const [showBusinessActivityModal, setShowBusinessActivityModal] = useState(false);

  // Referral sources data
  const [referralSourceStats, setReferralSourceStats] = useState<ReferralSourceStats>({
    totalClients: 0,
    totalWithSources: 0,
    totalWithoutSources: 0,
    mostPopularSource: '',
    sources: [],
    monthlyTrends: []
  });
  const [showReferralSourceModal, setShowReferralSourceModal] = useState(false);
  const [selectedReferralSource, setSelectedReferralSource] = useState<ReferralSource | null>(null);
  
  // Source overview modals
  const [showSourceOverviewModal, setShowSourceOverviewModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<string>('');
  const [sourceOverviewData, setSourceOverviewData] = useState<{
    title: string;
    description: string;
    clients: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      created_at: string;
      referral_source?: string;
      subscription_status: 'active' | 'inactive' | 'never_subscribed';
    }>;
  }>({
    title: '',
    description: '',
    clients: []
  });

  // Clients data
  const [clientsData, setClientsData] = useState<ClientsData>({
    newClients: [],
    neverSubscribed: [],
    didntRenew: [],
    prospects: []
  });

  // Modal state
  const [selectedClientType, setSelectedClientType] = useState<string>('');
  const [showClientModal, setShowClientModal] = useState(false);

  // Subscriptions data
  const [subscriptionsData, setSubscriptionsData] = useState<SubscriptionData[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionData | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Revenue data
  const [revenueData, setRevenueData] = useState<RevenueData>({
    totalRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
    todayRevenue: 0,
    averageDailyRevenue: 0,
    growthPercentage: 0,
    revenueBySource: [],
    dailyRevenue: []
  });
  
  // Date picker for revenue
  const [revenueStartDate, setRevenueStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [revenueEndDate, setRevenueEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Revenue modal state
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [selectedRevenueType, setSelectedRevenueType] = useState<string>('');
  
  // Overview modal state
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [selectedOverviewType, setSelectedOverviewType] = useState<string>('');
  const [overviewDetails, setOverviewDetails] = useState<{
    title: string;
    clients: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      join_date?: string;
      status: string;
      subscription_info?: any;
    }>;
  }>({
    title: '',
    clients: []
  });

  const [revenueDetails, setRevenueDetails] = useState<{
    title: string;
    totalAmount: number;
    timeFrame: string;
    payments: Array<{
      id: string;
      amount: number;
      payment_date: string;
      payment_method: string;
      client_name: string;
      client_email: string;
      description?: string;
      transaction_id?: string;
      subscription_info?: string;
    }>;
    credits: Array<{
      id: string;
      amount: number;
      credit_date: string;
      reason: string;
      client_name: string;
      client_email: string;
    }>;
  }>({
    title: '',
    totalAmount: 0,
    timeFrame: '',
    payments: [],
    credits: []
  });

  // Instructor tab state
  const [instructorsList, setInstructorsList] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
  }>>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [instructorData, setInstructorData] = useState<{
    weeklyClasses: Array<{
      id: string;
      name: string;
      date: string;
      time: string;
      duration: number;
      category: string;
      enrolled: number;
      capacity: number;
      status: string;
    }>;
    attendanceStats: {
      totalClasses: number;
      totalStudents: number;
      personalClasses: number;
    };
    personalClassesDetails: Array<{
      id: string;
      name: string;
      date: string;
      time: string;
      duration: number;
      enrolled: number;
      capacity: number;
      status: string;
      client_name?: string;
    }>;
    assignedClients: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      assignment_type: string;
      start_date: string;
      status: string;
      remaining_classes: number;
      subscription_plan: string;
    }>;
    calendarData: Array<{
      date: string;
      classes: Array<{
        id: string;
        name: string;
        time: string;
        enrolled: number;
        capacity: number;
        status: string;
      }>;
    }>;
  }>({
    weeklyClasses: [],
    attendanceStats: {
      totalClasses: 0,
      totalStudents: 0,
      personalClasses: 0
    },
    personalClassesDetails: [],
    assignedClients: [],
    calendarData: []
  });
  const [showInstructorClassModal, setShowInstructorClassModal] = useState(false);
  const [showInstructorAttendanceModal, setShowInstructorAttendanceModal] = useState(false);
  const [showAssignedClientsModal, setShowAssignedClientsModal] = useState(false);
  const [showPersonalClassesModal, setShowPersonalClassesModal] = useState(false);

  // Instructor date filter
  const [instructorStartDate, setInstructorStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [instructorEndDate, setInstructorEndDate] = useState<Date>(new Date());
  const [showInstructorStartDatePicker, setShowInstructorStartDatePicker] = useState(false);
  const [showInstructorEndDatePicker, setShowInstructorEndDatePicker] = useState(false);

  // Theme colors
  const primaryColor = useThemeColor({}, 'primary');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');

  const loadOverviewStats = async () => {
    try {
      setLoading(true);
      const { supabase } = require('../../config/supabase.config');
      
      // 1. Total Clients
      const { data: allClients } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .eq('status', 'active');

      const totalClients = allClients?.length || 0;

      // 2. Clients with Active Subscriptions
      const { data: activeSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('status', 'active');

      const activeSubscriptionClients = activeSubscriptions?.length || 0;

      // 3. Clients without Subscription
      const clientsWithoutSubscription = totalClients - activeSubscriptionClients;

      // 4. Clients Ending Soon (10 days or less)
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

      const { data: endingSoon } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('status', 'active')
        .lte('end_date', tenDaysFromNow.toISOString().split('T')[0]);

      const clientsEndingSoon = endingSoon?.length || 0;

      setOverviewStats({
        totalClients,
        activeSubscriptionClients,
        clientsWithoutSubscription,
        clientsEndingSoon
      });

    } catch (error) {
      console.error('❌ Error loading overview stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessActivityStats = async () => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. New Subscriptions Today and This Week
      const { data: subscriptionsToday } = await supabase
        .from('user_subscriptions')
        .select('id')
        .gte('created_at', today.toISOString());

      const { data: subscriptionsWeek } = await supabase
        .from('user_subscriptions')
        .select('id')
        .gte('created_at', weekAgo.toISOString());

      // 2. New Clients Today and This Week
      const { data: clientsToday } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .gte('created_at', today.toISOString());

      const { data: clientsWeek } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'client')
        .gte('created_at', weekAgo.toISOString());

      // 3. Recent Business Activities (Last 20 activities)
      const recentActivities: BusinessActivity[] = [];

      // Get recent new subscriptions
      const { data: recentSubscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          created_at,
          users!inner(id, name, email, phone),
          subscription_plans!inner(name, monthly_price)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentSubscriptions) {
        recentSubscriptions.forEach((sub: any) => {
          recentActivities.push({
            id: `sub-${sub.id}`,
            type: 'new_subscription',
            title: '🎯 New Subscription',
            description: `${sub.users.name} subscribed to ${sub.subscription_plans.name}`,
            client_name: sub.users.name,
            client_id: sub.users.id,
            created_at: sub.created_at,
            metadata: {
              plan_name: sub.subscription_plans.name,
              monthly_price: sub.subscription_plans.monthly_price,
              subscription_id: sub.id,
              client_email: sub.users.email,
              client_phone: sub.users.phone
            }
          });
        });
      }

      // Get recent new clients
      const { data: recentNewClients } = await supabase
        .from('users')
        .select('id, name, email, phone, created_at')
        .eq('role', 'client')
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentNewClients) {
        recentNewClients.forEach((client: any) => {
          recentActivities.push({
            id: `client-${client.id}`,
            type: 'new_client',
            title: '👤 New Client Registration',
            description: `${client.name} joined the studio`,
            client_name: client.name,
            client_id: client.id,
            created_at: client.created_at,
            metadata: {
              client_email: client.email,
              client_phone: client.phone
            }
          });
        });
      }

      // Sort activities by date
      recentActivities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setBusinessActivityStats({
        newSubscriptionsToday: subscriptionsToday?.length || 0,
        newSubscriptionsWeek: subscriptionsWeek?.length || 0,
        newClientsToday: clientsToday?.length || 0,
        newClientsWeek: clientsWeek?.length || 0,
        recentActivities: recentActivities.slice(0, 15) // Show top 15 recent activities
      });

    } catch (error) {
      console.error('❌ Error loading business activity stats:', error);
    }
  };

  const loadReferralSourceStats = async () => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      // 1. Get all clients with their referral sources
      const { data: allClients } = await supabase
        .from('users')
        .select('id, name, email, phone, created_at, referral_source')
        .eq('role', 'client')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!allClients) {
        console.error('❌ No clients data found');
        return;
      }

      const totalClients = allClients.length;
      const clientsWithSources = allClients.filter(client => client.referral_source && client.referral_source.trim() !== '');
      const totalWithSources = clientsWithSources.length;
      const totalWithoutSources = totalClients - totalWithSources;

      // 2. Get subscription status for clients
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id, status')
        .eq('status', 'active');

      const activeSubscriptionUserIds = new Set(subscriptions?.map(sub => sub.user_id) || []);

      // 3. Group clients by referral source
      const sourceGroups: { [key: string]: typeof allClients } = {};
      
      clientsWithSources.forEach(client => {
        const source = client.referral_source || 'Unknown';
        if (!sourceGroups[source]) {
          sourceGroups[source] = [];
        }
        sourceGroups[source].push(client);
      });

      // 4. Calculate statistics for each source
      const sources: ReferralSource[] = Object.entries(sourceGroups).map(([source, clients]) => {
        const recentClients = clients.slice(0, 10).map(client => ({
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          created_at: client.created_at,
          subscription_status: activeSubscriptionUserIds.has(client.id) 
            ? 'active' as const
            : 'never_subscribed' as const
        }));

        return {
          source,
          count: clients.length,
          percentage: (clients.length / totalWithSources) * 100,
          recent_clients: recentClients
        };
      }).sort((a, b) => b.count - a.count);

      // 5. Calculate monthly trends (last 6 months)
      const monthlyTrends = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthClients = allClients.filter(client => {
          const clientDate = new Date(client.created_at);
          return clientDate >= monthDate && clientDate < nextMonthDate;
        });

        const monthSourceGroups: { [key: string]: number } = {};
        monthClients.forEach(client => {
          if (client.referral_source && client.referral_source.trim() !== '') {
            const source = client.referral_source;
            monthSourceGroups[source] = (monthSourceGroups[source] || 0) + 1;
          }
        });

        monthlyTrends.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total_clients: monthClients.length,
          sources: Object.entries(monthSourceGroups).map(([source, count]) => ({
            source,
            count
          }))
        });
      }

      const mostPopularSource = sources.length > 0 ? sources[0].source : 'No data';

      setReferralSourceStats({
        totalClients,
        totalWithSources,
        totalWithoutSources,
        mostPopularSource,
        sources,
        monthlyTrends
      });

    } catch (error) {
      console.error('❌ Error loading referral source stats:', error);
    }
  };

  const loadSourceOverviewDetails = async (type: string) => {
    try {
      const { supabase } = require('../../config/supabase.config');
      let title = '';
      let description = '';
      let clients = [];

      // Get subscription status for all clients
      const { data: subscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id, status')
        .eq('status', 'active');

      const activeSubscriptionUserIds = new Set(subscriptions?.map(sub => sub.user_id) || []);

      switch (type) {
        case 'total':
          title = 'All Registered Clients';
          description = 'Complete list of all active clients in the system';
          const { data: allClients } = await supabase
            .from('users')
            .select('id, name, email, phone, created_at, referral_source')
            .eq('role', 'client')
            .eq('status', 'active')
            .order('created_at', { ascending: false });
          
          clients = (allClients || []).map(client => ({
            ...client,
            subscription_status: activeSubscriptionUserIds.has(client.id) 
              ? 'active' as const
              : 'never_subscribed' as const
          }));
          break;

        case 'withSources':
          title = 'Clients with Referral Source Information';
          description = 'Clients who provided information about how they heard about us';
          const { data: clientsWithSources } = await supabase
            .from('users')
            .select('id, name, email, phone, created_at, referral_source')
            .eq('role', 'client')
            .eq('status', 'active')
            .not('referral_source', 'is', null)
            .neq('referral_source', '')
            .order('created_at', { ascending: false });
          
          clients = (clientsWithSources || []).map(client => ({
            ...client,
            subscription_status: activeSubscriptionUserIds.has(client.id) 
              ? 'active' as const
              : 'never_subscribed' as const
          }));
          break;

        case 'missingSources':
          title = 'Clients Missing Referral Source Information';
          description = 'Clients who haven\'t provided information about how they heard about us';
          const { data: clientsWithoutSources } = await supabase
            .from('users')
            .select('id, name, email, phone, created_at, referral_source')
            .eq('role', 'client')
            .eq('status', 'active')
            .or('referral_source.is.null,referral_source.eq.')
            .order('created_at', { ascending: false });
          
          clients = (clientsWithoutSources || []).map(client => ({
            ...client,
            subscription_status: activeSubscriptionUserIds.has(client.id) 
              ? 'active' as const
              : 'never_subscribed' as const
          }));
          break;

        case 'topSource':
          const topSource = referralSourceStats.mostPopularSource;
          if (topSource && topSource !== 'No data') {
            title = `Clients from ${topSource}`;
            description = `All clients who heard about us through ${topSource}`;
            const { data: topSourceClients } = await supabase
              .from('users')
              .select('id, name, email, phone, created_at, referral_source')
              .eq('role', 'client')
              .eq('status', 'active')
              .eq('referral_source', topSource)
              .order('created_at', { ascending: false });
            
            clients = (topSourceClients || []).map(client => ({
              ...client,
              subscription_status: activeSubscriptionUserIds.has(client.id) 
                ? 'active' as const
                : 'never_subscribed' as const
            }));
          }
          break;

        default:
          return;
      }

      setSourceOverviewData({ title, description, clients });
      setSelectedSourceType(type);
      setShowSourceOverviewModal(true);

    } catch (error) {
      console.error('❌ Error loading source overview details:', error);
    }
  };

  const loadClientsData = async () => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      // 1. New Clients (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: newClients } = await supabase
        .from('users')
        .select('id, name, email, phone, join_date, status')
        .eq('role', 'client')
        .eq('status', 'active')
        .gte('join_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('join_date', { ascending: false });

      // 2. Clients that never had subscription
      const { data: allClients } = await supabase
        .from('users')
        .select('id, name, email, phone, join_date, status')
        .eq('role', 'client')
        .eq('status', 'active');

      const { data: clientsWithSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .in('status', ['active', 'expired', 'cancelled']);

      const subscribedUserIds = new Set(clientsWithSubscriptions?.map(s => s.user_id) || []);
      const neverSubscribed = allClients?.filter(client => !subscribedUserIds.has(client.id)) || [];

      // 3. Clients that didn't renew (expired subscriptions, no new active ones)
      const { data: expiredSubscriptions } = await supabase
        .from('user_subscriptions')
        .select(`
          user_id,
          end_date,
          users!user_id(id, name, email, phone, status)
        `)
        .eq('status', 'expired')
        .order('end_date', { ascending: false });

      const { data: activeSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('status', 'active');

      const activeUserIds = new Set(activeSubscriptions?.map(s => s.user_id) || []);
      const didntRenew = expiredSubscriptions?.filter(sub => 
        !activeUserIds.has(sub.user_id) && sub.users?.status === 'active'
      ).map(sub => ({
        id: sub.users.id,
        name: sub.users.name,
        email: sub.users.email,
        phone: sub.users.phone,
        status: sub.users.status,
        subscription_info: { expired_date: sub.end_date }
      })) || [];

      // 4. Prospects (clients with status 'prospect' or recent inactive)
      const { data: prospects } = await supabase
        .from('users')
        .select('id, name, email, phone, join_date, status')
        .eq('role', 'client')
        .in('status', ['prospect', 'inactive']);

      setClientsData({
        newClients: newClients || [],
        neverSubscribed,
        didntRenew,
        prospects: prospects || []
      });

    } catch (error) {
      console.error('❌ Error loading clients data:', error);
    }
  };

  const loadSubscriptionsData = async () => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      // Get all subscription plans
      const { data: subscriptionPlans } = await supabase
        .from('subscription_plans')
        .select('id, name, description, monthly_price, monthly_classes, equipment_access, category')
        .eq('is_active', true)
        .order('name');

      if (!subscriptionPlans) return;

      // Get active subscriptions with client details for each plan
      const subscriptionsWithClients = await Promise.all(
        subscriptionPlans.map(async (plan) => {
          const { data: activeSubscriptions } = await supabase
            .from('user_subscriptions')
            .select(`
              id,
              start_date,
              end_date,
              status,
              remaining_classes,
              users!user_id(
                id,
                name,
                email,
                phone
              )
            `)
            .eq('plan_id', plan.id)
            .eq('status', 'active');

          const clients = activeSubscriptions?.map(sub => ({
            id: sub.users.id,
            name: sub.users.name,
            email: sub.users.email,
            phone: sub.users.phone,
            start_date: sub.start_date,
            end_date: sub.end_date,
            status: sub.status,
            remaining_classes: sub.remaining_classes
          })) || [];

          return {
            ...plan,
            client_count: clients.length,
            clients
          };
        })
      );

      // Sort by client count (highest first)
      const sortedSubscriptions = subscriptionsWithClients.sort((a, b) => b.client_count - a.client_count);
      
      setSubscriptionsData(sortedSubscriptions);

    } catch (error) {
      console.error('❌ Error loading subscriptions data:', error);
    }
  };

  const loadRevenueData = async () => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      const startDateStr = revenueStartDate.toISOString().split('T')[0];
      const endDateStr = revenueEndDate.toISOString().split('T')[0];
      
      console.log('📊 Loading revenue data for:', startDateStr, 'to', endDateStr);
      
      // Get payments data
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_method')
        .gte('payment_date', startDateStr)
        .lte('payment_date', endDateStr)
        .order('payment_date');

      if (paymentsError) {
        console.error('❌ Payments query error:', paymentsError);
    } else {
        console.log('✅ Payments data:', payments?.length || 0, 'records');
      }

      // Get manual credits data
      const { data: credits, error: creditsError } = await supabase
        .from('manual_credits')
        .select('amount, created_at, reason')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at');

      if (creditsError) {
        console.error('❌ Credits query error:', creditsError);
      } else {
        console.log('✅ Credits data:', credits?.length || 0, 'records');
      }

      // Calculate total revenue (handle errors gracefully)
      const validPayments = paymentsError ? [] : (payments || []);
      const validCredits = creditsError ? [] : (credits || []);
      
      const paymentsTotal = validPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const creditsTotal = validCredits.reduce((sum, c) => sum + (c.amount || 0), 0);
      const totalRevenue = paymentsTotal + creditsTotal;

      // Calculate this week revenue
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const thisWeekPayments = validPayments.filter(p => new Date(p.payment_date) >= oneWeekAgo);
      const thisWeekCredits = validCredits.filter(c => new Date(c.created_at) >= oneWeekAgo);
      const thisWeekRevenue = thisWeekPayments.reduce((sum, p) => sum + p.amount, 0) + 
                              thisWeekCredits.reduce((sum, c) => sum + c.amount, 0);

      // Calculate this month revenue (current calendar month)
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthPayments = validPayments.filter(p => new Date(p.payment_date) >= firstDayOfMonth);
      const thisMonthCredits = validCredits.filter(c => new Date(c.created_at) >= firstDayOfMonth);
      const thisMonthRevenue = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0) + 
                               thisMonthCredits.reduce((sum, c) => sum + c.amount, 0);

      // Calculate today's revenue
      const today = new Date().toISOString().split('T')[0];
      const todayPayments = validPayments.filter(p => p.payment_date === today);
      const todayCredits = validCredits.filter(c => c.created_at.split('T')[0] === today);
      const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0) + 
                           todayCredits.reduce((sum, c) => sum + c.amount, 0);

      // Calculate average daily revenue
      const daysDiff = Math.max(1, Math.ceil((revenueEndDate.getTime() - revenueStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      const averageDailyRevenue = totalRevenue / daysDiff;

      // Calculate growth percentage (comparing to previous period)
      const previousPeriodStart = new Date(revenueStartDate.getTime() - daysDiff * 24 * 60 * 60 * 1000);
      const { data: previousPayments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', previousPeriodStart.toISOString().split('T')[0])
        .lt('payment_date', startDateStr);

      const { data: previousCredits } = await supabase
        .from('manual_credits')
        .select('amount')
        .gte('created_at', previousPeriodStart.toISOString().split('T')[0])
        .lt('created_at', startDateStr);

      const previousRevenue = (previousPayments?.reduce((sum, p) => sum + p.amount, 0) || 0) + 
                              (previousCredits?.reduce((sum, c) => sum + c.amount, 0) || 0);
      
      const growthPercentage = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Calculate revenue by source
      const paymentMethods = payments?.reduce((acc, p) => {
        const method = p.payment_method || 'Unknown';
        acc[method] = (acc[method] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>) || {};

      const revenueBySource = [
        ...Object.entries(paymentMethods).map(([method, amount]) => {
          const numAmount = Number(amount) || 0;
    return {
            source: `Payments (${method})`,
            amount: numAmount,
            percentage: totalRevenue > 0 ? (numAmount / totalRevenue) * 100 : 0
          };
        }),
        ...(creditsTotal > 0 ? [{
          source: 'Manual Credits',
          amount: creditsTotal,
          percentage: totalRevenue > 0 ? (creditsTotal / totalRevenue) * 100 : 0
        }] : [])
      ];

      // Calculate daily revenue for chart
      const dailyRevenueMap = new Map<string, number>();
      
      validPayments.forEach(p => {
        const date = p.payment_date;
        dailyRevenueMap.set(date, (dailyRevenueMap.get(date) || 0) + p.amount);
      });

      validCredits.forEach(c => {
        const date = c.created_at.split('T')[0]; // Extract date from timestamp
        dailyRevenueMap.set(date, (dailyRevenueMap.get(date) || 0) + c.amount);
      });

      const dailyRevenue = Array.from(dailyRevenueMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setRevenueData({
        totalRevenue,
        thisWeekRevenue,
        thisMonthRevenue,
        todayRevenue,
        averageDailyRevenue,
        growthPercentage,
        revenueBySource,
        dailyRevenue
      });

    } catch (error) {
      console.error('❌ Error loading revenue data:', error);
    }
  };

  const loadRevenueDetails = async (type: string) => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      let startDate: Date;
      let endDate: Date;
      let title: string;
      let timeFrame: string;

      const now = new Date();
      
      switch (type) {
        case 'week':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          endDate = now;
          title = 'This Week Revenue';
          timeFrame = 'Last 7 days';
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = now;
          title = 'This Month Revenue';
          timeFrame = `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
          break;
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = now;
          title = 'Today Revenue';
          timeFrame = 'Today';
          break;
        case 'total':
          startDate = revenueStartDate;
          endDate = revenueEndDate;
          title = 'Total Revenue';
          timeFrame = `${revenueStartDate.toLocaleDateString()} - ${revenueEndDate.toLocaleDateString()}`;
          break;
        case 'average':
          startDate = revenueStartDate;
          endDate = revenueEndDate;
          title = 'Daily Average Revenue';
          timeFrame = `Average from ${revenueStartDate.toLocaleDateString()} to ${revenueEndDate.toLocaleDateString()}`;
          break;
        default:
          return;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get detailed payments
      const { data: paymentsData, error: detailPaymentsError } = await supabase
        .from('payments')
        .select('id, amount, payment_date, payment_method, user_id, status, transaction_id, subscription_id')
        .gte('payment_date', startDateStr)
        .lte('payment_date', endDateStr)
        .order('payment_date', { ascending: false });

      if (detailPaymentsError) {
        console.error('❌ Detail payments query error:', detailPaymentsError);
      }

      // Get detailed credits
      const { data: creditsData, error: detailCreditsError } = await supabase
        .from('manual_credits')
        .select('id, amount, created_at, reason, user_id')
        .gte('created_at', startDateStr)
        .lte('created_at', endDateStr)
        .order('created_at', { ascending: false });

      if (detailCreditsError) {
        console.error('❌ Detail credits query error:', detailCreditsError);
      }

      // Handle errors gracefully
      const validDetailPayments = detailPaymentsError ? [] : (paymentsData || []);
      const validDetailCredits = detailCreditsError ? [] : (creditsData || []);

      // Get user info for payments
      const paymentUserIds = validDetailPayments.map(p => p.user_id).filter(Boolean);
      const creditUserIds = validDetailCredits.map(c => c.user_id).filter(Boolean);
      const allUserIds = [...new Set([...paymentUserIds, ...creditUserIds])];

      // Try to get subscription info through user's active subscriptions
      // Since payment subscription_ids don't match subscription_plans, we'll look up
      // what subscription plans each user has and match by timing
      console.log('📋 Attempting subscription lookup through user subscriptions...');

      let usersData = [];
      let userSubscriptionsData = [];
      let subscriptionPlansData = [];

      if (allUserIds.length > 0) {
        // Get users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', allUserIds);
        
        if (usersError) {
          console.error('❌ Users query error:', usersError);
    } else {
          usersData = users || [];
        }

        // Get user subscriptions for these users
        const { data: userSubs, error: userSubsError } = await supabase
          .from('user_subscriptions')
          .select('id, user_id, plan_id, start_date, end_date, status')
          .in('user_id', allUserIds);
        
        if (userSubsError) {
          console.error('❌ User subscriptions query error:', userSubsError);
      } else {
          userSubscriptionsData = userSubs || [];
          console.log('📋 Found user subscriptions:', userSubscriptionsData.length);
        }

        // Get all subscription plans
        const { data: plans, error: plansError } = await supabase
          .from('subscription_plans')
          .select('id, name, monthly_price, monthly_classes');
        
        if (plansError) {
          console.error('❌ Subscription plans query error:', plansError);
        } else {
          subscriptionPlansData = plans || [];
          console.log('📋 Found subscription plans:', subscriptionPlansData.length);
        }
      }

      // Create lookup maps
      const userMap = usersData.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<string, any>);

      const planMap = subscriptionPlansData.reduce((acc, plan) => {
        acc[plan.id] = plan;
        return acc;
      }, {} as Record<string, any>);

      // Create user subscriptions grouped by user
      const userSubsMap = userSubscriptionsData.reduce((acc, sub) => {
        if (!acc[sub.user_id]) {
          acc[sub.user_id] = [];
        }
        acc[sub.user_id].push(sub);
        return acc;
      }, {} as Record<string, any[]>);

      const payments = validDetailPayments.map(p => {
        const user = userMap[p.user_id];
        const paymentDate = new Date(p.payment_date);
        
        // Try to find the most likely subscription for this payment
        let subscriptionInfo = '';
        const userSubscriptions = userSubsMap[p.user_id] || [];
        
        if (userSubscriptions.length > 0) {
          // Find subscription that could match this payment
          // Look for subscriptions that started around the payment date
          const matchingSub = userSubscriptions.find(sub => {
            const subStartDate = new Date(sub.start_date);
            const timeDiff = Math.abs(paymentDate.getTime() - subStartDate.getTime());
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
            // If payment is within 30 days of subscription start, consider it a match
            return daysDiff <= 30;
          });

          if (matchingSub) {
            const plan = planMap[matchingSub.plan_id];
            if (plan) {
              subscriptionInfo = `${plan.name} - $${plan.monthly_price}/month (${plan.monthly_classes} classes)`;
            } else {
              subscriptionInfo = 'Subscription plan (details unavailable)';
            }
          } else {
            // If no close match, use the most recent subscription
            const mostRecentSub = userSubscriptions.sort((a, b) => 
              new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
            )[0];
            
            if (mostRecentSub) {
              const plan = planMap[mostRecentSub.plan_id];
              if (plan) {
                subscriptionInfo = `${plan.name} (likely) - $${plan.monthly_price}/month`;
              }
            }
          }
        }

        // Fallback if no subscription found
        if (!subscriptionInfo && p.subscription_id) {
          subscriptionInfo = 'Service purchase (subscription details unavailable)';
        }

        return {
          id: p.id,
          amount: p.amount,
          payment_date: p.payment_date,
          payment_method: p.payment_method || 'Unknown',
          client_name: user?.name || 'Unknown Client',
          client_email: user?.email || '',
          description: p.status === 'completed' ? 'Payment completed' : (p.status || 'Payment'),
          transaction_id: p.transaction_id,
          subscription_info: subscriptionInfo
        };
      });

      const credits = validDetailCredits.map(c => {
        const user = userMap[c.user_id];
        return {
          id: c.id,
          amount: c.amount,
          credit_date: c.created_at.split('T')[0], // Convert timestamp to date
          reason: c.reason || 'Manual credit',
          client_name: user?.name || 'Unknown Client',
          client_email: user?.email || ''
        };
      });

      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0) + 
                         credits.reduce((sum, c) => sum + c.amount, 0);

      setRevenueDetails({
        title,
        totalAmount,
        timeFrame,
        payments,
        credits
      });

      setSelectedRevenueType(type);
      setShowRevenueModal(true);

    } catch (error) {
      console.error('❌ Error loading revenue details:', error);
    }
  };

  const loadOverviewDetails = async (type: string) => {
    try {
      const { supabase } = require('../../config/supabase.config');
      let title = '';
      let clients = [];

      switch (type) {
        case 'total':
          title = 'All Clients';
          const { data: allClients } = await supabase
            .from('users')
            .select('id, name, email, phone, join_date, status')
            .eq('status', 'active')
            .order('join_date', { ascending: false });
          clients = allClients || [];
          break;

        case 'activeSubscription':
          title = 'Clients with Active Subscriptions';
          const { data: activeSubClients } = await supabase
            .from('users')
            .select(`
              id, name, email, phone, join_date, status,
              user_subscriptions!inner(
                id, start_date, end_date, status,
                subscription_plans(name, monthly_price, monthly_classes)
              )
            `)
            .eq('user_subscriptions.status', 'active');
          clients = activeSubClients?.map(client => ({
            ...client,
            subscription_info: client.user_subscriptions?.[0]
          })) || [];
          break;

        case 'withoutSubscription':
          title = 'Clients without Active Subscriptions';
          const { data: noSubClients } = await supabase
            .from('users')
            .select('id, name, email, phone, join_date, status')
            .eq('status', 'active');
          
          // Filter out clients with active subscriptions
          const { data: activeSubscriptions } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('status', 'active');
          
          const activeUserIds = new Set(activeSubscriptions?.map(sub => sub.user_id) || []);
          clients = noSubClients?.filter(client => !activeUserIds.has(client.id)) || [];
          break;

        case 'endingSoon':
          title = 'Subscriptions Ending Soon (10 days)';
          const tenDaysFromNow = new Date();
          tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
          
          const { data: endingSoonClients } = await supabase
            .from('users')
            .select(`
              id, name, email, phone, join_date, status,
              user_subscriptions!inner(
                id, start_date, end_date, status, remaining_classes,
                subscription_plans(name, monthly_price, monthly_classes)
              )
            `)
            .eq('user_subscriptions.status', 'active')
            .lte('user_subscriptions.end_date', tenDaysFromNow.toISOString().split('T')[0]);
          
          clients = endingSoonClients?.map(client => ({
            ...client,
            subscription_info: client.user_subscriptions?.[0]
          })) || [];
          break;

        default:
          return;
      }

      setOverviewDetails({ title, clients });
      setSelectedOverviewType(type);
      setShowOverviewModal(true);

    } catch (error) {
      console.error('❌ Error loading overview details:', error);
    }
  };

  const loadInstructorsList = async () => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      // Get all users who have taught classes (instructor_id in classes table)
      const { data: instructors } = await supabase
        .from('users')
        .select('id, name, email, phone')
        .eq('status', 'active')
        .order('name');

      // Filter instructors by checking who has instructor_id in classes table
      const { data: classInstructors } = await supabase
        .from('classes')
        .select('instructor_id')
        .not('instructor_id', 'is', null);

      const instructorIds = new Set(classInstructors?.map(c => c.instructor_id) || []);
      const activeInstructors = instructors?.filter(user => instructorIds.has(user.id)) || [];

      setInstructorsList(activeInstructors);
    } catch (error) {
      console.error('❌ Error loading instructors list:', error);
    }
  };

  const loadInstructorData = async (instructorId: string) => {
    try {
      const { supabase } = require('../../config/supabase.config');
      
      // Get current week dates
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)

      // Get instructor's classes for this week
      const { data: weeklyClasses } = await supabase
        .from('classes')
        .select('id, name, date, time, duration, category, enrolled, capacity, status')
        .eq('instructor_id', instructorId)
        .gte('date', startOfWeek.toISOString().split('T')[0])
        .lte('date', endOfWeek.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Get instructor's attendance statistics using selected date range
      const startDateStr = instructorStartDate.toISOString().split('T')[0];
      const endDateStr = instructorEndDate.toISOString().split('T')[0];

      // Get all classes (not just completed) to count total students
      const { data: allClassesInRange } = await supabase
        .from('classes')
        .select('id, name, date, time, duration, enrolled, capacity, status, category')
        .eq('instructor_id', instructorId)
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      // Get only completed classes for class count statistics
      const { data: completedClassesInRange } = await supabase
        .from('classes')
        .select('id, enrolled, capacity, status, category')
        .eq('instructor_id', instructorId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .eq('status', 'completed');

      // Calculate attendance stats
      const totalClasses = completedClassesInRange?.length || 0;
      // Count students from all classes (scheduled, completed, etc.) not just completed
      const totalStudents = allClassesInRange?.reduce((sum, cls) => sum + (cls.enrolled || 0), 0) || 0;
      
      // Count personal classes from completed classes only
      const personalClasses = completedClassesInRange?.filter(cls => cls.category === 'personal')?.length || 0;

      // Get detailed personal classes information
      const personalClassesDetails = allClassesInRange?.filter(cls => cls.category === 'personal') || [];
      
      console.log('🏋️ Personal classes found:', personalClassesDetails.length);
      if (personalClassesDetails.length > 0) {
        console.log('🔍 First personal class data:', personalClassesDetails[0]);
      }

      // Get assigned clients for personal training
      const { data: assignments, error: assignmentsError } = await supabase
        .from('instructor_client_assignments')
        .select('assignment_type, start_date, status, client_id')
        .eq('instructor_id', instructorId)
        .eq('status', 'active');

      if (assignmentsError) {
        console.error('❌ Error fetching instructor assignments:', assignmentsError);
      } else {
        console.log('📋 Found assignments for instructor:', assignments?.length || 0);
      }

      let assignedClients = [];
      
      if (assignments && assignments.length > 0) {
        // Get client details for all assigned clients
        const clientIds = assignments.map(a => a.client_id);
        console.log('📋 Fetching details for client IDs:', clientIds);
        
        const { data: clients, error: clientsError } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .in('id', clientIds);

        if (clientsError) {
          console.error('❌ Error fetching client details:', clientsError);
        } else {
          console.log('👥 Found client details:', clients?.length || 0);
        }

        // Get subscription details for remaining classes
        const { data: subscriptions, error: subscriptionsError } = await supabase
          .from('user_subscriptions')
          .select(`
            user_id,
            remaining_classes,
            subscription_plans(name)
          `)
          .in('user_id', clientIds)
          .eq('status', 'active');

        if (subscriptionsError) {
          console.error('❌ Error fetching subscription details:', subscriptionsError);
        } else {
          console.log('📋 Found subscriptions:', subscriptions?.length || 0);
        }

        // Combine assignment, client, and subscription data
        assignedClients = assignments.map(assignment => {
          const client = clients?.find(c => c.id === assignment.client_id);
          const subscription = subscriptions?.find(s => s.user_id === assignment.client_id);
          
          return {
            id: client?.id || assignment.client_id,
            name: client?.name || 'Unknown Client',
            email: client?.email || '',
            phone: client?.phone || '',
            assignment_type: assignment.assignment_type,
            start_date: assignment.start_date,
            status: assignment.status,
            remaining_classes: subscription?.remaining_classes || 0,
            subscription_plan: subscription?.subscription_plans?.name || 'No active subscription'
          };
        });
      }

      console.log('✅ Final assigned clients:', assignedClients);

      // Get calendar data (next 14 days)
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(today.getDate() + 14);

      const { data: calendarClasses, error: calendarError } = await supabase
        .from('classes')
        .select('id, name, date, time, enrolled, capacity, status')
        .eq('instructor_id', instructorId)
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', twoWeeksFromNow.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (calendarError) {
        console.error('❌ Error fetching calendar classes:', calendarError);
      } else {
        console.log('📅 Calendar classes found:', calendarClasses?.length || 0);
        if (calendarClasses && calendarClasses.length > 0) {
          console.log('📊 First calendar class data (before booking count):', calendarClasses[0]);
        }
      }

      // Calculate actual enrollment by counting bookings
      const classesWithActualEnrollment = await Promise.all(
        (calendarClasses || []).map(async (cls) => {
          const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select('id')
            .eq('class_id', cls.id)
            .in('status', ['confirmed', 'checked_in']);
          
          if (bookingError) {
            console.error(`❌ Error fetching bookings for class ${cls.id}:`, bookingError);
            return { ...cls, actualEnrolled: cls.enrolled || 0 };
          }
          
          const actualEnrolled = bookings?.length || 0;
          console.log(`📊 Class ${cls.name} (${cls.date} ${cls.time}): DB enrolled=${cls.enrolled}, Actual bookings=${actualEnrolled}`);
          
          return { ...cls, actualEnrolled };
        })
      );

      // Group calendar classes by date
      const calendarData = [];
      const classesGrouped: { [key: string]: any[] } = {};
      
      classesWithActualEnrollment?.forEach(cls => {
        if (!classesGrouped[cls.date]) {
          classesGrouped[cls.date] = [];
        }
        classesGrouped[cls.date].push({
          id: cls.id,
          name: cls.name,
          time: cls.time,
          enrolled: cls.actualEnrolled,
          capacity: cls.capacity || 10,
          status: cls.status
        });
      });

      Object.keys(classesGrouped).forEach(date => {
        calendarData.push({
          date,
          classes: classesGrouped[date]
        });
      });

      setInstructorData({
        weeklyClasses: weeklyClasses || [],
        attendanceStats: {
          totalClasses,
          totalStudents,
          personalClasses
        },
        personalClassesDetails,
        assignedClients,
        calendarData
      });

    } catch (error) {
      console.error('❌ Error loading instructor data:', error);
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // For web, we handle this in the input onChange
      return;
    }
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRevenueStartDate(selectedDate);
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // For web, we handle this in the input onChange
      return;
    }
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRevenueEndDate(selectedDate);
    }
  };

  const onInstructorStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      return;
    }
    setShowInstructorStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setInstructorStartDate(selectedDate);
    }
  };

  const onInstructorEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      return;
    }
    setShowInstructorEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setInstructorEndDate(selectedDate);
    }
  };

  useEffect(() => {
    loadOverviewStats();
    loadBusinessActivityStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'clients') {
      loadClientsData();
    } else if (activeTab === 'subscriptions') {
      loadSubscriptionsData();
    } else if (activeTab === 'revenue') {
      loadRevenueData();
    } else if (activeTab === 'sources') {
      loadReferralSourceStats();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'revenue') {
      loadRevenueData();
    }
  }, [revenueStartDate, revenueEndDate]);

  // Load instructors when tab is active
  useEffect(() => {
    if (activeTab === 'instructors') {
      loadInstructorsList();
    }
  }, [activeTab]);

  // Load instructor data when instructor is selected
  useEffect(() => {
    if (selectedInstructor) {
      loadInstructorData(selectedInstructor);
    }
  }, [selectedInstructor]);

  // Reload instructor data when date range changes
  useEffect(() => {
    if (selectedInstructor) {
      loadInstructorData(selectedInstructor);
    }
  }, [instructorStartDate, instructorEndDate]);

  const renderOverviewCard = (
    title: string,
    value: number,
    icon: string,
    color: string,
    subtitle?: string,
    cardType?: string
  ) => (
    <TouchableOpacity onPress={() => cardType && loadOverviewDetails(cardType)} disabled={!cardType}>
      <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Title style={[styles.cardTitle, { color: textColor }]}>{title}</Title>
          <View style={styles.cardIconContainer}>
            <MaterialIcons name={icon as any} size={32} color={color} />
            {cardType && (
              <MaterialIcons name="visibility" size={16} color={textMutedColor} style={styles.detailsIcon} />
            )}
              </View>
        </View>
        <View style={styles.cardStats}>
          <Title style={[styles.statValue, { color }]}>{value}</Title>
          {subtitle && (
            <Caption style={[styles.statSubtitle, { color: textMutedColor }]}>
              {subtitle}
            </Caption>
          )}
          {cardType && (
            <Caption style={[styles.clickHint, { color: textMutedColor }]}>
              Tap to see details
            </Caption>
          )}
        </View>
            </View>
          </PaperCard>
    </TouchableOpacity>
    );

  const renderBusinessActivityCard = () => (
    <TouchableOpacity onPress={() => setShowBusinessActivityModal(true)}>
      <PaperCard style={[styles.businessActivityCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title style={[styles.cardTitle, { color: textColor }]}>Recent Business Activity</Title>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name="trending-up" size={32} color="#2196F3" />
              <MaterialIcons name="visibility" size={16} color={textMutedColor} style={styles.detailsIcon} />
            </View>
          </View>
          
          <View style={styles.businessActivityContent}>
            {/* Quick Stats */}
            <View style={styles.businessStatsRow}>
              <View style={styles.businessStat}>
                <Text style={[styles.businessStatNumber, { color: '#4CAF50' }]}>
                  {businessActivityStats.newSubscriptionsToday}
                </Text>
                <Caption style={[styles.businessStatLabel, { color: textMutedColor }]}>
                  Subscriptions Today
                </Caption>
              </View>
              
              <View style={styles.businessStat}>
                <Text style={[styles.businessStatNumber, { color: '#FF9800' }]}>
                  {businessActivityStats.newClientsToday}
                </Text>
                <Caption style={[styles.businessStatLabel, { color: textMutedColor }]}>
                  New Clients Today
                </Caption>
              </View>
            </View>
            
            {/* Recent Activities Preview */}
            <View style={styles.businessActivitiesPreview}>
              {businessActivityStats.recentActivities.slice(0, 3).map((activity, index) => (
                <View key={activity.id} style={styles.businessActivityItem}>
                  <View style={styles.businessActivityIcon}>
                    <MaterialIcons 
                      name={activity.type === 'new_subscription' ? 'card-membership' : 'person-add'} 
                      size={16} 
                      color={activity.type === 'new_subscription' ? '#4CAF50' : '#FF9800'} 
                    />
                  </View>
                  <View style={styles.businessActivityText}>
                    <Text style={[styles.businessActivityDescription, { color: textColor }]} numberOfLines={1}>
                      {activity.description}
                    </Text>
                    <Caption style={[styles.businessActivityTime, { color: textMutedColor }]}>
                      {formatTimeAgo(activity.created_at)}
                    </Caption>
                  </View>
                </View>
              ))}
              
              {businessActivityStats.recentActivities.length === 0 && (
                <View style={styles.businessNoActivity}>
                  <MaterialIcons name="history" size={24} color={textMutedColor} />
                  <Caption style={[styles.businessNoActivityText, { color: textMutedColor }]}>
                    No recent business activity
                  </Caption>
                </View>
              )}
              
              {businessActivityStats.recentActivities.length > 3 && (
                <Caption style={[styles.businessMoreActivities, { color: '#2196F3' }]}>
                  +{businessActivityStats.recentActivities.length - 3} more activities
                </Caption>
              )}
            </View>
          </View>
          
          <Caption style={[styles.clickHint, { color: textMutedColor }]}>
            Tap to see all business activities
          </Caption>
        </View>
      </PaperCard>
    </TouchableOpacity>
  );

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderInstructorSelector = () => (
    <View style={styles.instructorSelector}>
      <Title style={[styles.selectorTitle, { color: textColor }]}>Select Instructor</Title>
      <Caption style={[styles.selectorSubtitle, { color: textMutedColor }]}>
        Choose an instructor to view their classes, attendance, and schedule
      </Caption>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.instructorList}>
        {instructorsList.map((instructor) => (
          <TouchableOpacity
            key={instructor.id}
            style={[
              styles.instructorItem,
              {
                backgroundColor: selectedInstructor === instructor.id ? primaryColor : surfaceColor,
                borderColor: selectedInstructor === instructor.id ? primaryColor : textMutedColor + '30'
              }
            ]}
            onPress={() => setSelectedInstructor(instructor.id)}
          >
            <MaterialIcons
              name="person"
              size={32}
              color={selectedInstructor === instructor.id ? 'white' : primaryColor}
            />
            <Text style={[
              styles.instructorName,
              { color: selectedInstructor === instructor.id ? 'white' : textColor }
            ]}>
              {instructor.name}
            </Text>
            {instructor.email && (
              <Caption style={[
                styles.instructorEmail,
                { color: selectedInstructor === instructor.id ? 'white' : textMutedColor }
              ]}>
                {instructor.email}
              </Caption>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      </View>
    );

  const renderInstructorDataCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string,
    subtitle?: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title style={[styles.cardTitle, { color: textColor }]}>{title}</Title>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name={icon as any} size={32} color={color} />
              {onPress && (
                <MaterialIcons name="visibility" size={16} color={textMutedColor} style={styles.detailsIcon} />
              )}
            </View>
          </View>
          <View style={styles.cardStats}>
            <Title style={[styles.statValue, { color }]}>{value}</Title>
            {subtitle && (
              <Caption style={[styles.statSubtitle, { color: textMutedColor }]}>
                {subtitle}
              </Caption>
            )}
            {onPress && (
              <Caption style={[styles.clickHint, { color: textMutedColor }]}>
                Tap to see details
              </Caption>
            )}
          </View>
          </View>
        </PaperCard>
    </TouchableOpacity>
  );

  const renderInstructorCalendar = () => (
    <PaperCard style={[styles.calendarCard, { backgroundColor: surfaceColor }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Title style={[styles.cardTitle, { color: textColor }]}>Schedule Calendar</Title>
          <MaterialIcons name="calendar-today" size={32} color={primaryColor} />
          </View>
        <ScrollView style={styles.calendarContent} showsVerticalScrollIndicator={false}>
          {instructorData.calendarData.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-available" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No scheduled classes for the next 2 weeks
              </Text>
        </View>
          ) : (
            instructorData.calendarData.map((day) => (
              <View key={day.date} style={[styles.calendarDay, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.calendarDateHeader}>
                  <Text style={[styles.calendarDate, { color: textColor }]}>
                    {new Date(day.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Caption style={[styles.calendarClassCount, { color: textMutedColor }]}>
                    {day.classes.length} class{day.classes.length !== 1 ? 'es' : ''}
                  </Caption>
                </View>
                {day.classes.map((classItem) => (
                  <View key={classItem.id} style={[styles.calendarClass, { backgroundColor: primaryColor + '10' }]}>
                    <View style={styles.calendarClassInfo}>
                      <Text style={[styles.calendarClassName, { color: textColor }]}>
                        {classItem.name}
                      </Text>
                      <Text style={[styles.calendarClassTime, { color: textMutedColor }]}>
                        {classItem.time}
                      </Text>
                    </View>
                    <View style={styles.calendarClassStats}>
                      <Text style={[styles.calendarClassEnrollment, { color: primaryColor }]}>
                        {classItem.enrolled}/{classItem.capacity}
                      </Text>
                      <View style={[
                        styles.calendarClassStatus,
                        { 
                          backgroundColor: classItem.status === 'scheduled' ? successColor + '20' : 
                                         classItem.status === 'completed' ? primaryColor + '20' :
                                         classItem.status === 'cancelled' ? errorColor + '20' : warningColor + '20'
                        }
                      ]}>
                        <Text style={[
                          styles.calendarClassStatusText,
                          { 
                            color: classItem.status === 'scheduled' ? successColor : 
                                   classItem.status === 'completed' ? primaryColor :
                                   classItem.status === 'cancelled' ? errorColor : warningColor
                          }
                        ]}>
                          {(classItem.status || 'unknown').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
      </PaperCard>
    );

  const renderClientCard = (
    title: string,
    count: number,
    clients: ClientData[],
    icon: string,
    color: string,
    clientType: string
  ) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedClientType(clientType);
        setShowClientModal(true);
      }}
    >
        <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title style={[styles.cardTitle, { color: textColor }]}>{title}</Title>
            <MaterialIcons name={icon as any} size={32} color={color} />
        </View>
          <View style={styles.cardStats}>
            <Title style={[styles.statValue, { color }]}>{count}</Title>
            <Caption style={[styles.statSubtitle, { color: textMutedColor }]}>
              Click to view details
            </Caption>
          </View>
          </View>
        </PaperCard>
    </TouchableOpacity>
  );

  const renderClientModal = () => {
    let clients: ClientData[] = [];
    let modalTitle = '';

    switch (selectedClientType) {
      case 'new':
        clients = clientsData.newClients;
        modalTitle = 'New Clients (Last 7 Days)';
        break;
      case 'neverSubscribed':
        clients = clientsData.neverSubscribed;
        modalTitle = 'Clients Never Had Subscription';
        break;
      case 'didntRenew':
        clients = clientsData.didntRenew;
        modalTitle = 'Clients That Didn\'t Renew';
        break;
      case 'prospects':
        clients = clientsData.prospects;
        modalTitle = 'Prospects';
        break;
      default:
        clients = [];
    }

    return (
      <Portal>
        <Modal
          visible={showClientModal}
          onDismiss={() => setShowClientModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
        >
          <View style={styles.modalHeader}>
            <Title style={[styles.modalTitle, { color: textColor }]}>{modalTitle}</Title>
            <TouchableOpacity onPress={() => setShowClientModal(false)}>
              <MaterialIcons name="close" size={24} color={textMutedColor} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {clients.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={48} color={textMutedColor} />
                <Text style={[styles.emptyText, { color: textMutedColor }]}>
                  No clients found in this category
                </Text>
        </View>
            ) : (
              clients.map((client, index) => (
                <View key={`client-${client.id}-${index}`} style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
                  <View style={styles.clientInfo}>
                    <Title style={[styles.clientName, { color: textColor }]}>{client.name}</Title>
                    <Text style={[styles.clientEmail, { color: textMutedColor }]}>{client.email}</Text>
                    {client.phone && (
                      <Text style={[styles.clientPhone, { color: textMutedColor }]}>{client.phone}</Text>
                    )}
                    {client.join_date && (
                      <Caption style={[styles.clientDate, { color: textMutedColor }]}>
                        Joined: {new Date(client.join_date).toLocaleDateString()}
                      </Caption>
                    )}
                    {client.subscription_info?.expired_date && (
                      <Caption style={[styles.clientDate, { color: errorColor }]}>
                        Expired: {new Date(client.subscription_info.expired_date).toLocaleDateString()}
                      </Caption>
                    )}
          </View>
                  <View style={[styles.clientStatus, { backgroundColor: client.status === 'active' ? successColor + '20' : warningColor + '20' }]}>
                    <Text style={[styles.statusText, { color: client.status === 'active' ? successColor : warningColor }]}>
                      {client.status.toUpperCase()}
                    </Text>
          </View>
          </View>
              ))
            )}
        </ScrollView>
        </Modal>
      </Portal>
    );
  };

  const renderOverviewModal = () => (
    <Portal>
      <Modal
        visible={showOverviewModal}
        onDismiss={() => setShowOverviewModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            {overviewDetails.title}
          </Title>
          <TouchableOpacity onPress={() => setShowOverviewModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
          </View>

        <ScrollView style={styles.modalContent}>
          {overviewDetails.clients.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people-outline" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No clients found for this category
              </Text>
          </View>
          ) : (
            overviewDetails.clients.map((client, index) => (
              <View key={`overview-client-${client.id}-${index}`} style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.clientInfo}>
                  <Title style={[styles.clientName, { color: textColor }]}>{client.name}</Title>
                  <Text style={[styles.clientEmail, { color: textMutedColor }]}>{client.email}</Text>
                  {client.phone && (
                    <Text style={[styles.clientPhone, { color: textMutedColor }]}>{client.phone}</Text>
                  )}
                  {client.join_date && (
                    <Caption style={[styles.clientDate, { color: textMutedColor }]}>
                      Joined: {new Date(client.join_date).toLocaleDateString()}
                    </Caption>
                  )}
        </View>
                <View style={styles.subscriptionClientInfo}>
                  <View style={[styles.clientStatus, { backgroundColor: successColor + '20' }]}>
                    <Text style={[styles.statusText, { color: successColor }]}>
                      {client.status.toUpperCase()}
                    </Text>
                  </View>
                  {client.subscription_info && (
                    <View style={styles.subscriptionDetails}>
                      <Text style={[styles.subscriptionPrice, { color: primaryColor }]}>
                        {client.subscription_info.subscription_plans?.name || 'Unknown Plan'}
                      </Text>
                      {client.subscription_info.end_date && (
                        <Text style={[styles.remainingClasses, { color: textMutedColor }]}>
                          Expires: {new Date(client.subscription_info.end_date).toLocaleDateString()}
                        </Text>
                      )}
                      {client.subscription_info.remaining_classes && (
                        <Text style={[styles.remainingClasses, { color: warningColor }]}>
                          {client.subscription_info.remaining_classes} classes left
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderBusinessActivityModal = () => (
    <Portal>
      <Modal
        visible={showBusinessActivityModal}
        onDismiss={() => setShowBusinessActivityModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            Recent Business Activity
          </Title>
          <TouchableOpacity onPress={() => setShowBusinessActivityModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
        </View>

        {/* Business Stats Summary */}
        <View style={styles.businessModalStats}>
          <View style={styles.businessModalStatsGrid}>
            <View style={styles.businessModalStatItem}>
              <Text style={[styles.businessModalStatNumber, { color: '#4CAF50' }]}>
                {businessActivityStats.newSubscriptionsToday}
              </Text>
              <Caption style={[styles.businessModalStatLabel, { color: textMutedColor }]}>
                Subscriptions Today
              </Caption>
            </View>
            
            <View style={styles.businessModalStatItem}>
              <Text style={[styles.businessModalStatNumber, { color: '#2196F3' }]}>
                {businessActivityStats.newSubscriptionsWeek}
              </Text>
              <Caption style={[styles.businessModalStatLabel, { color: textMutedColor }]}>
                Subscriptions This Week
              </Caption>
            </View>
            
            <View style={styles.businessModalStatItem}>
              <Text style={[styles.businessModalStatNumber, { color: '#FF9800' }]}>
                {businessActivityStats.newClientsToday}
              </Text>
              <Caption style={[styles.businessModalStatLabel, { color: textMutedColor }]}>
                New Clients Today
              </Caption>
            </View>
            
            <View style={styles.businessModalStatItem}>
              <Text style={[styles.businessModalStatNumber, { color: '#9C27B0' }]}>
                {businessActivityStats.newClientsWeek}
              </Text>
              <Caption style={[styles.businessModalStatLabel, { color: textMutedColor }]}>
                New Clients This Week
              </Caption>
            </View>
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {businessActivityStats.recentActivities.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="trending-up" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No recent business activities found
              </Text>
              <Caption style={[styles.emptySubtext, { color: textMutedColor }]}>
                New subscriptions and client registrations will appear here
              </Caption>
            </View>
          ) : (
            businessActivityStats.recentActivities.map((activity) => (
              <View key={activity.id} style={[styles.businessModalActivityItem, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.businessModalActivityHeader}>
                  <View style={styles.businessModalActivityIcon}>
                    <MaterialIcons 
                      name={activity.type === 'new_subscription' ? 'card-membership' : 'person-add'} 
                      size={24} 
                      color={activity.type === 'new_subscription' ? '#4CAF50' : '#FF9800'} 
                    />
                  </View>
                  <View style={styles.businessModalActivityInfo}>
                    <Text style={[styles.businessModalActivityTitle, { color: textColor }]}>
                      {activity.title}
                    </Text>
                    <Text style={[styles.businessModalActivityDescription, { color: textMutedColor }]}>
                      {activity.description}
                    </Text>
                    <Caption style={[styles.businessModalActivityTime, { color: textMutedColor }]}>
                      {formatTimeAgo(activity.created_at)} • {new Date(activity.created_at).toLocaleDateString()}
                    </Caption>
                  </View>
                </View>
                
                {activity.metadata && (
                  <View style={styles.businessModalActivityMetadata}>
                    {activity.metadata.client_email && (
                      <View style={styles.businessModalMetadataItem}>
                        <MaterialIcons name="email" size={16} color={textMutedColor} />
                        <Text style={[styles.businessModalMetadataText, { color: textMutedColor }]}>
                          {activity.metadata.client_email}
                        </Text>
                      </View>
                    )}
                    
                    {activity.metadata.plan_name && (
                      <View style={styles.businessModalMetadataItem}>
                        <MaterialIcons name="card-membership" size={16} color={textMutedColor} />
                        <Text style={[styles.businessModalMetadataText, { color: textMutedColor }]}>
                          {activity.metadata.plan_name}
                        </Text>
                      </View>
                    )}
                    
                    {activity.metadata.monthly_price && (
                      <View style={styles.businessModalMetadataItem}>
                        <MaterialIcons name="attach-money" size={16} color={textMutedColor} />
                        <Text style={[styles.businessModalMetadataText, { color: textMutedColor }]}>
                          {activity.metadata.monthly_price.toLocaleString()} ALL/month
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderSourceCard = (
    title: string,
    value: number,
    icon: string,
    color: string,
    subtitle?: string,
    cardType?: string
  ) => (
    <TouchableOpacity 
      onPress={() => cardType && loadSourceOverviewDetails(cardType)} 
      disabled={!cardType}
      activeOpacity={0.7}
    >
      <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title style={[styles.cardTitle, { color: textColor }]}>{title}</Title>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name={icon as any} size={32} color={color} />
              {cardType && (
                <MaterialIcons name="visibility" size={16} color={textMutedColor} style={styles.detailsIcon} />
              )}
            </View>
          </View>
          <View style={styles.cardStats}>
            <Title style={[styles.statValue, { color }]}>{value}</Title>
            {subtitle && (
              <Caption style={[styles.statSubtitle, { color: textMutedColor }]}>
                {subtitle}
              </Caption>
            )}
            {cardType && (
              <Caption style={[styles.clickHint, { color: textMutedColor }]}>
                Tap to see details
              </Caption>
            )}
          </View>
        </View>
      </PaperCard>
    </TouchableOpacity>
  );

  const renderReferralSourceModal = () => (
    <Portal>
      <Modal
        visible={showReferralSourceModal}
        onDismiss={() => setShowReferralSourceModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            {selectedReferralSource?.source || 'Referral Source Details'}
          </Title>
          <TouchableOpacity onPress={() => setShowReferralSourceModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
        </View>

        {selectedReferralSource && (
          <>
            <View style={styles.referralModalStats}>
              <View style={styles.referralModalStatsGrid}>
                <View style={styles.referralModalStatItem}>
                  <Text style={[styles.referralModalStatNumber, { color: '#4CAF50' }]}>
                    {selectedReferralSource.count}
                  </Text>
                  <Caption style={[styles.referralModalStatLabel, { color: textMutedColor }]}>
                    Total Clients
                  </Caption>
                </View>
                
                <View style={styles.referralModalStatItem}>
                  <Text style={[styles.referralModalStatNumber, { color: '#2196F3' }]}>
                    {selectedReferralSource.percentage.toFixed(1)}%
                  </Text>
                  <Caption style={[styles.referralModalStatLabel, { color: textMutedColor }]}>
                    of All Sources
                  </Caption>
                </View>
                
                <View style={styles.referralModalStatItem}>
                  <Text style={[styles.referralModalStatNumber, { color: '#FF9800' }]}>
                    {selectedReferralSource.recent_clients.filter(c => c.subscription_status === 'active').length}
                  </Text>
                  <Caption style={[styles.referralModalStatLabel, { color: textMutedColor }]}>
                    Active Subscribers
                  </Caption>
                </View>
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              <Title style={[styles.referralModalSectionTitle, { color: textColor }]}>
                Recent Clients from {selectedReferralSource.source}
              </Title>
              
              {selectedReferralSource.recent_clients.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="people-outline" size={48} color={textMutedColor} />
                  <Text style={[styles.emptyText, { color: textMutedColor }]}>
                    No clients found for this source
                  </Text>
                </View>
              ) : (
                selectedReferralSource.recent_clients.map((client) => (
                  <View key={client.id} style={[styles.referralClientItem, { borderBottomColor: textMutedColor + '20' }]}>
                    <View style={styles.referralClientInfo}>
                      <Text style={[styles.referralClientName, { color: textColor }]}>
                        {client.name}
                      </Text>
                      <Text style={[styles.referralClientEmail, { color: textMutedColor }]}>
                        {client.email}
                      </Text>
                      {client.phone && (
                        <Text style={[styles.referralClientPhone, { color: textMutedColor }]}>
                          {client.phone}
                        </Text>
                      )}
                      <Caption style={[styles.referralClientDate, { color: textMutedColor }]}>
                        Joined: {new Date(client.created_at).toLocaleDateString()}
                      </Caption>
                    </View>
                    
                    <View style={styles.referralClientStatus}>
                      <View style={[
                        styles.referralStatusBadge,
                        {
                          backgroundColor: client.subscription_status === 'active' ? successColor + '20' :
                                          client.subscription_status === 'inactive' ? warningColor + '20' :
                                          errorColor + '20'
                        }
                      ]}>
                        <Text style={[
                          styles.referralStatusText,
                          {
                            color: client.subscription_status === 'active' ? successColor :
                                   client.subscription_status === 'inactive' ? warningColor :
                                   errorColor
                          }
                        ]}>
                          {client.subscription_status === 'active' ? 'SUBSCRIBED' :
                           client.subscription_status === 'inactive' ? 'INACTIVE' :
                           'NO SUBSCRIPTION'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </>
        )}
      </Modal>
    </Portal>
  );

  const renderSourceOverviewModal = () => (
    <Portal>
      <Modal
        visible={showSourceOverviewModal}
        onDismiss={() => setShowSourceOverviewModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            {sourceOverviewData.title}
          </Title>
          <TouchableOpacity onPress={() => setShowSourceOverviewModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.sourceOverviewModalStats}>
          <Caption style={[styles.sourceOverviewModalDescription, { color: textMutedColor }]}>
            {sourceOverviewData.description}
          </Caption>
          
          <View style={styles.sourceOverviewStatsRow}>
            <View style={styles.sourceOverviewStat}>
              <Text style={[styles.sourceOverviewStatNumber, { color: primaryColor }]}>
                {sourceOverviewData.clients.length}
              </Text>
              <Caption style={[styles.sourceOverviewStatLabel, { color: textMutedColor }]}>
                Total Clients
              </Caption>
            </View>
            
            <View style={styles.sourceOverviewStat}>
              <Text style={[styles.sourceOverviewStatNumber, { color: successColor }]}>
                {sourceOverviewData.clients.filter(c => c.subscription_status === 'active').length}
              </Text>
              <Caption style={[styles.sourceOverviewStatLabel, { color: textMutedColor }]}>
                Active Subscribers
              </Caption>
            </View>
            
            <View style={styles.sourceOverviewStat}>
              <Text style={[styles.sourceOverviewStatNumber, { color: warningColor }]}>
                {sourceOverviewData.clients.filter(c => c.subscription_status === 'never_subscribed').length}
              </Text>
              <Caption style={[styles.sourceOverviewStatLabel, { color: textMutedColor }]}>
                No Subscription
              </Caption>
            </View>

            {selectedSourceType === 'withSources' && (
              <View style={styles.sourceOverviewStat}>
                <Text style={[styles.sourceOverviewStatNumber, { color: '#2196F3' }]}>
                  {new Set(sourceOverviewData.clients.map(c => c.referral_source).filter(Boolean)).size}
                </Text>
                <Caption style={[styles.sourceOverviewStatLabel, { color: textMutedColor }]}>
                  Unique Sources
                </Caption>
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {sourceOverviewData.clients.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people-outline" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No clients found in this category
              </Text>
            </View>
          ) : (
            sourceOverviewData.clients.map((client) => (
              <View key={client.id} style={[styles.sourceOverviewClientItem, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.sourceOverviewClientInfo}>
                  <Text style={[styles.sourceOverviewClientName, { color: textColor }]}>
                    {client.name}
                  </Text>
                  <Text style={[styles.sourceOverviewClientEmail, { color: textMutedColor }]}>
                    {client.email}
                  </Text>
                  {client.phone && (
                    <Text style={[styles.sourceOverviewClientPhone, { color: textMutedColor }]}>
                      {client.phone}
                    </Text>
                  )}
                  <Caption style={[styles.sourceOverviewClientDate, { color: textMutedColor }]}>
                    Joined: {new Date(client.created_at).toLocaleDateString()}
                  </Caption>
                  {client.referral_source && (
                    <View style={styles.sourceOverviewClientSource}>
                      <MaterialIcons name="trending-up" size={14} color="#2196F3" />
                      <Caption style={[styles.sourceOverviewClientSourceText, { color: '#2196F3' }]}>
                        Source: {client.referral_source}
                      </Caption>
                    </View>
                  )}
                </View>
                
                <View style={styles.sourceOverviewClientStatus}>
                  <View style={[
                    styles.sourceOverviewStatusBadge,
                    {
                      backgroundColor: client.subscription_status === 'active' ? successColor + '20' :
                                      client.subscription_status === 'inactive' ? warningColor + '20' :
                                      errorColor + '20'
                    }
                  ]}>
                    <Text style={[
                      styles.sourceOverviewStatusText,
                      {
                        color: client.subscription_status === 'active' ? successColor :
                               client.subscription_status === 'inactive' ? warningColor :
                               errorColor
                      }
                    ]}>
                      {client.subscription_status === 'active' ? 'SUBSCRIBED' :
                       client.subscription_status === 'inactive' ? 'INACTIVE' :
                       'NO SUBSCRIPTION'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderRevenueCard = (
    title: string,
    value: number,
    icon: string,
    color: string,
    subtitle?: string,
    trend?: number,
    onPress?: () => void
  ) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
        <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title style={[styles.cardTitle, { color: textColor }]}>{title}</Title>
            <View style={styles.cardIconContainer}>
              <MaterialIcons name={icon as any} size={32} color={color} />
              {onPress && (
                <MaterialIcons name="visibility" size={16} color={textMutedColor} style={styles.detailsIcon} />
              )}
            </View>
          </View>
          <View style={styles.cardStats}>
            <Title style={[styles.statValue, { color }]}>${value.toLocaleString()}</Title>
            {subtitle && (
              <Caption style={[styles.statSubtitle, { color: textMutedColor }]}>
                {subtitle}
              </Caption>
            )}
            {trend !== undefined && (
              <View style={styles.trendContainer}>
                <MaterialIcons 
                  name={trend >= 0 ? "trending-up" : "trending-down"} 
                  size={16} 
                  color={trend >= 0 ? successColor : errorColor} 
                />
                <Text style={[
                  styles.trendText, 
                  { color: trend >= 0 ? successColor : errorColor }
                ]}>
                  {Math.abs(trend).toFixed(1)}%
                </Text>
              </View>
            )}
            {onPress && (
              <Caption style={[styles.clickHint, { color: textMutedColor }]}>
                Tap to see details
              </Caption>
            )}
          </View>
          </View>
        </PaperCard>
    </TouchableOpacity>
  );

  const renderDatePicker = () => (
    <View style={styles.datePickerContainer}>
      <View style={styles.datePickerHeader}>
        <Title style={[styles.datePickerTitle, { color: textColor }]}>Revenue Analysis</Title>
        <Caption style={[styles.datePickerSubtitle, { color: textMutedColor }]}>
          Select date range to analyze revenue data
        </Caption>
                    </View>
      
      <View style={styles.datePickerRow}>
        <TouchableOpacity 
          style={[styles.dateButton, { backgroundColor: surfaceColor, borderColor: primaryColor }]}
          onPress={() => setShowStartDatePicker(true)}
        >
          <MaterialIcons name="calendar-today" size={20} color={primaryColor} />
          <Text style={[styles.dateButtonText, { color: textColor }]}>
            From: {revenueStartDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.dateButton, { backgroundColor: surfaceColor, borderColor: primaryColor }]}
          onPress={() => setShowEndDatePicker(true)}
        >
          <MaterialIcons name="calendar-today" size={20} color={primaryColor} />
          <Text style={[styles.dateButtonText, { color: textColor }]}>
            To: {revenueEndDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
          </View>
        </View>
  );

  const renderSubscriptionCard = (subscription: SubscriptionData) => (
    <TouchableOpacity
      key={subscription.id}
      onPress={() => {
        setSelectedSubscription(subscription);
        setShowSubscriptionModal(true);
      }}
    >
        <PaperCard style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title style={[styles.cardTitle, { color: textColor }]}>{subscription.name}</Title>
            <MaterialIcons name="card-membership" size={32} color={primaryColor} />
          </View>
          <View style={styles.cardStats}>
            <Title style={[styles.statValue, { color: primaryColor }]}>{subscription.client_count}</Title>
            <Caption style={[styles.statSubtitle, { color: textMutedColor }]}>
              Active clients
            </Caption>
            <View style={styles.subscriptionDetails}>
              <Text style={[styles.subscriptionPrice, { color: successColor }]}>
                ${subscription.monthly_price}/month
              </Text>
              <Text style={[styles.subscriptionClasses, { color: textMutedColor }]}>
                {subscription.monthly_classes} classes
              </Text>
              <Text style={[styles.subscriptionEquipment, { color: warningColor }]}>
                {subscription.equipment_access}
              </Text>
          </View>
          </View>
          </View>
        </PaperCard>
    </TouchableOpacity>
  );

  const renderSubscriptionModal = () => {
    if (!selectedSubscription) return null;

    return (
      <Portal>
        <Modal
          visible={showSubscriptionModal}
          onDismiss={() => setShowSubscriptionModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
        >
          <View style={styles.modalHeader}>
            <Title style={[styles.modalTitle, { color: textColor }]}>
              {selectedSubscription.name} - Active Clients
            </Title>
            <TouchableOpacity onPress={() => setShowSubscriptionModal(false)}>
              <MaterialIcons name="close" size={24} color={textMutedColor} />
            </TouchableOpacity>
        </View>

          <View style={styles.subscriptionInfo}>
            <Text style={[styles.subscriptionInfoText, { color: textColor }]}>
              Price: <Text style={{ color: successColor }}>${selectedSubscription.monthly_price}/month</Text>
            </Text>
            <Text style={[styles.subscriptionInfoText, { color: textColor }]}>
              Classes: <Text style={{ color: primaryColor }}>{selectedSubscription.monthly_classes} per month</Text>
            </Text>
            <Text style={[styles.subscriptionInfoText, { color: textColor }]}>
              Equipment: <Text style={{ color: warningColor }}>{selectedSubscription.equipment_access}</Text>
            </Text>
            <Text style={[styles.subscriptionInfoText, { color: textColor }]}>
              Category: <Text style={{ color: textMutedColor }}>{selectedSubscription.category}</Text>
            </Text>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedSubscription.clients.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="people-outline" size={48} color={textMutedColor} />
                <Text style={[styles.emptyText, { color: textMutedColor }]}>
                  No active clients for this subscription
                </Text>
          </View>
            ) : (
              selectedSubscription.clients.map((client, index) => (
                <View key={`subscription-client-${client.id}-${index}`} style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
                  <View style={styles.clientInfo}>
                    <Title style={[styles.clientName, { color: textColor }]}>{client.name}</Title>
                    <Text style={[styles.clientEmail, { color: textMutedColor }]}>{client.email}</Text>
                    {client.phone && (
                      <Text style={[styles.clientPhone, { color: textMutedColor }]}>{client.phone}</Text>
                    )}
                    <Caption style={[styles.clientDate, { color: textMutedColor }]}>
                      Started: {new Date(client.start_date).toLocaleDateString()}
                    </Caption>
                    <Caption style={[styles.clientDate, { color: textMutedColor }]}>
                      Expires: {new Date(client.end_date).toLocaleDateString()}
                    </Caption>
          </View>
                  <View style={styles.subscriptionClientInfo}>
                    <View style={[styles.clientStatus, { backgroundColor: successColor + '20' }]}>
                      <Text style={[styles.statusText, { color: successColor }]}>
                        ACTIVE
                      </Text>
          </View>
                    <Text style={[styles.remainingClasses, { color: primaryColor }]}>
                      {client.remaining_classes} classes left
                    </Text>
        </View>
                    </View>
              ))
            )}
        </ScrollView>
        </Modal>
      </Portal>
    );
  };

  const renderRevenueModal = () => (
    <Portal>
      <Modal
        visible={showRevenueModal}
        onDismiss={() => setShowRevenueModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            {revenueDetails.title}
          </Title>
          <TouchableOpacity onPress={() => setShowRevenueModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
          </View>

        <View style={styles.revenueModalSummary}>
          <Text style={[styles.revenueModalTotal, { color: primaryColor }]}>
            ${revenueDetails.totalAmount.toLocaleString()}
          </Text>
          <Caption style={[styles.revenueModalTimeFrame, { color: textMutedColor }]}>
            {revenueDetails.timeFrame}
          </Caption>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Payments Section */}
          {revenueDetails.payments.length > 0 && (
            <View style={styles.revenueSection}>
              <Text style={[styles.revenueSectionTitle, { color: textColor }]}>
                💳 Payments ({revenueDetails.payments.length})
              </Text>
              {revenueDetails.payments.map((payment) => (
                <View key={payment.id} style={[styles.revenueItem, { borderBottomColor: textMutedColor + '20' }]}>
                  <View style={styles.revenueItemHeader}>
                    <Text style={[styles.revenueClientName, { color: textColor }]}>
                      {payment.client_name}
                    </Text>
                    <Text style={[styles.revenueAmount, { color: successColor }]}>
                      +${payment.amount.toLocaleString()}
                    </Text>
        </View>
                  <Text style={[styles.revenueClientEmail, { color: textMutedColor }]}>
                    {payment.client_email}
                  </Text>
                  <View style={styles.revenueItemDetails}>
                    <Text style={[styles.revenueMethod, { color: textMutedColor }]}>
                      {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                    </Text>
                    {payment.subscription_info && (
                      <Text style={[styles.revenueSubscription, { color: primaryColor }]}>
                        📋 {payment.subscription_info}
                      </Text>
                    )}
                    {payment.description && (
                      <Text style={[styles.revenueDescription, { color: textMutedColor }]}>
                        {payment.description}
                      </Text>
                    )}
                    {payment.transaction_id && (
                      <Text style={[styles.revenueDescription, { color: textMutedColor }]}>
                        Transaction: {payment.transaction_id}
                      </Text>
                    )}
                    </View>
                    </View>
              ))}
                    </View>
          )}

          {/* Credits Section */}
          {revenueDetails.credits.length > 0 && (
            <View style={styles.revenueSection}>
              <Text style={[styles.revenueSectionTitle, { color: textColor }]}>
                🎁 Manual Credits ({revenueDetails.credits.length})
              </Text>
              {revenueDetails.credits.map((credit) => (
                <View key={credit.id} style={[styles.revenueItem, { borderBottomColor: textMutedColor + '20' }]}>
                  <View style={styles.revenueItemHeader}>
                    <Text style={[styles.revenueClientName, { color: textColor }]}>
                      {credit.client_name}
                    </Text>
                    <Text style={[styles.revenueAmount, { color: warningColor }]}>
                      +${credit.amount.toLocaleString()}
                    </Text>
                    </View>
                  <Text style={[styles.revenueClientEmail, { color: textMutedColor }]}>
                    {credit.client_email}
                  </Text>
                  <View style={styles.revenueItemDetails}>
                    <Text style={[styles.revenueMethod, { color: textMutedColor }]}>
                      {credit.reason} • {new Date(credit.credit_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
          )}

          {/* Empty State */}
          {revenueDetails.payments.length === 0 && revenueDetails.credits.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="money-off" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No revenue found for this period
              </Text>
        </View>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderInstructorClassModal = () => (
    <Portal>
      <Modal
        visible={showInstructorClassModal}
        onDismiss={() => setShowInstructorClassModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            This Week's Classes
          </Title>
          <TouchableOpacity onPress={() => setShowInstructorClassModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
          </View>

        <ScrollView style={styles.modalContent}>
          {instructorData.weeklyClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="event-busy" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No classes scheduled for this week
              </Text>
            </View>
          ) : (
            instructorData.weeklyClasses.map((classItem) => (
              <View key={classItem.id} style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.clientInfo}>
                  <Title style={[styles.clientName, { color: textColor }]}>{classItem.name}</Title>
                  <Text style={[styles.clientEmail, { color: textMutedColor }]}>
                    {new Date(classItem.date).toLocaleDateString()} at {classItem.time}
                  </Text>
                  <Text style={[styles.clientPhone, { color: textMutedColor }]}>
                    Category: {classItem.category} • Duration: {classItem.duration} min
                  </Text>
                </View>
                <View style={styles.subscriptionClientInfo}>
                  <Text style={[styles.subscriptionPrice, { color: primaryColor }]}>
                    {classItem.enrolled}/{classItem.capacity} enrolled
                  </Text>
                  <View style={[
                    styles.clientStatus,
                    { backgroundColor: classItem.status === 'scheduled' ? successColor + '20' : warningColor + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: classItem.status === 'scheduled' ? successColor : warningColor }
                    ]}>
                      {classItem.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderInstructorAttendanceModal = () => (
    <Portal>
      <Modal
        visible={showInstructorAttendanceModal}
        onDismiss={() => setShowInstructorAttendanceModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            Attendance Statistics ({instructorStartDate.toLocaleDateString()} - {instructorEndDate.toLocaleDateString()})
          </Title>
          <TouchableOpacity onPress={() => setShowInstructorAttendanceModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <View style={[styles.revenueSection, { marginBottom: spacing.lg }]}>
            <Text style={[styles.revenueSectionTitle, { color: textColor }]}>Performance Overview</Text>
            
            <View style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
              <View style={styles.clientInfo}>
                <Title style={[styles.clientName, { color: textColor }]}>Total Classes Taught</Title>
                <Text style={[styles.clientEmail, { color: textMutedColor }]}>
                  Completed classes in selected period
                </Text>
        </View>
              <View style={styles.subscriptionClientInfo}>
                <Text style={[styles.subscriptionPrice, { color: primaryColor, fontSize: 24 }]}>
                  {instructorData.attendanceStats.totalClasses}
                </Text>
            </View>
            </View>

            <View style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
              <View style={styles.clientInfo}>
                <Title style={[styles.clientName, { color: textColor }]}>Total Students Taught</Title>
                <Text style={[styles.clientEmail, { color: textMutedColor }]}>
                  Sum of all students across all classes in selected period
                </Text>
              </View>
              <View style={styles.subscriptionClientInfo}>
                <Text style={[styles.subscriptionPrice, { color: successColor, fontSize: 24 }]}>
                  {instructorData.attendanceStats.totalStudents}
                </Text>
            </View>
          </View>
          
            <View style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
              <View style={styles.clientInfo}>
                <Title style={[styles.clientName, { color: textColor }]}>Personal Classes</Title>
                <Text style={[styles.clientEmail, { color: textMutedColor }]}>
                  Personal training sessions in selected period
                </Text>
            </View>
              <View style={styles.subscriptionClientInfo}>
                <Text style={[styles.subscriptionPrice, { color: warningColor, fontSize: 24 }]}>
                  {instructorData.attendanceStats.personalClasses}
                </Text>
              </View>
            </View>

          </View>
        </View>
      </Modal>
    </Portal>
  );

  const renderAssignedClientsModal = () => (
    <Portal>
      <Modal
        visible={showAssignedClientsModal}
        onDismiss={() => setShowAssignedClientsModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            Assigned Personal Training Clients
          </Title>
          <TouchableOpacity onPress={() => setShowAssignedClientsModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
          </View>

        <ScrollView style={styles.modalContent}>
          {instructorData.assignedClients.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment-ind" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No assigned personal training clients
              </Text>
        </View>
          ) : (
            instructorData.assignedClients.map((client, index) => (
              <View key={`instructor-client-${client.id}-${index}`} style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.clientInfo}>
                  <Title style={[styles.clientName, { color: textColor }]}>{client.name}</Title>
                  <Text style={[styles.clientEmail, { color: textMutedColor }]}>{client.email}</Text>
                  {client.phone && (
                    <Text style={[styles.clientPhone, { color: textMutedColor }]}>{client.phone}</Text>
                  )}
                  <Caption style={[styles.clientDate, { color: textMutedColor }]}>
                    Assigned: {new Date(client.start_date).toLocaleDateString()}
                  </Caption>
                </View>
                <View style={styles.subscriptionClientInfo}>
                  <View style={[styles.clientStatus, { backgroundColor: successColor + '20' }]}>
                    <Text style={[styles.statusText, { color: successColor }]}>
                      {client.assignment_type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.clientStatus, { backgroundColor: primaryColor + '20', marginTop: spacing.xs }]}>
                    <Text style={[styles.statusText, { color: primaryColor }]}>
                      {client.status.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.subscriptionDetails}>
                    <Text style={[styles.remainingClasses, { color: warningColor, fontWeight: '600' }]}>
                      {client.remaining_classes} classes left
                    </Text>
                    <Text style={[styles.subscriptionPrice, { color: textMutedColor, fontSize: 12 }]}>
                      {client.subscription_plan}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderPersonalClassesModal = () => (
    <Portal>
      <Modal
        visible={showPersonalClassesModal}
        onDismiss={() => setShowPersonalClassesModal(false)}
        contentContainerStyle={[styles.modal, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Title style={[styles.modalTitle, { color: textColor }]}>
            Personal Training Sessions ({instructorStartDate.toLocaleDateString()} - {instructorEndDate.toLocaleDateString()})
          </Title>
          <TouchableOpacity onPress={() => setShowPersonalClassesModal(false)}>
            <MaterialIcons name="close" size={24} color={textMutedColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {instructorData.personalClassesDetails.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="person" size={48} color={textMutedColor} />
              <Text style={[styles.emptyText, { color: textMutedColor }]}>
                No personal training sessions in selected period
              </Text>
            </View>
          ) : (
            instructorData.personalClassesDetails.map((classItem) => (
              <View key={classItem.id} style={[styles.clientItem, { borderBottomColor: textMutedColor + '20' }]}>
                <View style={styles.clientInfo}>
                  <Title style={[styles.clientName, { color: textColor }]}>{classItem.name || 'Personal Training Session'}</Title>
                  <Text style={[styles.clientEmail, { color: textMutedColor }]}>
                    {(() => {
                      if (!classItem.date) return 'Date not available';
                      const date = new Date(classItem.date);
                      return isNaN(date.getTime()) ? 'Invalid date format' : date.toLocaleDateString();
                    })()} at {classItem.time || 'Time not set'}
                  </Text>
                  <Text style={[styles.clientPhone, { color: textMutedColor }]}>
                    Duration: {classItem.duration || 60} minutes
                  </Text>
                </View>
                <View style={styles.subscriptionClientInfo}>
                  <Text style={[styles.subscriptionPrice, { color: primaryColor }]}>
                    {classItem.enrolled || 0}/{classItem.capacity || 1} enrolled
                  </Text>
                  <View style={[
                    styles.clientStatus,
                    { 
                      backgroundColor: classItem.status === 'completed' ? successColor + '20' : 
                                     classItem.status === 'scheduled' ? primaryColor + '20' : 
                                     classItem.status === 'cancelled' ? errorColor + '20' : warningColor + '20'
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { 
                        color: classItem.status === 'completed' ? successColor : 
                               classItem.status === 'scheduled' ? primaryColor :
                               classItem.status === 'cancelled' ? errorColor : warningColor
                      }
                    ]}>
                      {classItem.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const renderInstructorDatePicker = () => (
    <View style={styles.datePickerContainer}>
      <View style={styles.datePickerHeader}>
        <Title style={[styles.datePickerTitle, { color: textColor }]}>Instructor Analysis Period</Title>
        <Caption style={[styles.datePickerSubtitle, { color: textMutedColor }]}>
          Select date range to analyze instructor performance data
        </Caption>
          </View>
      <View style={styles.datePickerRow}>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: surfaceColor, borderColor: primaryColor }]}
          onPress={() => {
            if (Platform.OS === 'web') {
              setShowInstructorStartDatePicker(true);
            } else {
              setShowInstructorStartDatePicker(true);
            }
          }}
        >
          <MaterialIcons name="calendar-today" size={20} color={primaryColor} />
          <Text style={[styles.dateButtonText, { color: textColor }]}>
            From: {instructorStartDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: surfaceColor, borderColor: primaryColor }]}
          onPress={() => {
            if (Platform.OS === 'web') {
              setShowInstructorEndDatePicker(true);
            } else {
              setShowInstructorEndDatePicker(true);
            }
          }}
        >
          <MaterialIcons name="calendar-today" size={20} color={primaryColor} />
          <Text style={[styles.dateButtonText, { color: textColor }]}>
            To: {instructorEndDate.toLocaleDateString()}
          </Text>
        </TouchableOpacity>
        </View>
    </View>
    );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={{ color: textMutedColor }}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        
      {/* Header */}
        <View style={styles.header}>
          <Title style={[styles.headerTitle, { color: textColor }]}>
            Reports & Analytics
          </Title>
          <Caption style={[styles.headerSubtitle, { color: textMutedColor }]}>
            Studio Overview & Client Statistics
          </Caption>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
              styles.tab,
              { backgroundColor: activeTab === 'overview' ? primaryColor : surfaceColor },
              { borderColor: activeTab === 'overview' ? primaryColor : textMutedColor + '30' }
            ]}
            onPress={() => setActiveTab('overview')}
          >
            <MaterialIcons 
              name="dashboard" 
              size={20} 
              color={activeTab === 'overview' ? 'white' : textMutedColor} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'overview' ? 'white' : textMutedColor }
            ]}>
              Overview
            </Text>
                </TouchableOpacity>

              <TouchableOpacity
                style={[
              styles.tab,
              { backgroundColor: activeTab === 'clients' ? primaryColor : surfaceColor },
              { borderColor: activeTab === 'clients' ? primaryColor : textMutedColor + '30' }
            ]}
            onPress={() => setActiveTab('clients')}
              >
                <MaterialIcons 
              name="people" 
                  size={20} 
              color={activeTab === 'clients' ? 'white' : textMutedColor} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'clients' ? 'white' : textMutedColor }
            ]}>
              Clients
            </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
              styles.tab,
              { backgroundColor: activeTab === 'subscriptions' ? primaryColor : surfaceColor },
              { borderColor: activeTab === 'subscriptions' ? primaryColor : textMutedColor + '30' }
            ]}
            onPress={() => setActiveTab('subscriptions')}
              >
                <MaterialIcons 
              name="card-membership" 
                  size={20} 
              color={activeTab === 'subscriptions' ? 'white' : textMutedColor} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'subscriptions' ? 'white' : textMutedColor }
            ]}>
              Subscriptions
            </Text>
                </TouchableOpacity>

              <TouchableOpacity
                style={[
              styles.tab,
              { backgroundColor: activeTab === 'revenue' ? primaryColor : surfaceColor },
              { borderColor: activeTab === 'revenue' ? primaryColor : textMutedColor + '30' }
            ]}
            onPress={() => setActiveTab('revenue')}
              >
                <MaterialIcons 
              name="attach-money" 
                  size={20} 
              color={activeTab === 'revenue' ? 'white' : textMutedColor} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'revenue' ? 'white' : textMutedColor }
            ]}>
              Revenue
            </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
              styles.tab,
              { backgroundColor: activeTab === 'instructors' ? primaryColor : surfaceColor },
              { borderColor: activeTab === 'instructors' ? primaryColor : textMutedColor + '30' }
            ]}
            onPress={() => setActiveTab('instructors')}
              >
                <MaterialIcons 
              name="fitness-center" 
                  size={20} 
              color={activeTab === 'instructors' ? 'white' : textMutedColor} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'instructors' ? 'white' : textMutedColor }
            ]}>
              Instructors
            </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
              styles.tab,
              { backgroundColor: activeTab === 'sources' ? primaryColor : surfaceColor },
              { borderColor: activeTab === 'sources' ? primaryColor : textMutedColor + '30' }
            ]}
            onPress={() => setActiveTab('sources')}
              >
                <MaterialIcons 
              name="trending-up" 
                  size={20} 
              color={activeTab === 'sources' ? 'white' : textMutedColor} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'sources' ? 'white' : textMutedColor }
            ]}>
              Client Sources
            </Text>
              </TouchableOpacity>
          </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.overviewGrid}>
            {renderOverviewCard(
              'Total Clients',
              overviewStats.totalClients,
              'people',
              primaryColor,
              'All active clients',
              'total'
            )}

            {renderOverviewCard(
              'Active Subscriptions',
              overviewStats.activeSubscriptionClients,
              'card-membership',
              successColor,
              'Clients with active plans',
              'activeSubscription'
            )}

            {renderOverviewCard(
              'Without Subscription',
              overviewStats.clientsWithoutSubscription,
              'person-off',
              warningColor,
              'Clients needing plans',
              'withoutSubscription'
            )}

            {renderOverviewCard(
              'Ending Soon',
              overviewStats.clientsEndingSoon,
              'schedule',
              errorColor,
              'Expiring in 10 days or less',
              'endingSoon'
            )}

            {renderBusinessActivityCard()}
          </View>
        )}

        {activeTab === 'clients' && (
          <View style={styles.overviewGrid}>
            {renderClientCard(
              'New Clients',
              clientsData.newClients.length,
              clientsData.newClients,
              'person-add',
              primaryColor,
              'new'
            )}

            {renderClientCard(
              'Never Subscribed',
              clientsData.neverSubscribed.length,
              clientsData.neverSubscribed,
              'assignment-late',
              warningColor,
              'neverSubscribed'
            )}

            {renderClientCard(
              'Didn\'t Renew',
              clientsData.didntRenew.length,
              clientsData.didntRenew,
              'event-busy',
              errorColor,
              'didntRenew'
            )}

            {renderClientCard(
              'Prospects',
              clientsData.prospects.length,
              clientsData.prospects,
              'visibility',
              successColor,
              'prospects'
            )}
                  </View>
        )}

        {activeTab === 'subscriptions' && (
          <View style={styles.overviewGrid}>
            {subscriptionsData.map((subscription) => renderSubscriptionCard(subscription))}
                  </View>
        )}

        {activeTab === 'revenue' && (
          <View>
            {renderDatePicker()}
            
            <View style={styles.overviewGrid}>
              {renderRevenueCard(
                'Total Revenue',
                revenueData.totalRevenue,
                'account-balance-wallet',
                primaryColor,
                `From ${revenueStartDate.toLocaleDateString()} to ${revenueEndDate.toLocaleDateString()}`,
                revenueData.growthPercentage,
                () => loadRevenueDetails('total')
              )}
              
              {renderRevenueCard(
                'This Week',
                revenueData.thisWeekRevenue,
                'today',
                successColor,
                'Last 7 days',
                undefined,
                () => loadRevenueDetails('week')
              )}
              
              {renderRevenueCard(
                'This Month',
                revenueData.thisMonthRevenue,
                'calendar-view-month',
                warningColor,
                `${new Date().toLocaleDateString('en-US', { month: 'long' })}`,
                undefined,
                () => loadRevenueDetails('month')
              )}
              
              {renderRevenueCard(
                'Today',
                revenueData.todayRevenue,
                'trending-up',
                errorColor,
                'Today\'s earnings',
                undefined,
                () => loadRevenueDetails('today')
              )}
              
              {renderRevenueCard(
                'Daily Average',
                revenueData.averageDailyRevenue,
                'bar-chart',
                textMutedColor,
                'Average per day in selected period',
                undefined,
                () => loadRevenueDetails('average')
            )}
                  </View>
          </View>
        )}

        {activeTab === 'instructors' && (
          <View>
            {renderInstructorSelector()}
            
            {selectedInstructor && (
              <View>
                {renderInstructorDatePicker()}
                <View style={styles.overviewGrid}>
                  {renderInstructorDataCard(
                    'This Week Classes',
                    instructorData.weeklyClasses.length,
                    'event',
                    primaryColor,
                    'Classes scheduled for this week',
                    () => setShowInstructorClassModal(true)
                  )}
                  
                  {renderInstructorDataCard(
                    'Total Classes',
                    instructorData.attendanceStats.totalClasses,
                    'school',
                    successColor,
                    `Classes completed from ${instructorStartDate.toLocaleDateString()} to ${instructorEndDate.toLocaleDateString()}`
                  )}
                  
                  {renderInstructorDataCard(
                    'Total Students',
                    instructorData.attendanceStats.totalStudents,
                    'people',
                    warningColor,
                    `Students taught from ${instructorStartDate.toLocaleDateString()} to ${instructorEndDate.toLocaleDateString()}`,
                    () => setShowInstructorAttendanceModal(true)
                  )}
                  
                  {renderInstructorDataCard(
                    'Personal Classes',
                    instructorData.attendanceStats.personalClasses,
                    'person',
                    primaryColor,
                    `Personal training sessions in selected period`,
                    () => setShowPersonalClassesModal(true)
                  )}
                  
                  {renderInstructorDataCard(
                    'Assigned Clients',
                    instructorData.assignedClients.length,
                    'assignment-ind',
                    successColor,
                    'Active personal training clients',
                    () => setShowAssignedClientsModal(true)
                  )}
                  </View>
                
                {renderInstructorCalendar()}
                  </View>
            )}
          </View>
        )}

        {activeTab === 'sources' && (
          <View style={styles.sourcesContainer}>
            {/* Overview Stats */}
            <View style={styles.overviewGrid}>
              {renderSourceCard(
                'Total Clients',
                referralSourceStats.totalClients,
                'people',
                primaryColor,
                'All registered clients',
                'total'
              )}

              {renderSourceCard(
                'With Source Info',
                referralSourceStats.totalWithSources,
                'info',
                successColor,
                `${referralSourceStats.totalClients > 0 ? ((referralSourceStats.totalWithSources / referralSourceStats.totalClients) * 100).toFixed(1) : 0}% completion rate`,
                'withSources'
              )}

              {renderSourceCard(
                'Missing Source',
                referralSourceStats.totalWithoutSources,
                'help-outline',
                warningColor,
                'Need follow-up for source info',
                'missingSources'
              )}

              {renderSourceCard(
                'Top Source',
                referralSourceStats.sources[0]?.count || 0,
                'trending-up',
                '#2196F3',
                referralSourceStats.mostPopularSource || 'No data',
                referralSourceStats.sources[0]?.count ? 'topSource' : undefined
              )}
            </View>

            {/* Referral Sources List */}
            <View style={styles.sourcesListContainer}>
              <Title style={[styles.sourcesTitle, { color: textColor }]}>
                📊 Client Acquisition Sources
              </Title>
              <Caption style={[styles.sourcesSubtitle, { color: textMutedColor }]}>
                Where your clients heard about your studio
              </Caption>

              {referralSourceStats.sources.length > 0 ? (
                <View style={styles.sourcesList}>
                  {referralSourceStats.sources.map((source, index) => (
                    <TouchableOpacity
                      key={source.source}
                      style={[styles.sourceItem, { backgroundColor: surfaceColor }]}
                      onPress={() => {
                        setSelectedReferralSource(source);
                        setShowReferralSourceModal(true);
                      }}
                    >
                      <View style={styles.sourceRank}>
                        <Text style={[styles.sourceRankNumber, { color: textColor }]}>
                          #{index + 1}
                        </Text>
                      </View>
                      
                      <View style={styles.sourceInfo}>
                        <Text style={[styles.sourceName, { color: textColor }]}>
                          {source.source}
                        </Text>
                        <Caption style={[styles.sourceStats, { color: textMutedColor }]}>
                          {source.count} clients • {source.percentage.toFixed(1)}% of total
                        </Caption>
                      </View>

                      <View style={styles.sourceProgress}>
                        <View style={styles.sourceProgressBar}>
                          <View
                            style={[
                              styles.sourceProgressFill,
                              {
                                width: `${source.percentage}%`,
                                backgroundColor: index === 0 ? '#4CAF50' : 
                                               index === 1 ? '#2196F3' :
                                               index === 2 ? '#FF9800' : '#9C27B0'
                              }
                            ]}
                          />
                        </View>
                        <Text style={[styles.sourceCount, { color: textColor }]}>
                          {source.count}
                        </Text>
                      </View>

                      <MaterialIcons name="chevron-right" size={24} color={textMutedColor} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.sourcesEmpty}>
                  <MaterialIcons name="trending-up" size={48} color={textMutedColor} />
                  <Text style={[styles.sourcesEmptyText, { color: textMutedColor }]}>
                    No referral source data available
                  </Text>
                  <Caption style={[styles.sourcesEmptySubtext, { color: textMutedColor }]}>
                    Client referral information will appear here as you collect it
                  </Caption>
                </View>
              )}
            </View>

            {/* Monthly Trends */}
            {referralSourceStats.monthlyTrends.length > 0 && (
              <View style={styles.trendsContainer}>
                <Title style={[styles.trendsTitle, { color: textColor }]}>
                  📈 6-Month Acquisition Trends
                </Title>
                <Caption style={[styles.trendsSubtitle, { color: textMutedColor }]}>
                  Client registration patterns over time
                </Caption>

                <View style={styles.trendsList}>
                  {referralSourceStats.monthlyTrends.map((trend, index) => (
                    <View key={trend.month} style={styles.trendItem}>
                      <View style={styles.trendHeader}>
                        <Text style={[styles.trendMonth, { color: textColor }]}>
                          {trend.month}
                        </Text>
                        <Text style={[styles.trendTotal, { color: primaryColor }]}>
                          {trend.total_clients} clients
                        </Text>
                      </View>
                      
                      {trend.sources.length > 0 && (
                        <View style={styles.trendSources}>
                          {trend.sources.slice(0, 3).map((source, sourceIndex) => (
                            <View key={source.source} style={styles.trendSourceItem}>
                              <Text style={[styles.trendSourceName, { color: textMutedColor }]}>
                                {source.source}
                              </Text>
                              <Text style={[styles.trendSourceCount, { color: textMutedColor }]}>
                                {source.count}
                              </Text>
                            </View>
                          ))}
                          {trend.sources.length > 3 && (
                            <Caption style={[styles.trendMoreSources, { color: textMutedColor }]}>
                              +{trend.sources.length - 3} more sources
                            </Caption>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* Modals */}
      {renderOverviewModal()}
      {renderClientModal()}
      {renderSubscriptionModal()}
      {renderRevenueModal()}
      {renderBusinessActivityModal()}
      {renderReferralSourceModal()}
      {renderSourceOverviewModal()}
      {renderInstructorClassModal()}
      {renderInstructorAttendanceModal()}
      {renderAssignedClientsModal()}
      {renderPersonalClassesModal()}
      
      {/* Date Picker Modals */}
      {Platform.OS !== 'web' && showStartDatePicker && (
        <DateTimePicker
          testID="startDateTimePicker"
          value={revenueStartDate}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onStartDateChange}
        />
      )}
      
      {Platform.OS !== 'web' && showEndDatePicker && (
        <DateTimePicker
          testID="endDateTimePicker"
          value={revenueEndDate}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onEndDateChange}
        />
      )}

      {/* Instructor Date Picker Modals */}
      {Platform.OS !== 'web' && showInstructorStartDatePicker && (
        <DateTimePicker
          testID="instructorStartDateTimePicker"
          value={instructorStartDate}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onInstructorStartDateChange}
        />
      )}
      
      {Platform.OS !== 'web' && showInstructorEndDatePicker && (
        <DateTimePicker
          testID="instructorEndDateTimePicker"
          value={instructorEndDate}
          mode="date"
          is24Hour={true}
          display="default"
          onChange={onInstructorEndDateChange}
        />
      )}

      {/* Web Date Picker Modal */}
      {Platform.OS === 'web' && showStartDatePicker && (
      <Portal>
        <Modal
            visible={showStartDatePicker}
            onDismiss={() => setShowStartDatePicker(false)}
            contentContainerStyle={[styles.datePickerModal, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.datePickerModalContent}>
              <Title style={[styles.datePickerModalTitle, { color: textColor }]}>
                Select Start Date
              </Title>
              <input
                type="date"
                value={revenueStartDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setRevenueStartDate(newDate);
                }}
                style={{
                  padding: 12,
                  fontSize: 16,
                  border: `1px solid ${textMutedColor}`,
                  borderRadius: 8,
                  backgroundColor: surfaceColor,
                  color: textColor,
                  width: '100%',
                  marginBottom: 16
                }}
              />
              <View style={styles.datePickerModalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowStartDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => setShowStartDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Done
                </Button>
          </View>
            </View>
          </Modal>
        </Portal>
      )}

      {Platform.OS === 'web' && showEndDatePicker && (
        <Portal>
          <Modal
            visible={showEndDatePicker}
            onDismiss={() => setShowEndDatePicker(false)}
            contentContainerStyle={[styles.datePickerModal, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.datePickerModalContent}>
              <Title style={[styles.datePickerModalTitle, { color: textColor }]}>
                Select End Date
              </Title>
              <input
                type="date"
                value={revenueEndDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setRevenueEndDate(newDate);
                }}
                style={{
                  padding: 12,
                  fontSize: 16,
                  border: `1px solid ${textMutedColor}`,
                  borderRadius: 8,
              backgroundColor: surfaceColor,
                  color: textColor,
                  width: '100%',
                  marginBottom: 16
                }}
              />
              <View style={styles.datePickerModalButtons}>
            <Button
              mode="outlined"
                  onPress={() => setShowEndDatePicker(false)}
                  style={styles.datePickerModalButton}
            >
              Cancel
            </Button>
              <Button
                mode="contained"
                  onPress={() => setShowEndDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Done
              </Button>
              </View>
          </View>
        </Modal>
      </Portal>
      )}

      {/* Instructor Web Date Picker Modals */}
      {Platform.OS === 'web' && showInstructorStartDatePicker && (
        <Portal>
          <Modal
            visible={showInstructorStartDatePicker}
            onDismiss={() => setShowInstructorStartDatePicker(false)}
            contentContainerStyle={[styles.datePickerModal, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.datePickerModalContent}>
              <Title style={[styles.datePickerModalTitle, { color: textColor }]}>
                Select Instructor Analysis Start Date
              </Title>
              <input
                type="date"
                value={instructorStartDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setInstructorStartDate(newDate);
                }}
                style={{
                  padding: 12,
                  fontSize: 16,
                  border: `1px solid ${textMutedColor}`,
                  borderRadius: 8,
                  backgroundColor: surfaceColor,
                  color: textColor,
                  width: '100%',
                  marginBottom: 16
                }}
              />
              <View style={styles.datePickerModalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowInstructorStartDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Cancel
              </Button>
                <Button
                  mode="contained"
                  onPress={() => setShowInstructorStartDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Done
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      )}

      {Platform.OS === 'web' && showInstructorEndDatePicker && (
        <Portal>
          <Modal
            visible={showInstructorEndDatePicker}
            onDismiss={() => setShowInstructorEndDatePicker(false)}
            contentContainerStyle={[styles.datePickerModal, { backgroundColor: surfaceColor }]}
          >
            <View style={styles.datePickerModalContent}>
              <Title style={[styles.datePickerModalTitle, { color: textColor }]}>
                Select Instructor Analysis End Date
              </Title>
              <input
                type="date"
                value={instructorEndDate.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  setInstructorEndDate(newDate);
                }}
                style={{
                  padding: 12,
                  fontSize: 16,
                  border: `1px solid ${textMutedColor}`,
                  borderRadius: 8,
                  backgroundColor: surfaceColor,
                  color: textColor,
                  width: '100%',
                  marginBottom: 16
                }}
              />
              <View style={styles.datePickerModalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowInstructorEndDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => setShowInstructorEndDatePicker(false)}
                  style={styles.datePickerModalButton}
                >
                  Done
                </Button>
              </View>
          </View>
        </Modal>
      </Portal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: spacing.lg,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  statsCard: {
    width: '48%',
    minWidth: 280,
    maxWidth: 320,
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cardStats: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  statSubtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginBottom: spacing.xl,
    gap: spacing.sm,
    maxWidth: 1000,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.xs,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modal: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: 600,
    maxHeight: '85%',
    borderRadius: 16,
    padding: spacing.lg,
    margin: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    maxHeight: 450,
    minHeight: 200,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  clientEmail: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  clientPhone: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  clientDate: {
    fontSize: 12,
  },
  clientStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Subscription styles
  subscriptionDetails: {
    marginTop: spacing.xs,
    gap: spacing.xs / 2,
  },
  subscriptionPrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  subscriptionClasses: {
    fontSize: 12,
  },
  subscriptionEquipment: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  subscriptionInfo: {
    padding: spacing.md,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  subscriptionInfoText: {
    fontSize: 14,
  },
  subscriptionClientInfo: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  remainingClasses: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Revenue and date picker styles
  datePickerContainer: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: spacing.md,
  },
  datePickerHeader: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  datePickerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
    minWidth: 180,
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs / 2,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Revenue card enhancements
  cardIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailsIcon: {
    opacity: 0.6,
  },
  clickHint: {
    fontSize: 11,
    marginTop: spacing.xs / 2,
    fontStyle: 'italic',
  },
  // Revenue modal styles
  revenueModalSummary: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  revenueModalTotal: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  revenueModalTimeFrame: {
    fontSize: 14,
  },
  revenueSection: {
    marginBottom: spacing.xl,
  },
  revenueSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  revenueItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  revenueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  revenueClientName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  revenueClientEmail: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  revenueItemDetails: {
    gap: spacing.xs / 2,
  },
  revenueMethod: {
    fontSize: 12,
  },
  revenueDescription: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  revenueSubscription: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: spacing.xs / 2,
  },
  // Date picker modal styles
  datePickerModal: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: 400,
    margin: 0,
    borderRadius: 12,
    padding: spacing.lg,
  },
  datePickerModalContent: {
    gap: spacing.md,
  },
  datePickerModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  datePickerModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  datePickerModalButton: {
    flex: 1,
  },
  
  // Instructor styles
  instructorSelector: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  selectorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  selectorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  instructorList: {
    paddingVertical: spacing.sm,
  },
  instructorItem: {
    padding: spacing.lg,
    marginRight: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 140,
    maxWidth: 160,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  instructorEmail: {
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  
  // Calendar styles
  calendarCard: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.sm,
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarContent: {
    maxHeight: 400,
    marginTop: spacing.md,
  },
  calendarDay: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  calendarDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  calendarDate: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarClassCount: {
    fontSize: 12,
  },
  calendarClass: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  calendarClassInfo: {
    flex: 1,
  },
  calendarClassName: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarClassTime: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  calendarClassStats: {
    alignItems: 'flex-end',
  },
  calendarClassEnrollment: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  calendarClassStatus: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  calendarClassStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Business Activity Card Styles
  businessActivityCard: {
    width: '100%',
    minWidth: 320,
    maxWidth: '100%',
    padding: spacing.lg,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: spacing.md,
  },
  businessActivityContent: {
    marginTop: spacing.md,
  },
  businessStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  businessStat: {
    alignItems: 'center',
  },
  businessStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  businessStatLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 14,
  },
  businessActivitiesPreview: {
    marginTop: spacing.sm,
  },
  businessActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  businessActivityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  businessActivityText: {
    flex: 1,
  },
  businessActivityDescription: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  businessActivityTime: {
    fontSize: 12,
  },
  businessNoActivity: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  businessNoActivityText: {
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  businessMoreActivities: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '500',
  },

  // Business Activity Modal Styles
  businessModalStats: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  businessModalStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: spacing.md,
  },
  businessModalStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  businessModalStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  businessModalStatLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 12,
  },
  businessModalActivityItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  businessModalActivityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  businessModalActivityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  businessModalActivityInfo: {
    flex: 1,
  },
  businessModalActivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  businessModalActivityDescription: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  businessModalActivityTime: {
    fontSize: 12,
  },
  businessModalActivityMetadata: {
    marginLeft: 56,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  businessModalMetadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  businessModalMetadataText: {
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  // Client Sources Tab Styles
  sourcesContainer: {
    padding: spacing.md,
  },
  sourcesListContainer: {
    marginTop: spacing.lg,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: spacing.md,
  },
  sourcesTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sourcesSubtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  sourcesList: {
    gap: spacing.sm,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sourceRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  sourceRankNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  sourceInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceStats: {
    fontSize: 12,
  },
  sourceProgress: {
    alignItems: 'flex-end',
    marginRight: spacing.md,
  },
  sourceProgressBar: {
    width: 100,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 4,
  },
  sourceProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sourceCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  sourcesEmpty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  sourcesEmptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: spacing.md,
  },
  sourcesEmptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  // Monthly Trends Styles
  trendsContainer: {
    marginTop: spacing.lg,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: spacing.md,
  },
  trendsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  trendsSubtitle: {
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  trendsList: {
    gap: spacing.md,
  },
  trendItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trendMonth: {
    fontSize: 16,
    fontWeight: '600',
  },
  trendTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendSources: {
    gap: spacing.xs,
  },
  trendSourceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  trendSourceName: {
    fontSize: 14,
    flex: 1,
  },
  trendSourceCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  trendMoreSources: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Referral Source Modal Styles
  referralModalStats: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  referralModalStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: spacing.md,
  },
  referralModalStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  referralModalStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  referralModalStatLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 12,
  },
  referralModalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  referralClientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  referralClientInfo: {
    flex: 1,
  },
  referralClientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  referralClientEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  referralClientPhone: {
    fontSize: 14,
    marginBottom: 4,
  },
  referralClientDate: {
    fontSize: 12,
  },
  referralClientStatus: {
    alignItems: 'flex-end',
  },
  referralStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  referralStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Source Overview Modal Styles
  sourceOverviewModalStats: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sourceOverviewModalDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sourceOverviewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: spacing.md,
  },
  sourceOverviewStat: {
    alignItems: 'center',
    flex: 1,
  },
  sourceOverviewStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sourceOverviewStatLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 12,
  },
  sourceOverviewClientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    marginBottom: spacing.sm,
  },
  sourceOverviewClientInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  sourceOverviewClientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sourceOverviewClientEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  sourceOverviewClientPhone: {
    fontSize: 14,
    marginBottom: 4,
  },
  sourceOverviewClientDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  sourceOverviewClientSource: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  sourceOverviewClientSourceText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  sourceOverviewClientStatus: {
    alignItems: 'flex-end',
  },
  sourceOverviewStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  sourceOverviewStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default ReportsAnalytics;
