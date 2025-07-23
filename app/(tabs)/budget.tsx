// ...existing code...
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
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService, Budget } from '@/services/api';
import { Goal } from '@/services/api';
import { GoalCard } from '@/components/GoalCard';
import { geminiService } from '@/services/gemini';
import { useCategories } from '@/hooks/useCategories';

export default function BudgetScreen() {
  const { categories } = useCategories();
  const handleDeleteBudgetCategory = async (budget: Budget) => {
    // Find the category ID by matching the budget's category name
    const categoryObj = categories.find(cat => cat.name === budget.category);
    if (!categoryObj) {
      Alert.alert('Error', 'Category not found in category list.');
      return;
    }
    try {
      await apiService.deleteCategory(categoryObj.id);
      await loadBudgets();
      Alert.alert('Success', 'Category deleted');
    } catch (error: any) {
      const errorMsg = error?.toString?.() || '';
      if (errorMsg.includes('404')) {
        Alert.alert('Error', 'Category not found. It may have already been deleted.');
      } else {
        Alert.alert('Error', 'Failed to delete category');
      }
    }
  };
  const addBudget = async () => {
    if (!newBudget.category || !newBudget.limit) {
      Alert.alert('Error', 'Please enter both category and budget limit');
      return;
    }
    setIsLoading(true);
    try {
      await apiService.addCategoryWithBudget({
        category: newBudget.category,
        limit: parseFloat(newBudget.limit),
        period: newBudget.period || 'monthly',
      });
      setShowAddModal(false);
      setNewBudget({ category: '', limit: '', period: 'monthly' });
      await loadBudgets();
      Alert.alert('Success', 'Budget added');
    } catch (error) {
      Alert.alert('Error', 'Failed to add budget');
    }
    setIsLoading(false);
  };
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [editBudgetModal, setEditBudgetModal] = useState<{ visible: boolean; budget: Budget | null }>({ visible: false, budget: null });
  const [editLimit, setEditLimit] = useState('');
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ category: '', limit: '', period: 'monthly' });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<string>('');
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
    } catch (error) {
      console.error('Error loading budgets:', error);
    }
  };
  useEffect(() => { loadBudgets(); }, []);
  const overBudgetCount = budgets.filter(b => b.spent > b.limit).length;
  const remainingBudget = totalBudget - totalSpent;
  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Budget</Text>
        <View style={styles.headerActions}>
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
              <Text style={[styles.statValue, { color: colors.warning[500] }]}>${totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: remainingBudget >= 0 ? colors.success[500] : colors.error[500] }]}>${Math.abs(remainingBudget).toFixed(0)}</Text>
              <Text style={styles.statLabel}>{remainingBudget >= 0 ? 'Remaining' : 'Over Budget'}</Text>
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
              <BudgetProgress
                key={budget.id}
                budget={budget}
                onEdit={() => {
                  setEditBudgetModal({ visible: true, budget });
                  setEditLimit(budget.limit.toString());
                }}
                onDelete={() => handleDeleteBudgetCategory(budget)}
              />
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
            <Text style={styles.modalTitle}>Add Category & Budget</Text>
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
              <Text style={styles.inputLabel}>Category Name</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Enter category name"
                placeholderTextColor={colors.neutral[400]}
                value={newBudget.category}
                onChangeText={(text) => setNewBudget({ ...newBudget, category: text })}
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
      {/* Edit Budget Modal */}
      <Modal
        visible={editBudgetModal.visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditBudgetModal({ visible: false, budget: null })}
      >
        <SafeAreaView style={globalStyles.safeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditBudgetModal({ visible: false, budget: null })}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Budget Limit</Text>
            <TouchableOpacity
              onPress={async () => {
                if (!editBudgetModal.budget) return;
                try {
                  await apiService.updateBudget(editBudgetModal.budget.id, { limit: parseFloat(editLimit) });
                  setEditBudgetModal({ visible: false, budget: null });
                  await loadBudgets();
                  Alert.alert('Success', 'Budget limit updated');
                } catch (error) {
                  Alert.alert('Error', 'Failed to update budget limit');
                }
              }}
            >
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Budget Limit</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Enter new budget amount"
                placeholderTextColor={colors.neutral[400]}
                value={editLimit}
                onChangeText={setEditLimit}
                keyboardType="numeric"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Removed Category Manager Modal */}
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