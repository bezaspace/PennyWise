import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShoppingBag, Car, Utensils, Gamepad2, Chrome as Home, Heart, Plane, GraduationCap, DollarSign, MoveHorizontal as MoreHorizontal, Trash2 } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { Transaction } from '@/services/api';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: (transactionId: string) => void;
  compact?: boolean;
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

export function TransactionItem({ transaction, onPress, onDelete, compact }: TransactionItemProps) {
  const IconComponent = categoryIcons[transaction.category] || MoreHorizontal;
  const iconColor = categoryColors[transaction.category] || colors.neutral[400];
  const isPositive = transaction.amount > 0;
  
  const handleDelete = (event?: any) => {
    console.log('Delete button pressed for transaction:', transaction.id);
    if (event) {
      event.stopPropagation(); // Prevent parent TouchableOpacity from firing
    }
    if (onDelete) {
      console.log('Calling onDelete with transaction ID:', transaction.id);
      onDelete(transaction.id);
    } else {
      console.log('onDelete prop is not provided');
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <TouchableOpacity style={[styles.container, compact && styles.containerCompact]} onPress={onPress}>
  <View style={[styles.iconContainer, compact && styles.iconContainerCompact, { backgroundColor: iconColor + '20' }]}>
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
      
  <View style={styles.rightContainer}>
        <Text style={[
          styles.amount,
          { color: isPositive ? colors.success[500] : colors.neutral[100] }
        ]}>
          {isPositive ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
        </Text>
        {onDelete && (
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={handleDelete}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
            onPressIn={() => console.log('Delete button press started')}
            onPressOut={() => console.log('Delete button press ended')}
          >
            <Trash2 size={18} color={colors.error[500]} />
          </TouchableOpacity>
        )}
      </View>
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
  containerCompact: {
    padding: 8,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
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
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    textAlign: 'right',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: colors.error[500] + '20',
    minWidth: 32,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
