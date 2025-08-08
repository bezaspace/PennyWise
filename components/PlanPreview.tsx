import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface PlanAllocation {
  category: string;
  amount: number;
}

interface PlanGoal {
  title: string;
  target_amount: number;
  current_amount?: number;
  deadline: string;
  category?: string;
}

interface PlanPreviewProps {
  plan: {
    month?: string;
    income?: number | null;
    savings_rate?: number | null;
    emergency_fund_target?: number | null;
    allocations?: PlanAllocation[];
    goals?: PlanGoal[] | null;
  } | null;
}

function currency(amount?: number | null) {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0';
  const v = Math.round((amount + Number.EPSILON) * 100) / 100;
  return `$${v.toFixed(0)}`;
}

export default function PlanPreview({ plan }: PlanPreviewProps) {
  if (!plan) return null;
  const allocations = Array.isArray(plan.allocations) ? plan.allocations : [];
  const goals = Array.isArray(plan.goals) ? plan.goals : [];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Monthly Plan</Text>
        {plan.month ? <Text style={styles.monthBadge}>{plan.month}</Text> : null}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.value}>{currency(plan.income)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Savings</Text>
          <Text style={styles.value}>
            {plan.savings_rate !== undefined && plan.savings_rate !== null
              ? `${Math.round(plan.savings_rate * 100)}%`
              : '--'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.label}>Emergency</Text>
          <Text style={styles.value}>{currency(plan.emergency_fund_target)}</Text>
        </View>
      </View>

      {allocations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Allocations</Text>
          {allocations.map((a, idx) => (
            <View key={`${a.category}-${idx}`} style={styles.row}>
              <Text style={styles.cat}>{a.category || 'Category'}</Text>
              <Text style={styles.amount}>{currency(a.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {goals.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proposed Goals</Text>
          {goals.map((g, idx) => (
            <View key={`${g.title}-${idx}`} style={styles.goalRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalTitle}>{g.title}</Text>
                <Text style={styles.goalMeta}>
                  Target {currency(g.target_amount)}{g.deadline ? ` by ${g.deadline}` : ''}
                </Text>
              </View>
              <Text style={styles.goalCategory}>{g.category || 'General'}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent[500] || colors.primary[500],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[100],
  },
  monthBadge: {
    fontSize: 12,
    color: colors.primary[300],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: colors.neutral[400],
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[100],
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary[400],
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cat: {
    color: colors.neutral[100],
    fontSize: 13,
  },
  amount: {
    color: colors.neutral[200],
    fontSize: 13,
    fontWeight: '600',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  goalTitle: {
    color: colors.neutral[100],
    fontSize: 13,
    fontWeight: '600',
  },
  goalMeta: {
    color: colors.neutral[400],
    fontSize: 11,
  },
  goalCategory: {
    color: colors.neutral[300],
    fontSize: 12,
  },
});
