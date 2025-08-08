import { Transaction, Budget, Goal } from '@/services/api';

export interface ParsedToolData {
  type: 'transactions' | 'budgets' | 'goals' | 'plan' | null;
  data: any[];
  hasToolData: boolean;
}

/**
 * Parses AI response text to extract tool data (transactions, budgets, goals)
 * and determine if the response contains data that should be displayed as widgets
 */
export function parseAIResponseForToolData(responseText: string): ParsedToolData {
  const result: ParsedToolData = {
    type: null,
    data: [],
    hasToolData: false,
  };

  if (!responseText) return result;

  console.log('Parsing AI response for tool data:', responseText.substring(0, 200) + '...');

  // Check if response contains transaction data (prioritize this since it's most common)
  if (containsTransactionData(responseText)) {
    console.log('Detected transaction data in response');
    result.type = 'transactions';
    result.data = extractTransactionData(responseText);
    result.hasToolData = result.data.length > 0;
    console.log('Extracted transaction data:', result.data);
  }
  // Check if response contains budget data
  else if (containsBudgetData(responseText)) {
    console.log('Detected budget data in response');
    result.type = 'budgets';
    result.data = extractBudgetData(responseText);
    result.hasToolData = result.data.length > 0;
    console.log('Extracted budget data:', result.data);
  }
  // Check if response contains goal data
  else if (containsGoalData(responseText)) {
    console.log('Detected goal data in response');
    result.type = 'goals';
    result.data = extractGoalData(responseText);
    result.hasToolData = result.data.length > 0;
    console.log('Extracted goal data:', result.data);
  }

  console.log('Final parsing result:', result);
  return result;
}

function containsTransactionData(text: string): boolean {
  const indicators = [
    'recent transactions',
    'spending activity',
    'transaction history',
    'your purchases',
    'expenses',
    'recent spending',
    'last few transactions',
    'what you\'ve spent',
    'your spending',
    'money spent',
    'financial activity',
    'purchase history',
    'recent activity',
    'spending pattern',
    'transaction data',
    'here are your',
    'you spent',
    'you purchased',
    'your transactions show',
    'looking at your transactions'
  ];

  const lowerText = text.toLowerCase();

  // Check for explicit transaction-related terms
  return indicators.some(indicator =>
    lowerText.includes(indicator.toLowerCase())
  ) || lowerText.includes('transaction');
}

function containsBudgetData(text: string): boolean {
  const indicators = [
    'budget',
    'spending limit',
    'monthly allowance',
    'budget category',
    'remaining budget',
    'budget overview',
    'your budgets',
    'budget status',
    'spending against budget',
    'budget progress',
    'budget tracking',
    'how much left',
    'budget allocation',
    'spending plan',
    'budget breakdown'
  ];

  const lowerText = text.toLowerCase();
  return indicators.some(indicator =>
    lowerText.includes(indicator.toLowerCase())
  );
}

function containsGoalData(text: string): boolean {
  const indicators = [
    'financial goal',
    'savings goal',
    'target amount',
    'goal progress',
    'saving for',
    'your goals',
    'financial goals',
    'saving targets',
    'goal tracking',
    'progress toward',
    'financial objectives',
    'savings targets',
    'goal status',
    'savings progress',
    'financial targets'
  ];

  const lowerText = text.toLowerCase();
  return indicators.some(indicator =>
    lowerText.includes(indicator.toLowerCase())
  );
}

function extractTransactionData(text: string): Transaction[] {
  const transactions: Transaction[] = [];

  // Enhanced patterns to extract transaction-like data from AI responses
  const patterns = [
    /\$(\d+\.?\d*)\s+(?:on|for|at)\s+([^,\n]+?)(?:\s+at\s+([^,\n]+?))?(?:\s+on\s+(\d{4}-\d{2}-\d{2}))?/gi,
    /([^:]+):\s*\$(\d+\.?\d*)\s*\(([^)]+)\)(?:\s*-\s*(\w+))?/gi,
    /(\w+.*?)[-–]\s*\$(\d+\.?\d*)/gi,
    /\$(\d+\.?\d*)\s+(?:spent|paid|charged)\s+(?:on|for|at)\s+([^,\n]+)/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      let description, amount, category, date;

      // Handle different pattern formats
      if (pattern.source.includes('spent|paid|charged')) {
        amount = parseFloat(match[1]);
        description = match[2] || 'Purchase';
        category = 'Other';
        date = new Date().toISOString().split('T')[0];
      } else if (pattern.source.includes('[-–]')) {
        description = match[1].trim();
        amount = parseFloat(match[2]);
        category = 'Other';
        date = new Date().toISOString().split('T')[0];
      } else {
        description = match[2] || match[1] || 'Purchase';
        amount = parseFloat(match[1] || match[2]);
        category = match[3] || 'Other';
        date = match[4] || new Date().toISOString().split('T')[0];
      }

      if (!isNaN(amount) && amount > 0) {
        const transaction: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          description: description.trim(),
          amount: -Math.abs(amount), // Expenses are negative
          category,
          date,
          type: 'expense'
        };

        transactions.push(transaction);
      }
    }
  });



  return transactions;
}

function extractBudgetData(text: string): Budget[] {
  const budgets: Budget[] = [];

  // Try to extract budget data from structured text patterns
  const budgetPatterns = [
    /([^:]+):\s*\$(\d+\.?\d*)\s*\/\s*\$(\d+\.?\d*)/gi, // Category: $spent / $limit
    /([^:]+)\s+budget:\s*\$(\d+\.?\d*)\s+spent:\s*\$(\d+\.?\d*)/gi
  ];

  budgetPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const category = match[1].trim();
      const spent = parseFloat(match[2]);
      const limit = parseFloat(match[3]);

      if (!isNaN(spent) && !isNaN(limit)) {
        budgets.push({
          id: Math.random().toString(36).substr(2, 9),
          category,
          limit,
          spent,
          period: 'monthly'
        });
      }
    }
  });

  return budgets;
}

function extractGoalData(text: string): Goal[] {
  const goals: Goal[] = [];

  // Try to extract goal data from structured text patterns
  const goalPatterns = [
    /([^:]+):\s*\$(\d+\.?\d*)\s*\/\s*\$(\d+\.?\d*)\s+by\s+(\d{4}-\d{2}-\d{2})/gi, // Goal: $current / $target by date
    /saving\s+for\s+([^:]+):\s*\$(\d+\.?\d*)\s+of\s+\$(\d+\.?\d*)/gi
  ];

  goalPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const title = match[1].trim();
      const current_amount = parseFloat(match[2]);
      const target_amount = parseFloat(match[3]);
      const deadline = match[4] || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

      if (!isNaN(current_amount) && !isNaN(target_amount)) {
        goals.push({
          id: Math.random().toString(36).substr(2, 9),
          title,
          target_amount,
          current_amount,
          deadline,
          category: 'General'
        });
      }
    }
  });

  return goals;
}

/**
 * Enhanced version that works with actual ADK tool responses
 * This handles the structured data returned by the ADK tools
 */
export function parseToolResponse(toolName: string, toolData: any): ParsedToolData {
  const result: ParsedToolData = {
    type: null,
    data: [],
    hasToolData: false,
  };

  console.log(`Parsing tool response for ${toolName}:`, toolData);

  switch (toolName) {
    case 'get_transactions':
      result.type = 'transactions';

      // Handle the actual structure returned by the get_transactions tool
      if (Array.isArray(toolData)) {
        // Direct array of transactions
        result.data = toolData.map((tx, index) => ({
          id: tx.id || index.toString(),
          description: tx.description || 'Unknown Transaction',
          amount: tx.amount || 0,
          category: tx.category || 'Other',
          date: tx.date || new Date().toISOString().split('T')[0],
          type: tx.type || (tx.amount < 0 ? 'expense' : 'income')
        }));
      } else if (toolData && typeof toolData === 'object') {
        // Check if it's wrapped in an object
        const transactions = toolData.transactions || toolData.data || toolData;
        if (Array.isArray(transactions)) {
          result.data = transactions.map((tx, index) => ({
            id: tx.id || index.toString(),
            description: tx.description || 'Unknown Transaction',
            amount: tx.amount || 0,
            category: tx.category || 'Other',
            date: tx.date || new Date().toISOString().split('T')[0],
            type: tx.type || (tx.amount < 0 ? 'expense' : 'income')
          }));
        }
      }

      result.hasToolData = result.data.length > 0;
      break;

    case 'get_budgets':
      result.type = 'budgets';

      if (Array.isArray(toolData)) {
        result.data = toolData.map((budget, index) => ({
          id: budget.id || index.toString(),
          category: budget.category || 'Unknown Category',
          limit: budget.limit || 0,
          spent: budget.spent || 0,
          period: budget.period || 'monthly'
        }));
      } else if (toolData && typeof toolData === 'object') {
        const budgets = toolData.budgets || toolData.data || toolData;
        if (Array.isArray(budgets)) {
          result.data = budgets.map((budget, index) => ({
            id: budget.id || index.toString(),
            category: budget.category || 'Unknown Category',
            limit: budget.limit || 0,
            spent: budget.spent || 0,
            period: budget.period || 'monthly'
          }));
        }
      }

      result.hasToolData = result.data.length > 0;
      break;

    case 'get_goals':
      result.type = 'goals';

      if (Array.isArray(toolData)) {
        result.data = toolData.map((goal, index) => ({
          id: goal.id || index.toString(),
          title: goal.title || 'Unknown Goal',
          target_amount: goal.target_amount || 0,
          current_amount: goal.current_amount || 0,
          deadline: goal.deadline || new Date().toISOString().split('T')[0],
          category: goal.category || 'General'
        }));
      } else if (toolData && typeof toolData === 'object') {
        const goals = toolData.goals || toolData.data || toolData;
        if (Array.isArray(goals)) {
          result.data = goals.map((goal, index) => ({
            id: goal.id || index.toString(),
            title: goal.title || 'Unknown Goal',
            target_amount: goal.target_amount || 0,
            current_amount: goal.current_amount || 0,
            deadline: goal.deadline || new Date().toISOString().split('T')[0],
            category: goal.category || 'General'
          }));
        }
      }

      result.hasToolData = result.data.length > 0;
      break;

    case 'emit_plan_preview':
      // Planning agent preview tool returns a plan object; wrap in array for widget consumption
      result.type = 'plan';
      if (toolData && typeof toolData === 'object') {
        result.data = [toolData];
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'finalize_plan':
      // Finalization returns summary; let UI continue showing plan preview from prior step.
      // We still propagate as 'plan' type if it contains a 'plan' field, else leave as no-op.
      if (toolData && typeof toolData === 'object' && toolData.plan) {
        result.type = 'plan';
        result.data = [toolData.plan];
        result.hasToolData = true;
      }
      break;

    default:
      break;
  }

  console.log(`Parsed tool response result:`, result);
  return result;
}
