import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { Budget } from '@/services/api';

interface BudgetProgressProps {
  budget: Budget;
}

export function BudgetProgress({ budget }: BudgetProgressProps) {
  const progress = Math.min(budget.spent / budget.limit, 1);
  const remaining = Math.max(budget.limit - budget.spent, 0);
  const isOverBudget = budget.spent > budget.limit;
  
  const getProgressColor = () => {
    if (isOverBudget) return colors.error[500];
    if (progress > 0.8) return colors.warning[500];
    return colors.success[500];
  };

  // Ensure safe number formatting
  const formatAmount = (amount: number) => {
    return isNaN(amount) ? '0.00' : amount.toFixed(2);
  };

  const formatPercentage = (value: number) => {
    return isNaN(value) ? '0' : Math.round(value * 100).toString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.category}>{budget.category || 'Unknown Category'}</Text>
        <Text style={styles.period}>{budget.period || 'monthly'}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: getProgressColor()
              }
            ]} 
          />
        </View>
        <Text style={[styles.percentage, { color: getProgressColor() }]}>
          {formatPercentage(progress)}%
        </Text>
      </View>
      
      <View style={styles.amounts}>
        <Text style={styles.spent}>
          ${formatAmount(budget.spent)} spent
        </Text>
        <Text style={[
          styles.remaining,
          { color: isOverBudget ? colors.error[500] : colors.success[500] }
        ]}>
          {isOverBudget ? 
            `$${formatAmount(budget.spent - budget.limit)} over` : 
            `$${formatAmount(remaining)} left`
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  category: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[100],
  },
  period: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    textTransform: 'capitalize',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[700],
    borderRadius: 4,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    minWidth: 40,
    textAlign: 'right',
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[300],
  },
  remaining: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});