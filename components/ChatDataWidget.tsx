import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';
import { TransactionItem } from './TransactionItem';
import { BudgetProgress } from './BudgetProgress';
import { GoalCard } from './GoalCard';
import { Transaction, Budget, Goal } from '@/services/api';

interface ChatDataWidgetProps {
  type: 'transactions' | 'budgets' | 'goals';
  data: any[];
  title?: string;
}

export function ChatDataWidget({ type, data, title }: ChatDataWidgetProps) {
  if (!data || data.length === 0) return null;

  const renderContent = () => {
    switch (type) {
      case 'transactions':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Recent Transactions'}</Text>
            <View style={styles.transactionsContainer}>
              {data.map((transaction: Transaction, index: number) => (
                <View key={index} style={styles.transactionItem}>
                  <TransactionItem 
                    transaction={transaction} 
                    onPress={() => {}} 
                  />
                </View>
              ))}
            </View>
          </View>
        );

      case 'budgets':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Budget Overview'}</Text>
            <View style={styles.budgetsContainer}>
              {data.map((budget: Budget, index: number) => (
                <View key={index} style={styles.budgetItem}>
                  <BudgetProgress budget={budget} />
                </View>
              ))}
            </View>
          </View>
        );

      case 'goals':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Financial Goals'}</Text>
            <View style={styles.goalsContainer}>
              {data.map((goal: Goal, index: number) => (
                <View key={index} style={styles.goalItem}>
                  <GoalCard goal={goal} onPress={() => {}} />
                </View>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  widgetContainer: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    marginTop: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[400],
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionsContainer: {
    gap: 4,
  },
  transactionItem: {
    marginHorizontal: -12, // Offset container padding
  },
  budgetsContainer: {
    gap: 4,
  },
  budgetItem: {
    marginHorizontal: -12, // Offset container padding
  },
  goalsContainer: {
    gap: 4,
  },
  goalItem: {
    marginHorizontal: -12, // Offset container padding
  },
});
