import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, RefreshControl, Alert } from 'react-native';
import { BalanceCard } from '@/components/BalanceCard';
import { QuickStats } from '@/components/QuickStats';
import { TransactionItem } from '@/components/TransactionItem';
import { GoalCard } from '@/components/GoalCard';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService, Transaction, Goal } from '@/services/api';
import SpendingPie from '@/components/SpendingPie';

export default function DashboardScreen() {
  const [balance, setBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [spendingByCategory, setSpendingByCategory] = useState<Record<string, number> | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
  allTransactions,
  allGoals,
  spending,
      ] = await Promise.all([
        apiService.getTotalBalance(),
        apiService.getMonthlyIncome(),
        apiService.getMonthlyExpenses(),
        apiService.getTransactions(),
        apiService.getGoals(),
  apiService.getSpendingByCategory(),
      ]);

      setBalance(totalBalance);
      setIncome(monthlyIncome);
      setExpenses(monthlyExpenses);
      setTransactions(allTransactions.slice(0, 5)); // Show only recent 5
      setGoals(allGoals.slice(0, 2)); // Show only top 2 goals
  setSpendingByCategory(spending);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const deleteTransaction = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    // Web-compatible confirmation
    const confirmed = window.confirm(
      `Delete Transaction\n\nAre you sure you want to delete "${transaction.description}"?\n\nAmount: $${Math.abs(transaction.amount).toFixed(2)}`
    );
    
    if (confirmed) {
      try {
        await apiService.deleteTransaction(transactionId);
        await loadData(); // Refresh all dashboard data
        window.alert('Transaction deleted successfully');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        window.alert('Failed to delete transaction. Please try again.');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView 
        style={globalStyles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Good morning!</Text>
          <Text style={styles.subtitle}>Here's your financial overview</Text>
        </View>

        <BalanceCard 
          balance={balance}
          isVisible={isBalanceVisible}
          onToggleVisibility={() => setIsBalanceVisible(!isBalanceVisible)}
        />

        <QuickStats
          income={income}
          expenses={expenses}
          budget={2000} // Mock budget limit
          savings={balance * 0.3} // Mock savings calculation
        />

  {/* Spending pie chart */}
  <SpendingPie data={spendingByCategory} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onDelete={deleteTransaction}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Goals</Text>
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
            />
          ))}
        </View>

        {/* Bottom padding for better scrolling */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
    marginBottom: 16,
    paddingHorizontal: 16,
  },
});