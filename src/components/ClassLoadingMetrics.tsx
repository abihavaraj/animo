import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Button, Card, Chip, Modal, Portal } from 'react-native-paper';
import { apiService } from '../services/api';

interface ClassMetric {
  id: number;
  name: string;
  date: string;
  time: string;
  capacity: number;
  confirmed_bookings: number;
  available_spots: number;
  utilization_rate: number;
  loading_status: 'available' | 'half-full' | 'nearly-full' | 'full';
  loading_color: string;
  loading_icon: string;
  has_waitlist: boolean;
  waitlist_count: number;
  equipment_type: string;
  room: string;
  level: string;
  instructor_name: string;
}

interface LoadingMetricsData {
  date: string;
  period: string;
  summary: {
    totalClasses: number;
    fullClasses: number;
    nearlyFullClasses: number;
    availableClasses: number;
    classesWithWaitlist: number;
    averageUtilization: number;
  };
  equipmentBreakdown: Record<string, {
    total: number;
    full: number;
    nearlyFull: number;
    available: number;
  }>;
  classes: ClassMetric[];
}

interface ClassLoadingMetricsProps {
  date?: string;
  period?: 'day' | 'week' | 'upcoming';
  onClassSelect?: (classId: number) => void;
}

export default function ClassLoadingMetrics({ 
  date, 
  period = 'day',
  onClassSelect 
}: ClassLoadingMetricsProps) {
  const [metricsData, setMetricsData] = useState<LoadingMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [date, selectedPeriod]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      params.append('period', selectedPeriod);

      const response = await apiService.get(`/api/classes/loading-metrics?${params.toString()}`);
      
      if (response.success && response.data) {
        setMetricsData(response.data);
      }
    } catch (error) {
      console.error('Failed to load class metrics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetrics();
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'full': return 'FULL';
      case 'nearly-full': return 'NEARLY FULL';
      case 'half-full': return 'FILLING UP';
      case 'available': return 'AVAILABLE';
      default: return 'UNKNOWN';
    }
  };

  const getStatusDescription = (cls: ClassMetric) => {
    const { confirmed_bookings, capacity, available_spots, has_waitlist, waitlist_count } = cls;
    
    if (confirmed_bookings >= capacity) {
      return has_waitlist ? 
        `Full • ${waitlist_count} on waitlist` : 
        'Full • No waitlist';
    } else {
      return `${available_spots} spots available`;
    }
  };

  const filteredClasses = selectedEquipmentType ? 
    metricsData?.classes.filter(cls => cls.equipment_type === selectedEquipmentType) :
    metricsData?.classes;

  if (loading && !metricsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B8A7D" />
        <Text style={styles.loadingText}>Loading class metrics...</Text>
      </View>
    );
  }

  if (!metricsData) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>Failed to load class metrics</Text>
        <Button mode="outlined" onPress={loadMetrics}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        Platform.OS === 'web' && styles.pcFixedHeight
      ]}
    >
      {/* Header with Controls */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialIcons name="analytics" size={24} color="#9B8A7D" />
          <Text style={styles.title}>Class Loading Metrics</Text>
          <Text style={styles.subtitle}>
            {selectedPeriod === 'day' ? 'Today' : 
             selectedPeriod === 'week' ? 'This Week' : 'Upcoming Classes'}
          </Text>
        </View>
        
        <View style={styles.controls}>
          <View style={styles.periodSelector}>
            {['day', 'week', 'upcoming'].map((periodOption) => (
              <TouchableOpacity
                key={periodOption}
                style={[
                  styles.periodButton,
                  selectedPeriod === periodOption && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(periodOption as any)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === periodOption && styles.periodButtonTextActive
                ]}>
                  {periodOption === 'day' ? 'Today' : 
                   periodOption === 'week' ? 'Week' : 'Upcoming'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
              {refreshing ? 'Loading...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Statistics */}
      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { borderLeftColor: '#4CAF50' }]}>
          <Text style={styles.summaryNumber}>{metricsData.summary.totalClasses}</Text>
          <Text style={styles.summaryLabel}>Total Classes</Text>
          <Text style={styles.summarySubtext}>
            {selectedPeriod === 'day' ? 'today' : 'in period'}
          </Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: '#f44336' }]}>
          <Text style={[styles.summaryNumber, { color: '#f44336' }]}>
            {metricsData.summary.fullClasses}
          </Text>
          <Text style={styles.summaryLabel}>Full Classes</Text>
          <Text style={styles.summarySubtext}>
            {Math.round((metricsData.summary.fullClasses / Math.max(metricsData.summary.totalClasses, 1)) * 100)}% of total
          </Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: '#FF9800' }]}>
          <Text style={[styles.summaryNumber, { color: '#FF9800' }]}>
            {metricsData.summary.nearlyFullClasses}
          </Text>
          <Text style={styles.summaryLabel}>Nearly Full</Text>
          <Text style={styles.summarySubtext}>80%+ capacity</Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: '#2196F3' }]}>
          <Text style={[styles.summaryNumber, { color: '#2196F3' }]}>
            {metricsData.summary.classesWithWaitlist}
          </Text>
          <Text style={styles.summaryLabel}>With Waitlist</Text>
          <Text style={styles.summarySubtext}>overflow demand</Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: '#9C27B0' }]}>
          <Text style={[styles.summaryNumber, { color: '#9C27B0' }]}>
            {metricsData.summary.averageUtilization}%
          </Text>
          <Text style={styles.summaryLabel}>Avg Utilization</Text>
          <Text style={styles.summarySubtext}>across all classes</Text>
        </View>
      </View>

      {/* Equipment Type Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Equipment:</Text>
        <View style={styles.filterChips}>
          <Chip
            selected={selectedEquipmentType === null}
            onPress={() => setSelectedEquipmentType(null)}
            style={styles.filterChip}
            textStyle={styles.filterChipText}
          >
            All Types
          </Chip>
          {Object.keys(metricsData.equipmentBreakdown).map((type) => (
            <Chip
              key={type}
              selected={selectedEquipmentType === type}
              onPress={() => setSelectedEquipmentType(type)}
              style={styles.filterChip}
              textStyle={styles.filterChipText}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} 
              ({metricsData.equipmentBreakdown[type].total})
            </Chip>
          ))}
        </View>
      </View>

      {/* Class List */}
      <ScrollView style={styles.classList} showsVerticalScrollIndicator={false}>
        {filteredClasses && filteredClasses.length > 0 ? (
          filteredClasses.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={styles.classCard}
              onPress={() => onClassSelect?.(cls.id)}
            >
              <View style={styles.classHeader}>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.classDetails}>
                    {cls.time} • {cls.instructor_name} • {cls.room || cls.equipment_type}
                  </Text>
                  {cls.level && (
                    <Text style={styles.classLevel}>{cls.level}</Text>
                  )}
                </View>

                <View style={styles.classStatus}>
                  <View style={[styles.statusIndicator, { backgroundColor: cls.loading_color }]}>
                    <MaterialIcons 
                      name={cls.loading_icon as any} 
                      size={20} 
                      color="#fff" 
                    />
                  </View>
                  <Text style={[styles.statusLabel, { color: cls.loading_color }]}>
                    {getStatusLabel(cls.loading_status)}
                  </Text>
                </View>
              </View>

              <View style={styles.classMetrics}>
                <View style={styles.capacityBar}>
                  <View style={styles.capacityTrack}>
                    <View 
                      style={[
                        styles.capacityFill, 
                        { 
                          width: `${cls.utilization_rate}%`,
                          backgroundColor: cls.loading_color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.capacityText}>
                    {cls.confirmed_bookings}/{cls.capacity} ({cls.utilization_rate}%)
                  </Text>
                </View>

                <Text style={styles.classDescription}>
                  {getStatusDescription(cls)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-note" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {selectedEquipmentType ? 
                `No ${selectedEquipmentType} classes found` : 
                'No classes scheduled'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Equipment Breakdown Modal */}
      <Portal>
        <Modal
          visible={detailsModalVisible}
          onDismiss={() => setDetailsModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Equipment Breakdown</Text>
            <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {Object.entries(metricsData.equipmentBreakdown).map(([type, breakdown]) => (
              <Card key={type} style={styles.equipmentCard}>
                <Card.Content>
                  <Text style={styles.equipmentType}>
                    {type.charAt(0).toUpperCase() + type.slice(1)} Classes
                  </Text>
                  <View style={styles.equipmentStats}>
                    <Text style={styles.equipmentStat}>
                      Total: {breakdown.total}
                    </Text>
                    <Text style={[styles.equipmentStat, { color: '#f44336' }]}>
                      Full: {breakdown.full}
                    </Text>
                    <Text style={[styles.equipmentStat, { color: '#FF9800' }]}>
                      Nearly Full: {breakdown.nearlyFull}
                    </Text>
                    <Text style={[styles.equipmentStat, { color: '#4CAF50' }]}>
                      Available: {breakdown.available}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    marginBottom: 24,
  },
  pcFixedHeight: {
    height: 500,
    maxHeight: 500,
    minHeight: 300,
    overflow: 'scroll',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'System',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#9B8A7D',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    fontFamily: 'System',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    gap: 6,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#9B8A7D',
    fontWeight: '500',
    fontFamily: 'System',
  },
  summaryGrid: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
    backgroundColor: '#fff',
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'System',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  summarySubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontFamily: 'System',
  },
  filterContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
    fontFamily: 'System',
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#f0f0f0',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'System',
  },
  classList: {
    flex: 1,
    padding: 20,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'System',
  },
  classDetails: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'System',
  },
  classLevel: {
    fontSize: 12,
    color: '#9B8A7D',
    fontWeight: '500',
    fontFamily: 'System',
  },
  classStatus: {
    alignItems: 'center',
    marginLeft: 16,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  classMetrics: {
    gap: 8,
  },
  capacityBar: {
    gap: 8,
  },
  capacityTrack: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 3,
  },
  capacityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    fontFamily: 'System',
  },
  classDescription: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'System',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'System',
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'System',
  },
  modalContent: {
    padding: 20,
  },
  equipmentCard: {
    marginBottom: 12,
  },
  equipmentType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'System',
  },
  equipmentStats: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  equipmentStat: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
  },
}); 