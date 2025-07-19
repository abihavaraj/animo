import { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Chip } from 'react-native-paper';
import { Body, Caption, H1, H2 } from '../../../components/ui/Typography';
import { useThemeColor } from '../../../hooks/useThemeColor';
import { Payment, PaymentStats, paymentService } from '../../services/paymentService';
import { shadows } from '../../utils/shadows';

function PaymentHistory() {
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const successColor = useThemeColor({}, 'success');
  const warningColor = useThemeColor({}, 'warning');
  const errorColor = useThemeColor({}, 'error');
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPayments = async () => {
    try {
      const [paymentsResponse, statsResponse] = await Promise.all([
        paymentService.getPayments(),
        paymentService.getPaymentStats()
      ]);

      if (paymentsResponse.success && paymentsResponse.data) {
        setPayments(paymentsResponse.data);
      } else {
        console.error('Failed to load payments:', paymentsResponse.error);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      } else {
        console.error('Failed to load payment stats:', statsResponse.error);
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      Alert.alert('Error', 'Failed to load payment history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return successColor;
      case 'pending': return warningColor;
      case 'failed': return errorColor;
      case 'refunded': return textMutedColor;
      default: return textSecondaryColor;
    }
  };

  const getPaymentDescription = (payment: Payment) => {
    if (payment.subscription_plan_name) {
      return `${payment.subscription_plan_name} Subscription`;
    }
    return 'Subscription Payment';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor }]}>
        <ActivityIndicator size="large" color={accentColor} />
        <H2 style={{ ...styles.loadingText, color: textSecondaryColor }}>Loading payment history...</H2>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: primaryColor }]}>
        <H1 style={{ ...styles.headerTitle, color: 'white' }}>Payment History</H1>
        <Body style={{ ...styles.headerSubtitle, color: 'rgba(255,255,255,0.8)' }}>Track your payments and balances</Body>
      </View>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {stats && (
          <Card style={[styles.statsCard, { backgroundColor: surfaceColor }]}>
            <Card.Content>
              <H2 style={{ color: textColor }}>Payment Summary</H2>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <H2 style={{ ...styles.statNumber, color: primaryColor }}>{stats.totalPayments}</H2>
                  <Caption style={{ ...styles.statLabel, color: textSecondaryColor }}>Total Payments</Caption>
                </View>
                <View style={styles.statItem}>
                  <H2 style={{ ...styles.statNumber, color: primaryColor }}>${stats.totalAmount.toFixed(2)}</H2>
                  <Caption style={{ ...styles.statLabel, color: textSecondaryColor }}>Total Paid</Caption>
                </View>
              </View>
              
              {stats.pendingAmount > 0 && (
                <View style={[styles.pendingSection, { backgroundColor: `${errorColor}10` }]}>
                  <H2 style={{ ...styles.pendingAmount, color: errorColor }}>${stats.pendingAmount.toFixed(2)} pending</H2>
                  <Button mode="contained" style={[styles.payButton, { backgroundColor: accentColor }]} labelStyle={{ color: backgroundColor }}>Pay Now</Button>
                </View>
              )}
              
              <View style={[styles.monthlyStats, { borderTopColor: textMutedColor }]}>
                <Body style={{ ...styles.monthlyLabel, color: textColor }}>This Month</Body>
                <View style={styles.monthlyRow}>
                  <Body style={{ color: textColor }}>{stats.thisMonthPayments} payments</Body>
                  <Body style={{ color: textColor }}>${stats.thisMonthAmount.toFixed(2)}</Body>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
        
        {payments.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: surfaceColor }]}>
            <Card.Content>
              <H2 style={{ color: textColor }}>No Payment History</H2>
              <Body style={{ color: textSecondaryColor }}>You haven&apos;t made any payments yet. Purchase a subscription to get started!</Body>
              <Button mode="contained" style={[styles.browseButton, { backgroundColor: accentColor }]} labelStyle={{ color: backgroundColor }} icon="gift-outline">
                Browse Plans
              </Button>
            </Card.Content>
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} style={[styles.paymentCard, { backgroundColor: surfaceColor }]}>
              <Card.Content>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <H2 style={{ ...styles.amount, color: successColor }}>${payment.amount.toFixed(2)}</H2>
                    <Body style={{ ...styles.description, color: textColor }}>
                      {getPaymentDescription(payment)}
                    </Body>
                    <Caption style={{ ...styles.date, color: textSecondaryColor }}>{formatDate(payment.payment_date)}</Caption>
                    <Caption style={{ ...styles.method, color: textSecondaryColor }}>
                      {payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)}
                    </Caption>
                  </View>
                  <Chip 
                    style={[styles.statusChip, { backgroundColor: getStatusColor(payment.status) }]}
                    textStyle={{ ...styles.chipText, color: backgroundColor }}
                  >
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </Chip>
                </View>
                {payment.transaction_id && (
                  <Caption style={{ ...styles.transactionId, color: textSecondaryColor }}>
                    ID: {payment.transaction_id}
                  </Caption>
                )}
                {payment.notes && (
                  <Caption style={{ ...styles.notes, color: textSecondaryColor }}>{payment.notes}</Caption>
                )}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1
  },
  centerContent: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 16
  },
  header: { 
    padding: 24, 
    paddingTop: 60
  },
  headerTitle: {},
  headerSubtitle: { 
    marginTop: 4 
  },
  content: { 
    flex: 1, 
    padding: 16 
  },
  statsCard: { 
    marginBottom: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginVertical: 16 
  },
  statItem: { 
    alignItems: 'center' 
  },
  statNumber: {},
  statLabel: { 
    textAlign: 'center' 
  },
  pendingSection: { 
    marginTop: 16, 
    padding: 16,
    borderRadius: 16 
  },
  pendingAmount: { 
    marginBottom: 8 
  },
  payButton: { 
    alignSelf: 'flex-start',
    borderRadius: 16,
  },
  monthlyStats: { 
    marginTop: 16, 
    paddingTop: 16, 
    borderTopWidth: 1
  },
  monthlyLabel: {
    marginBottom: 4 
  },
  monthlyRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  emptyCard: { 
    marginBottom: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  browseButton: { 
    marginTop: 16, 
    alignSelf: 'flex-start',
    borderRadius: 16,
  },
  paymentCard: { 
    marginBottom: 16,
    borderRadius: 16,
    ...shadows.card,
  },
  paymentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start' 
  },
  paymentInfo: { 
    flex: 1 
  },
  amount: {},
  description: { 
    marginTop: 4 
  },
  date: { 
    marginTop: 2 
  },
  method: { 
    marginTop: 2 
  },
  statusChip: { 
    marginLeft: 8,
    borderRadius: 12,
  },
  chipText: { 
    fontSize: 12 
  },
  transactionId: { 
    marginTop: 8 
  },
  notes: { 
    fontStyle: 'italic', 
    marginTop: 4 
  },
});

export default PaymentHistory; 