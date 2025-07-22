import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { Category } from '@/services/api';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
  placeholder?: string;
  type?: 'expense' | 'income' | 'both';
}

export function CategoryPicker({
  categories,
  selectedCategory,
  onSelectCategory,
  placeholder = 'Select category',
  type = 'expense'
}: CategoryPickerProps) {
  const [isVisible, setIsVisible] = useState(false);

  // No type filtering needed
  const filteredCategories = categories;

  const selectedCategoryObj = categories.find(cat => cat.name === selectedCategory);

  const handleSelect = (category: Category) => {
    onSelectCategory(category.name);
    setIsVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setIsVisible(true)}
      >
        <View style={styles.pickerContent}>
          {selectedCategoryObj ? (
            <View style={styles.selectedCategory}>
              <Text style={styles.selectedText}>{selectedCategoryObj.name}</Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>{placeholder}</Text>
          )}
        </View>
        <ChevronDown size={20} color={colors.neutral[400]} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={globalStyles.safeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.categoriesList}>
            {filteredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleSelect(category)}
              >
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                {selectedCategory === category.name && (
                  <Check size={20} color={colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[800],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.neutral[700],
  },
  pickerContent: {
    flex: 1,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  selectedText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[100],
  },
  placeholderText: {
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
  categoriesList: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[800],
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: colors.neutral[100],
    marginLeft: 8,
  },
  defaultBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.primary[400],
    backgroundColor: colors.primary[900],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
});