import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Paragraph,
    Searchbar,
    Surface,
    Title
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { RootState } from '../../store';

interface Assignment {
  id: number;
  user_id: number;
  admin_id: number;
  client_name: string;
  client_email: string;
  admin_name: string;
  admin_role: string;
  plan_name: string;
  monthly_price: number;
  classes_added: number;
  subscription_status: string;
  description: string;
  created_at: string;
}

interface AssignmentStats {
  totalAssignments: number;
  assignmentsByAdmin: {
    admin_name: string;
    admin_role: string;
    assignment_count: number;
    total_classes_assigned: number;
  }[];
  assignmentsByMonth: {
    month: string;
    assignment_count: number;
    classes_assigned: number;
  }[];
}

function AssignmentHistory() {
  const { token, user } = useSelector((state: RootState) => state.auth);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [showMyAssignments, setShowMyAssignments] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadData();
    }
  }, [token]);

  useEffect(() => {
    filterAssignments();
  }, [assignments, searchQuery, showMyAssignments]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadAssignments(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Failed to load assignment data:', error);
      Alert.alert('Error', 'Failed to load assignment history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAssignments = async () => {
    try {
      console.log('📊 Loading assignment history...');
      const response = await apiService.get('/api/subscriptions/assignments');
      console.log('📊 Assignment history response:', response);
      
      if (response.success && response.data) {
        const assignmentsData = (response.data as any).assignments || [];
        setAssignments(assignmentsData);
        console.log('✅ Assignment history loaded:', assignmentsData.length, 'assignments');
      }
    } catch (error) {
      console.error('Failed to load assignments:', error);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📈 Loading assignment stats...');
      const response = await apiService.get('/api/subscriptions/assignments/stats');
      console.log('📈 Assignment stats response:', response);
      
      if (response.success && response.data) {
        setStats(response.data as AssignmentStats);
        console.log('✅ Assignment stats loaded');
      }
    } catch (error) {
      console.error('Failed to load assignment stats:', error);
    }
  };

  const filterAssignments = () => {
    let filtered = assignments;

    // Filter by current user if "My Assignments" is toggled
    if (showMyAssignments && user) {
      filtered = filtered.filter(assignment => assignment.admin_id === user.id);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(assignment => 
        assignment.client_name.toLowerCase().includes(query) ||
        assignment.client_email.toLowerCase().includes(query) ||
        assignment.plan_name.toLowerCase().includes(query) ||
        assignment.admin_name.toLowerCase().includes(query)
      );
    }

    setFilteredAssignments(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return '#4caf50';
      case 'expired': return '#f44336';
      case 'cancelled': return '#9e9e9e';
      default: return '#666';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return '#2196f3';
      case 'reception': return '#4caf50';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Title style={styles.loadingText}>Loading assignment history...</Title>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <Surface style={styles.header}>
        <Title style={styles.headerTitle}>Subscription Assignment History</Title>
        <Paragraph style={styles.headerSubtitle}>
          Track and review all subscription assignments made by staff
        </Paragraph>
      </Surface>

      {/* Stats Overview */}
      {stats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <Title>Assignment Overview</Title>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{stats.totalAssignments}</Title>
                <Paragraph style={styles.statLabel}>Total Assignments</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>{stats.assignmentsByAdmin.length}</Title>
                <Paragraph style={styles.statLabel}>Active Staff</Paragraph>
              </View>
              <View style={styles.statItem}>
                <Title style={styles.statNumber}>
                  {stats.assignmentsByAdmin.reduce((sum, admin) => sum + admin.total_classes_assigned, 0)}
                </Title>
                <Paragraph style={styles.statLabel}>Classes Assigned</Paragraph>
              </View>
            </View>

            {/* Top Assigners */}
            {stats.assignmentsByAdmin.length > 0 && (
              <View style={styles.topAssignersContainer}>
                <Title style={styles.sectionTitle}>Top Assigners</Title>
                {stats.assignmentsByAdmin.slice(0, 3).map((admin, index) => (
                  <View key={index} style={styles.topAssignerItem}>
                    <View style={styles.assignerInfo}>
                      <Paragraph style={styles.assignerName}>{admin.admin_name}</Paragraph>
                      <Chip 
                        style={[styles.roleChip, { backgroundColor: getRoleColor(admin.admin_role) }]}
                        textStyle={styles.chipText}
                      >
                        {admin.admin_role.toUpperCase()}
                      </Chip>
                    </View>
                    <View style={styles.assignerStats}>
                      <Paragraph style={styles.assignerCount}>{admin.assignment_count} assignments</Paragraph>
                      <Paragraph style={styles.assignerClasses}>{admin.total_classes_assigned} classes</Paragraph>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search assignments..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <Button
          mode={showMyAssignments ? 'contained' : 'outlined'}
          onPress={() => setShowMyAssignments(!showMyAssignments)}
          style={styles.filterButton}
          icon="account"
        >
          My Assignments
        </Button>
      </View>

      {/* Assignment List */}
      <View style={styles.assignmentsList}>
        <Title style={styles.sectionTitle}>
          Assignment History ({filteredAssignments.length})
        </Title>
        
        {filteredAssignments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <MaterialIcons name="assignment" size={48} color="#ccc" style={styles.emptyIcon} />
              <Title style={styles.emptyTitle}>No Assignments Found</Title>
              <Paragraph style={styles.emptyText}>
                {searchQuery || showMyAssignments 
                  ? 'No assignments match your current filters.'
                  : 'No subscription assignments have been made yet.'
                }
              </Paragraph>
            </Card.Content>
          </Card>
        ) : (
          filteredAssignments.map((assignment) => (
            <Card key={assignment.id} style={styles.assignmentCard}>
              <Card.Content>
                <View style={styles.assignmentHeader}>
                  <View style={styles.assignmentInfo}>
                    <Title style={styles.clientName}>{assignment.client_name}</Title>
                    <Paragraph style={styles.clientEmail}>{assignment.client_email}</Paragraph>
                    <Paragraph style={styles.planName}>{assignment.plan_name}</Paragraph>
                    <Paragraph style={styles.planPrice}>
                      {formatCurrency(assignment.monthly_price)} • {assignment.classes_added} classes
                    </Paragraph>
                  </View>
                  <View style={styles.assignmentMeta}>
                    <Chip 
                      style={[styles.statusChip, { backgroundColor: getStatusColor(assignment.subscription_status) }]}
                      textStyle={styles.chipText}
                    >
                      {assignment.subscription_status?.toUpperCase() || 'UNKNOWN'}
                    </Chip>
                  </View>
                </View>

                <View style={styles.assignmentFooter}>
                  <View style={styles.assignedByInfo}>
                    <MaterialIcons name="person" size={16} color="#666" />
                    <Paragraph style={styles.assignedByText}>
                      {assignment.admin_name} ({assignment.admin_role})
                    </Paragraph>
                  </View>
                  <Paragraph style={styles.assignmentDate}>
                    {formatDate(assignment.created_at)}
                  </Paragraph>
                </View>

                {assignment.description && (
                  <Paragraph style={styles.assignmentDescription}>
                    {assignment.description}
                  </Paragraph>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    margin: 16,
    elevation: 2,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 16,
  },
  statsCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  topAssignersContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  topAssignerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  assignerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignerName: {
    fontWeight: 'bold',
  },
  roleChip: {
    elevation: 0,
  },
  chipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  assignerStats: {
    alignItems: 'flex-end',
  },
  assignerCount: {
    fontSize: 12,
    color: '#666',
  },
  assignerClasses: {
    fontSize: 12,
    color: '#666',
  },
  filtersContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  searchBar: {
    elevation: 1,
  },
  filterButton: {
    alignSelf: 'flex-start',
  },
  assignmentsList: {
    padding: 16,
    paddingTop: 0,
  },
  assignmentCard: {
    marginBottom: 12,
    elevation: 1,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentMeta: {
    alignItems: 'flex-end',
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  clientEmail: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  planName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 2,
  },
  planPrice: {
    color: '#666',
    fontSize: 14,
  },
  statusChip: {
    elevation: 0,
  },
  assignmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  assignedByInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignedByText: {
    fontSize: 12,
    color: '#666',
  },
  assignmentDate: {
    fontSize: 12,
    color: '#666',
  },
  assignmentDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyCard: {
    elevation: 1,
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
  },
});

export default AssignmentHistory; 