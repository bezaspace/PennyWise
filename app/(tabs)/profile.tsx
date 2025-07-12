import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { User, Settings, Bell, CircleHelp as HelpCircle, Shield, Download, Trash2, LogOut, ChevronRight } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService } from '@/services/api';

export default function ProfileScreen() {
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalBudgets: 0,
    totalGoals: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
  });

  const loadStats = async () => {
    try {
      const [transactions, budgets, goals, income, expenses] = await Promise.all([
        apiService.getTransactions(),
        apiService.getBudgets(),
        apiService.getGoals(),
        apiService.getMonthlyIncome(),
        apiService.getMonthlyExpenses(),
      ]);

      setStats({
        totalTransactions: transactions.length,
        totalBudgets: budgets.length,
        totalGoals: goals.length,
        monthlyIncome: income,
        monthlyExpenses: expenses,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export your financial data to CSV format',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => {
          // In a real app, this would export data
          Alert.alert('Success', 'Data exported successfully!');
        }}
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your financial data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            // In a real app, this would clear all data
            Alert.alert('Data Cleared', 'All financial data has been removed.');
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Account Settings',
      icon: Settings,
      onPress: () => Alert.alert('Account Settings', 'Account settings coming soon'),
    },
    {
      title: 'Notifications',
      icon: Bell,
      onPress: () => Alert.alert('Notifications', 'Notification settings coming soon'),
    },
    {
      title: 'Privacy & Security',
      icon: Shield,
      onPress: () => Alert.alert('Privacy & Security', 'Privacy settings coming soon'),
    },
    {
      title: 'Help & Support',
      icon: HelpCircle,
      onPress: () => Alert.alert('Help & Support', 'Support options coming soon'),
    },
    {
      title: 'Export Data',
      icon: Download,
      onPress: handleExportData,
    },
    {
      title: 'Clear All Data',
      icon: Trash2,
      onPress: handleClearData,
      isDestructive: true,
    },
  ];

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User size={48} color={colors.neutral[100]} />
          </View>
          <Text style={styles.userName}>Financial User</Text>
          <Text style={styles.userEmail}>user@example.com</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalTransactions}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalBudgets}</Text>
              <Text style={styles.statLabel}>Budgets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalGoals}</Text>
              <Text style={styles.statLabel}>Goals</Text>
            </View>
          </View>
          
          <View style={styles.monthlyStats}>
            <View style={styles.monthlyStatItem}>
              <Text style={styles.monthlyStatLabel}>Monthly Income</Text>
              <Text style={[styles.monthlyStatValue, { color: colors.success[500] }]}>
                ${stats.monthlyIncome.toFixed(0)}
              </Text>
            </View>
            <View style={styles.monthlyStatItem}>
              <Text style={styles.monthlyStatLabel}>Monthly Expenses</Text>
              <Text style={[styles.monthlyStatValue, { color: colors.error[500] }]}>
                ${stats.monthlyExpenses.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={[
                  styles.menuIcon,
                  item.isDestructive && { backgroundColor: colors.error[500] + '20' }
                ]}>
                  <item.icon 
                    size={20} 
                    color={item.isDestructive ? colors.error[500] : colors.neutral[400]} 
                  />
                </View>
                <Text style={[
                  styles.menuItemText,
                  item.isDestructive && { color: colors.error[500] }
                ]}>
                  {item.title}
                </Text>
              </View>
              <ChevronRight 
                size={20} 
                color={item.isDestructive ? colors.error[500] : colors.neutral[400]} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>AI Finance Assistant v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️ using Expo & Gemini AI</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
  },
  profileCard: {
    backgroundColor: colors.neutral[800],
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    textAlign: 'center',
  },
  monthlyStats: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
  },
  monthlyStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthlyStatLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[300],
  },
  monthlyStatValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  menuContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[100],
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 4,
  },
});