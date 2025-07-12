import { Platform } from 'react-native';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'income' | 'expense';
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  period: 'weekly' | 'monthly';
}

export interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  category: string;
}

class ApiService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
  }

  private async apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    return this.apiRequest<Transaction[]>('/api/transactions');
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    return this.apiRequest<Transaction>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.apiRequest(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Budgets
  async getBudgets(): Promise<Budget[]> {
    return this.apiRequest<Budget[]>('/api/budgets');
  }

  async addBudget(budget: Omit<Budget, 'id' | 'spent'>): Promise<Budget> {
    return this.apiRequest<Budget>('/api/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  async updateBudget(id: string, updates: Partial<Budget>): Promise<Budget | null> {
    try {
      return await this.apiRequest<Budget>(`/api/budgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating budget:', error);
      return null;
    }
  }

  // Goals
  async getGoals(): Promise<Goal[]> {
    return this.apiRequest<Goal[]>('/api/goals');
  }

  async addGoal(goal: Omit<Goal, 'id'>): Promise<Goal> {
    return this.apiRequest<Goal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
    try {
      return await this.apiRequest<Goal>(`/api/goals/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  }

  // Analytics
  async getSpendingByCategory(days: number = 30): Promise<Record<string, number>> {
    const response = await this.apiRequest<{ spending_by_category: Record<string, number> }>(`/api/analytics/spending?days=${days}`);
    return response.spending_by_category;
  }

  async getTotalBalance(): Promise<number> {
    const response = await this.apiRequest<{ balance: number }>('/api/analytics/balance');
    return response.balance;
  }

  async getMonthlyIncome(): Promise<number> {
    const response = await this.apiRequest<{ monthly_income: number }>('/api/analytics/income');
    return response.monthly_income;
  }

  async getMonthlyExpenses(): Promise<number> {
    const response = await this.apiRequest<{ monthly_expenses: number }>('/api/analytics/expenses');
    return response.monthly_expenses;
  }

  // AI Services
  async getFinancialAdvice(prompt: string): Promise<string> {
    const response = await this.apiRequest<{ advice: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
    return response.advice;
  }
}

export const apiService = new ApiService();
