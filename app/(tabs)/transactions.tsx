import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { Plus, Search, Filter } from 'lucide-react-native';
import { TransactionItem } from '@/components/TransactionItem';
import { CategoryPicker } from '@/components/CategoryPicker';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService, Transaction } from '@/services/api';
import { geminiService } from '@/services/gemini';
import { useCategories } from '@/hooks/useCategories';

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    category: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { categories } = useCategories();

  const loadTransactions = async () => {
    try {
      const allTransactions = await apiService.getTransactions();
      setTransactions(allTransactions);
      setFilteredTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => t.type === selectedFilter);
    }

    setFilteredTransactions(filtered);
  };

  const addTransaction = async () => {
    if (!newTransaction.description || !newTransaction.amount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      const amount = parseFloat(newTransaction.amount);
      const isExpense = amount < 0 || !newTransaction.amount.startsWith('+');
      
      // Auto-categorize using AI if no category provided
      let category = newTransaction.category;
      if (!category) {
        // TODO: Implement AI categorization
        category = 'Other';
      }

      const transaction: Omit<Transaction, 'id'> = {
        description: newTransaction.description,
        amount: isExpense ? -Math.abs(amount) : Math.abs(amount),
        category,
        date: new Date().toISOString(),
        type: isExpense ? 'expense' : 'income',
      };

      await apiService.addTransaction(transaction);
      await loadTransactions();
      
      setNewTransaction({ description: '', amount: '', category: '' });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Error', 'Failed to add transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    console.log('deleteTransaction called with ID:', transactionId);
    const transaction = transactions.find(t => t.id === transactionId);
    console.log('Found transaction:', transaction);
    if (!transaction) {
      console.log('Transaction not found, returning early');
      return;
    }

    console.log('Showing delete confirmation');
    
    // Web-compatible confirmation
    const confirmed = window.confirm(
      `Delete Transaction\n\nAre you sure you want to delete "${transaction.description}"?\n\nAmount: $${Math.abs(transaction.amount).toFixed(2)}`
    );
    
    if (confirmed) {
      console.log('Delete confirmed, calling API...');
      try {
        await apiService.deleteTransaction(transactionId);
        console.log('Delete API call successful');
        await loadTransactions();
        console.log('Transactions reloaded');
        
        // Web-compatible success message
        window.alert('Transaction deleted successfully');
      } catch (error) {
        console.error('Error deleting transaction:', error);
        window.alert('Failed to delete transaction. Please try again.');
      }
    } else {
      console.log('Delete cancelled');
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchQuery, selectedFilter]);

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'income', label: 'Income' },
    { key: 'expense', label: 'Expenses' },
  ];

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color={colors.neutral[100]} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              selectedFilter === filter.key && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === filter.key && styles.filterButtonTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              onDelete={deleteTransaction}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No transactions found</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Transaction Modal */}
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
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <TouchableOpacity 
              onPress={addTransaction}
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
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Enter transaction description"
                placeholderTextColor={colors.neutral[400]}
                value={newTransaction.description}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, description: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Enter amount (use + for income, - for expense)"
                placeholderTextColor={colors.neutral[400]}
                value={newTransaction.amount}
                onChangeText={(text) => setNewTransaction({ ...newTransaction, amount: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category (Optional)</Text>
              <CategoryPicker
                categories={categories}
                selectedCategory={newTransaction.category}
                onSelectCategory={(category) => setNewTransaction({ ...newTransaction, category })}
                placeholder="AI will categorize if left empty"
                type="both"
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
  addButton: {
    backgroundColor: colors.primary[600],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[100],
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: colors.neutral[700],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary[600],
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[300],
  },
  filterButtonTextActive: {
    color: colors.neutral[100],
  },
  transactionsList: {
    flex: 1,
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
});