import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Plus, Edit3, Trash2, X } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { Category } from '@/services/api';
import { useCategories } from '@/hooks/useCategories';

interface CategoryManagerProps {
  visible: boolean;
  onClose: () => void;
  onCategoriesChange?: () => void;
}

const CATEGORY_COLORS = [
  '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#ef4444',
  '#64748b', '#10b981', '#3b82f6', '#ec4899', '#6366f1'
];

const CATEGORY_ICONS = [
  'Utensils', 'ShoppingBag', 'Car', 'Film', 'Heart',
  'Receipt', 'TrendingUp', 'PiggyBank', 'Plane', 'Smartphone'
];

export function CategoryManager({ visible, onClose, onCategoriesChange }: CategoryManagerProps) {
  const { categories, loading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Debug logging
  console.log('CategoryManager - categories:', categories);
  console.log('CategoryManager - loading:', loading);
  console.log('CategoryManager - visible:', visible);
  const [formData, setFormData] = useState({
    name: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
    });
    setEditingCategory(null);
    setShowAddForm(false);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await addCategory(formData);
      resetForm();
      onCategoriesChange?.();
      Alert.alert('Success', 'Category added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add category. Please try again.');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
    });
    setShowAddForm(true);
  };

  const handleUpdate = async () => {
    if (!editingCategory || !formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      await updateCategory(editingCategory.id, formData);
      resetForm();
      onCategoriesChange?.();
      Alert.alert('Success', 'Category updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update category. Please try again.');
    }
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(category.id);
              onCategoriesChange?.();
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete category. It may be in use by transactions or budgets.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={globalStyles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.neutral[100]} />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Categories</Text>
          <TouchableOpacity onPress={() => setShowAddForm(true)}>
            <Plus size={24} color={colors.primary[500]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryDetails}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(category)}
                >
                  <Edit3 size={16} color={colors.neutral[400]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(category)}
                >
                  <Trash2 size={16} color={colors.error[500]} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Add/Edit Form Modal */}
        <Modal
          visible={showAddForm}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={globalStyles.safeArea}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </Text>
              <TouchableOpacity
                onPress={editingCategory ? handleUpdate : handleAdd}
                disabled={loading}
              >
                <Text style={[styles.modalSave, loading && { opacity: 0.5 }]}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={globalStyles.input}
                placeholder="Enter category name"
                placeholderTextColor={colors.neutral[400]}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[700],
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[100],
    marginBottom: 4,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[400],
    textTransform: 'capitalize',
  },
  defaultBadge: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: colors.primary[400],
    backgroundColor: colors.primary[900],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
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
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    backgroundColor: colors.neutral[700],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.primary[600],
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: colors.neutral[300],
  },
  typeButtonTextActive: {
    color: colors.neutral[100],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.neutral[100],
  },
});