import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShoppingBag, Car, Utensils, Gamepad2, Chrome as Home, Heart, Plane, GraduationCap, DollarSign, MoveHorizontal as MoreHorizontal } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Transaction } from '@/services/api';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

const categoryIcons: Record<string, any> = {
  'Food & Dining': Utensils,
  'Shopping': ShoppingBag,
  'Transportation': Car,
  'Bills & Utilities': Home,
  'Entertainment': Gamepad2,
  'Healthcare': Heart,
  'Travel': Plane,
  'Education': GraduationCap,
  'Income': DollarSign,
  'Other': MoreHorizontal,
};

const categoryColors: Record<string, string> = {
  'Food & Dining': colors.warning[500],
  'Shopping': colors.secondary[500],
  'Transportation': colors.primary[500],
  'Bills & Utilities': colors.neutral[500],
  'Entertainment': colors.accent[500],
  'Healthcare': colors.error[500],
  'Travel': colors.success[500],
  'Education': colors.primary[600],
  'Income': colors.success[600],
  'Other': colors.neutral[400],
};

export function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const IconComponent = categoryIcons[transaction.category] || MoreHorizontal;
  const iconColor = categoryColors[transaction.category] || colors.neutral[400];
  const isPositive = transaction.amount > 0;
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <IconComponent size={20} color={iconColor} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.category}>{transaction.category}</Text>
          <Text style={styles.date}>{formatDate(transaction.date)}</Text>
        </View>
      </View>
      
      <Text style={[
        styles.amount,
        { color: isPositive ? colors.success[500] : colors.neutral[100] }
      ]}>
        {isPositive ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginRight: 8,
  },
  date: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    textAlign: 'right',
  },
});