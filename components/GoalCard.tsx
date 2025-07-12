import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Target, Calendar, TrendingUp } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Goal } from '@/services/api';

interface GoalCardProps {
  goal: Goal;
  onPress?: () => void;
}

export function GoalCard({ goal, onPress }: GoalCardProps) {
  const progress = goal.current_amount / goal.target_amount;
  const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Target size={20} color={colors.accent[500]} />
        </View>
        <Text style={styles.title}>{goal.title}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${Math.min(progress * 100, 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.percentage}>
          {Math.round(progress * 100)}%
        </Text>
      </View>
      
      <View style={styles.amounts}>
        <Text style={styles.current}>
          ${goal.current_amount.toLocaleString()}
        </Text>
        <Text style={styles.target}>
          of ${goal.target_amount.toLocaleString()}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.meta}>
          <Calendar size={14} color={colors.neutral[400]} />
          <Text style={styles.daysLeft}>
            {daysLeft} days left
          </Text>
        </View>
        <View style={styles.meta}>
          <TrendingUp size={14} color={colors.success[500]} />
          <Text style={styles.category}>{goal.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[800],
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent[500] + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[700],
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent[500],
    borderRadius: 4,
  },
  percentage: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: colors.accent[500],
    minWidth: 40,
    textAlign: 'right',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  current: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
    marginRight: 8,
  },
  target: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daysLeft: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginLeft: 4,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.success[500],
    marginLeft: 4,
  },
});