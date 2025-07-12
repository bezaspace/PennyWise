import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff } from 'lucide-react-native';
import { colors } from '@/constants/colors';

interface BalanceCardProps {
  balance: number;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function BalanceCard({ balance, isVisible, onToggleVisibility }: BalanceCardProps) {
  return (
    <LinearGradient
      colors={[colors.primary[600], colors.accent[600]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Total Balance</Text>
        <Eye 
          size={24} 
          color={colors.neutral[100]} 
          onPress={onToggleVisibility}
        />
      </View>
      
      <Text style={styles.balance}>
        {isVisible ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••'}
      </Text>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {balance >= 0 ? '+' : ''}
          {isVisible ? `$${Math.abs(balance * 0.12).toFixed(2)}` : '••••'} this month
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[100],
  },
  balance: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[50],
    marginBottom: 8,
  },
  footer: {
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[200],
  },
});