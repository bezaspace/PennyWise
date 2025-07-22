import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Plus, TrendingUp, TrendingDown, CircleAlert as AlertCircle, Settings } from 'lucide-react-native';
import { BudgetProgress } from '@/components/BudgetProgress';
import { CategoryManager } from '@/components/CategoryManager';
import { CategoryPicker } from '@/components/CategoryPicker';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService, Budget } from '@/services/api';
import { Goal } from '@/services/api';
import { GoalCard } from '@/components/GoalCard';
import { geminiService } from '@/services/gemini';
import { useCategories } from '@/hooks/useCategories';

export default function BudgetScreen() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [insights, setInsights] = useState<string>('');
  const [newBudget, setNewBudget] = useState({
    category: '',
    limit: '',
    period: 'monthly', // default value, can be changed to 'weekly' if needed
  });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { categories } = useCategories();

  const loadBudgets = async () => {
    try {
      const [allBudgets, allGoals] = await Promise.all([
        apiService.getBudgets(),
        apiService.getGoals()
      ]);
      setBudgets(allBudgets);
      setGoals(allGoals);
      
      const total = allBudgets.reduce((sum, b) => sum + b.limit, 0);
      const spent = allBudgets.reduce((sum, b) => sum + b.spent, 0);
      setTotalBudget(total);
      setTotalSpent(spent);

      // Insights feature removed for minimal interface
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };

  const addBudget = async () => {
    if (!newBudget.category || !newBudget.limit || !newBudget.period) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const budget: Omit<Budget, 'id' | 'spent'> & { period: string } = {
        category: newBudget.category,
        limit: parseFloat(newBudget.limit),
        period: newBudget.period,
      };

      await apiService.addBudget(budget);
      await loadBudgets();
      
      setNewBudget({ category: '', limit: '', period: 'monthly' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding budget:', error);
      Alert.alert('Error', 'Failed to add budget. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const overBudgetCount = budgets.filter(b => b.spent > b.limit).length;
  const remainingBudget = totalBudget - totalSpent;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowCategoryManager(true)}
          >
            <Settings size={20} color={colors.neutral[400]} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={24} color={colors.neutral[100]} />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={globalStyles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Monthly Overview</Text>
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>${totalBudget.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Budget</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning[500] }]}>
                ${totalSpent.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[
                styles.statValue, 
                { color: remainingBudget >= 0 ? colors.success[500] : colors.error[500] }
              ]}>
                ${Math.abs(remainingBudget).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>
                {remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}
              </Text>
            </View>
          </View>
          {overBudgetCount > 0 && (
            <View style={styles.alertContainer}>
              <AlertCircle size={16} color={colors.error[500]} />
              <Text style={styles.alertText}>
                {overBudgetCount} {overBudgetCount === 1 ? 'category is' : 'categories are'} over budget
              </Text>
            </View>
          )}
        </View>
        {insights && (
          <View style={styles.insightsCard}>
            <Text style={styles.insightsTitle}>AI Budget Insights</Text>
            <Text style={styles.insightsText}>{insights}</Text>
          </View>
        )}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Categories</Text>
          {budgets.length > 0 ? (
            budgets.map((budget) => (
              <BudgetProgress key={budget.id} budget={budget} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No budgets set up yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to create your first budget
              </Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Goals</Text>
          {goals.length > 0 ? (
            goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No savings goals yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add a goal from the Goals tab
              </Text>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={globalStyles.safeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Budget</Text>
            <TouchableOpacity 
              onPress={addBudget}
              disabled={isLoading}
            >
              <Text style={[
                styles.modalSave,
                isLoading && { opacity: 0.5 }
              ]}>
                {isLoading ? 'Adding...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <CategoryPicker
                categories={categories}
                selectedCategory={newBudget.category}
                onSelectCategory={(category) => setNewBudget({ ...newBudget, category })}
                placeholder="Select a category"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Budget Limit</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Enter budget amount"
                placeholderTextColor={colors.neutral[400]}
                value={newBudget.limit}
                onChangeText={(text) => setNewBudget({ ...newBudget, limit: text })}
                keyboardType="numeric"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Category Manager Modal */}
      <CategoryManager
        visible={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        onCategoriesChange={loadBudgets}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsButton: {
    backgroundColor: colors.neutral[700],
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: colors.primary[600],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewCard: {
    backgroundColor: colors.neutral[800],
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  overviewTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
    marginBottom: 16,
  },
  overviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.error[500] + '20',
    borderRadius: 8,
  },
  alertText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.error[500],
    marginLeft: 8,
  },
  insightsCard: {
    backgroundColor: colors.neutral[800],
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  insightsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.accent[400],
    marginBottom: 12,
  },
  insightsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[300],
    lineHeight: 20,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[500],
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[700],
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary[500],
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[200],
    marginBottom: 8,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    backgroundColor: colors.neutral[700],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary[600],
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[300],
  },
  periodButtonTextActive: {
    color: colors.neutral[100],
  },
});