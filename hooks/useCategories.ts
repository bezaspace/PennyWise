import { useState, useEffect } from 'react';
import { apiService, Category } from '@/services/api';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const allCategories = await apiService.getCategories();
      setCategories(allCategories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (category: { name: string }) => {
    setLoading(true);
    setError(null);
    try {
      const newCategory = await apiService.addCategory(category);
      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add category');
      console.error('Error adding category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (id: string, updates: { name: string }) => {
    setLoading(true);
    setError(null);
    try {
      const updatedCategory = await apiService.updateCategory(id, updates);
      if (updatedCategory) {
        setCategories(prev => 
          prev.map(cat => cat.id === id ? updatedCategory : cat)
        );
        return updatedCategory;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
      console.error('Error updating category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
      console.error('Error deleting category:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // No type filtering needed

  useEffect(() => {
    loadCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    loadCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}