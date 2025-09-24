import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Chip,
  Dialog,
  Divider,
  Icon,
  Portal,
  RadioButton,
  Surface
} from 'react-native-paper';
import { Body, Caption, H3 } from '../../components/ui/Typography';
import { Colors } from '../../constants/Colors';
import { spacing } from '../../constants/Spacing';

interface SubscriptionConflictData {
  hasExistingSubscription: boolean;
  canProceed: boolean;
  user: {
    name: string;
    email: string;
  };
  newPlan: {
    id: number;
    name: string;
    monthly_price: number;
    monthly_classes: number;
    equipment_access: string;
  };
  existingSubscription: {
    id: number;
    planName: string;
    monthlyPrice: number;
    classesRemaining: number;
    daysRemaining: number;
    endDate: string;
    equipmentAccess: string;
  };
  comparison: {
    isUpgrade: boolean;
    isDowngrade: boolean;
    isSamePlan: boolean;
    priceDifference: number;
    classDifference: number;
  };
  options: {
    id: string;
    name: string;
    description: string;
    warning: string | null;
    refundAmount: number;
    paymentRequired?: number;
    classAdjustment?: string;
    recommended: boolean;
  }[];
  message: string;
}

interface SubscriptionConflictDialogProps {
  visible: boolean;
  onDismiss: () => void;
  conflictData: SubscriptionConflictData | null;
  onProceed: (option: string, notes?: string) => void;
  loading?: boolean;
}

export function SubscriptionConflictDialog({
  visible,
  onDismiss,
  conflictData,
  onProceed,
  loading = false
}: SubscriptionConflictDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');

  if (!conflictData || !conflictData.hasExistingSubscription) {
    return null;
  }

  const handleProceed = () => {
    if (!selectedOption) {
      return;
    }

    onProceed(selectedOption, '');
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(0)} ALL`;
  };

  const getComparisonIcon = () => {
    if (!conflictData.comparison) {
      return <Icon source="minus" size={20} color={Colors.light.textSecondary} />;
    }
    if (conflictData.comparison.isUpgrade) {
      return <Icon source="arrow-up" size={20} color={Colors.light.success} />;
    } else if (conflictData.comparison.isDowngrade) {
      return <Icon source="arrow-down" size={20} color={Colors.light.warning} />;
    } else {
      return <Icon source="minus" size={20} color={Colors.light.textSecondary} />;
    }
  };

  const getComparisonText = () => {
    if (!conflictData.comparison) {
      return 'Plan Comparison';
    }
    if (conflictData.comparison.isUpgrade) {
      return `Upgrade (+${formatCurrency(conflictData.comparison.priceDifference)}/month)`;
    } else if (conflictData.comparison.isDowngrade) {
      return `Downgrade (${formatCurrency(conflictData.comparison.priceDifference)}/month)`;
    } else {
      return 'Same Plan';
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>
          Subscription Conflict
        </Dialog.Title>
        
        <Dialog.Content style={styles.content}>
          <ScrollView style={styles.scrollView}>
            {/* Client Info */}
            <Surface style={styles.infoSection}>
              <View style={styles.clientInfo}>
                <Icon source="person" size={24} color={Colors.light.primary} />
                <View style={styles.clientDetails}>
                  <H3 style={styles.clientName}>{conflictData.user.name}</H3>
                  <Caption style={styles.clientEmail}>{conflictData.user.email}</Caption>
                </View>
              </View>
            </Surface>

            {/* Existing Subscription */}
            <Surface style={styles.subscriptionSection}>
              <View style={styles.sectionHeader}>
                <H3 style={styles.sectionTitle}>Current Subscription</H3>
                <Chip style={styles.activeChip} textStyle={styles.chipText}>
                  ACTIVE
                </Chip>
              </View>
              
              <View style={styles.subscriptionDetails}>
                <Body style={styles.planName}>{conflictData.existingSubscription.planName}</Body>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>Price:</Caption>
                  <Body style={styles.detailValue}>
                    {formatCurrency(conflictData.existingSubscription.monthlyPrice)}/month
                  </Body>
                </View>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>Classes Remaining:</Caption>
                  <Body style={styles.detailValue}>
                    {conflictData.existingSubscription.classesRemaining}
                  </Body>
                </View>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>Days Remaining:</Caption>
                  <Body style={styles.detailValue}>
                    {conflictData.existingSubscription.daysRemaining}
                  </Body>
                </View>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>End Date:</Caption>
                  <Body style={styles.detailValue}>
                    {new Date(conflictData.existingSubscription.endDate).toLocaleDateString()}
                  </Body>
                </View>
              </View>
            </Surface>

            {/* New Plan Comparison */}
            <Surface style={styles.subscriptionSection}>
              <View style={styles.sectionHeader}>
                <H3 style={styles.sectionTitle}>New Plan</H3>
                <View style={styles.comparisonChip}>
                  {getComparisonIcon()}
                  <Caption style={styles.comparisonText}>{getComparisonText()}</Caption>
                </View>
              </View>
              
              <View style={styles.subscriptionDetails}>
                <Body style={styles.planName}>{conflictData.newPlan.name}</Body>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>Price:</Caption>
                  <Body style={styles.detailValue}>
                    {formatCurrency(conflictData.newPlan.monthly_price)}/month
                  </Body>
                </View>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>Monthly Classes:</Caption>
                  <Body style={styles.detailValue}>
                    {conflictData.newPlan.monthly_classes}
                  </Body>
                </View>
                <View style={styles.detailRow}>
                  <Caption style={styles.detailLabel}>Equipment Access:</Caption>
                  <Body style={styles.detailValue}>
                    {conflictData.newPlan.equipment_access}
                  </Body>
                </View>
              </View>
            </Surface>

            <Divider style={styles.divider} />

            {/* Options */}
            <View style={styles.optionsSection}>
              <H3 style={styles.sectionTitle}>How would you like to proceed?</H3>
              
              <RadioButton.Group onValueChange={setSelectedOption} value={selectedOption}>
                {conflictData.options.map((option) => (
                  <View key={option.id} style={styles.option}>
                    <Surface style={[
                      styles.optionCard,
                      selectedOption === option.id && styles.selectedOption,
                      option.recommended && styles.recommendedOption
                    ]}>
                      <View style={styles.optionHeader}>
                        <View style={styles.optionTitleRow}>
                          <RadioButton value={option.id} />
                          <Body style={styles.optionTitle}>{option.name}</Body>
                          {option.recommended && (
                            <Chip style={styles.recommendedChip} textStyle={styles.recommendedChipText}>
                              RECOMMENDED
                            </Chip>
                          )}
                        </View>
                        
                        {/* Pricing Information */}
                        <View style={styles.pricingInfo}>
                          {option.refundAmount > 0 && (
                            <Caption style={styles.refundAmount}>
                              💰 Refund: {formatCurrency(option.refundAmount)}
                            </Caption>
                          )}
                          {option.paymentRequired && option.paymentRequired > 0 && (
                            <Caption style={styles.paymentRequired}>
                              💳 Additional Payment: {formatCurrency(option.paymentRequired)}
                            </Caption>
                          )}
                          {option.classAdjustment && (
                            <Caption style={styles.classAdjustment}>
                              📚 Classes: {option.classAdjustment}
                            </Caption>
                          )}
                        </View>
                      </View>
                      
                      <Caption style={styles.optionDescription}>
                        {option.description}
                      </Caption>
                      
                      {option.warning && (
                        <View style={styles.warningContainer}>
                          <Icon source="alert" size={16} color={Colors.light.warning} />
                          <Caption style={styles.warningText}>
                            {option.warning}
                          </Caption>
                        </View>
                      )}
                    </Surface>
                  </View>
                ))}
              </RadioButton.Group>
            </View>
          </ScrollView>
        </Dialog.Content>
        
        <Dialog.Actions style={styles.actions}>
          <Button
            mode="outlined"
            onPress={onDismiss}
            disabled={loading}
            style={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleProceed}
            loading={loading}
            disabled={loading || !selectedOption}
            style={styles.proceedButton}
          >
            Proceed
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  title: {
    textAlign: 'center',
    color: Colors.light.text,
  },
  content: {
    paddingHorizontal: 0,
  },
  scrollView: {
    maxHeight: 500,
  },
  infoSection: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    color: Colors.light.text,
  },
  clientEmail: {
    color: Colors.light.textSecondary,
  },
  subscriptionSection: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: Colors.light.text,
  },
  activeChip: {
    backgroundColor: Colors.light.success,
  },
  chipText: {
    color: Colors.light.textOnAccent,
    fontSize: 12,
  },
  comparisonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  comparisonText: {
    color: Colors.light.textSecondary,
  },
  subscriptionDetails: {
    gap: spacing.xs,
  },
  planName: {
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: Colors.light.textSecondary,
  },
  detailValue: {
    color: Colors.light.text,
    fontWeight: '500',
  },
  divider: {
    marginVertical: spacing.lg,
  },
  optionsSection: {
    gap: spacing.md,
  },
  option: {
    marginBottom: spacing.sm,
  },
  optionCard: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedOption: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.surface,
  },
  recommendedOption: {
    borderColor: Colors.light.success,
  },
  optionHeader: {
    marginBottom: spacing.sm,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionTitle: {
    flex: 1,
    fontWeight: '500',
    color: Colors.light.text,
  },
  recommendedChip: {
    backgroundColor: Colors.light.success,
  },
  recommendedChipText: {
    color: Colors.light.textOnAccent,
    fontSize: 10,
  },
  pricingInfo: {
    marginTop: spacing.xs,
    gap: spacing.xs / 2,
  },
  refundAmount: {
    color: Colors.light.success,
    fontWeight: '500',
  },
  paymentRequired: {
    color: Colors.light.warning,
    fontWeight: '500',
  },
  classAdjustment: {
    color: Colors.light.primary,
    fontWeight: '500',
  },
  optionDescription: {
    color: Colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: Colors.light.background,
    padding: spacing.sm,
    borderRadius: 4,
  },
  warningText: {
    color: Colors.light.warning,
    flex: 1,
  },
  actions: {
    justifyContent: 'space-between',
  },
  cancelButton: {
    marginRight: spacing.md,
  },
  proceedButton: {
    minWidth: 100,
  },
}); 