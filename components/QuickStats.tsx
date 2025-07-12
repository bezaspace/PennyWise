import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Target, PiggyBank } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface QuickStatsProps {
  income: number;
  expenses: number;
  budget: number;
  savings: number;
}

export function QuickStats({ income, expenses, budget, savings }: QuickStatsProps) {
  const stats = [
    {
      title: 'Income',
      value: income,
      icon: TrendingUp,
      color: colors.success[500],
      isPositive: true,
    },
    {
      title: 'Expenses',
      value: expenses,
      icon: TrendingDown,
      color: colors.error[500],
      isPositive: false,
    },
    {
      title: 'Budget',
      value: budget,
      icon: Target,
      color: colors.warning[500],
      isPositive: true,
    },
    {
      title: 'Savings',
      value: savings,
      icon: PiggyBank,
      color: colors.accent[500],
      isPositive: true,
    },
  ];

  return (
    <View style={styles.container}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
            <stat.icon size={20} color={stat.color} />
          </View>
          <Text style={styles.statValue}>
            ${stat.value.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </Text>
          <Text style={styles.statTitle}>{stat.title}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.neutral[800],
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[400],
    textAlign: 'center',
  },
});