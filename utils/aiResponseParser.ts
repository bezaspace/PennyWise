import { Transaction, Budget, Goal } from '@/services/api';

export interface ParsedToolData {
  type: 'transactions' | 'budgets' | 'goals' | 'plan' | 'holdings' | 'trades' | 'watchlist' | 'quote' | 'portfolio_summary' | 'market_research' | 'product_alternatives' | null;
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
  console.log(`Tool name type: ${typeof toolName}, exact value: "${toolName}"`);

  // Normalize common ADK wrappers and stringified JSON
  const unwrap = (payload: any): any => {
    try {
      if (payload == null) return payload;
      // Stringified JSON
      if (typeof payload === 'string') {
        try {
          return JSON.parse(payload);
        } catch {
          return payload;
        }
      }
      // Common wrappers
      if (typeof payload === 'object') {
        if ('result' in payload && typeof (payload as any).result === 'string') {
          try { return JSON.parse((payload as any).result as string); } catch { /* ignore */ }
        }
        if ('output' in payload) return (payload as any).output;
        if ('response' in payload) return (payload as any).response;
        if ('data' in payload) return (payload as any).data;
      }
      return payload;
    } catch {
      return payload;
    }
  };

  const normalized = unwrap(toolData);

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

    // --- Investment tools ---
    case 'get_investment_holdings':
      result.type = 'holdings';
      if (Array.isArray(normalized)) {
        result.data = normalized;
      } else if (normalized && typeof normalized === 'object') {
        const arr = (normalized as any).holdings || (normalized as any).data || normalized;
        if (Array.isArray(arr)) result.data = arr;
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'get_portfolio_summary':
      result.type = 'portfolio_summary';
      if (normalized && typeof normalized === 'object') {
        result.data = [normalized];
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'list_trades':
      result.type = 'trades';
      if (Array.isArray(normalized)) {
        result.data = normalized;
      } else if (normalized && typeof normalized === 'object') {
        const arr = (normalized as any).trades || (normalized as any).data || normalized;
        if (Array.isArray(arr)) result.data = arr;
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'create_trade':
      result.type = 'trades';
      if (normalized && typeof normalized === 'object') {
        result.data = [normalized];
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'get_watchlist':
      result.type = 'watchlist';
      if (Array.isArray(normalized)) {
        result.data = normalized;
      } else if (normalized && typeof normalized === 'object') {
        const arr = (normalized as any).watchlist || (normalized as any).data || normalized;
        if (Array.isArray(arr)) result.data = arr;
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'add_watchlist_item':
      result.type = 'watchlist';
      if (normalized && typeof normalized === 'object') {
        result.data = [normalized];
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'get_quote':
      result.type = 'quote';
      if (normalized && typeof normalized === 'object') {
        result.data = [normalized];
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'get_latest_plan':
      result.type = 'plan';
      if (normalized && typeof normalized === 'object') {
        result.data = [normalized];
      }
      result.hasToolData = result.data.length > 0;
      break;

    case 'get_latest_plan_payload':
      result.type = 'plan';
      if (normalized && typeof normalized === 'object') {
        result.data = [normalized];
      }
      result.hasToolData = result.data.length > 0;
      break;

  case 'google_search':
  case 'MarketResearchAssistant':
  case 'MarketResearchAgent':
  case 'exa_search':
  case 'exa_search_payload':
      result.type = 'market_research';
      console.log('Processing market research tool response:', JSON.stringify(normalized, null, 2));

      // Check for renderedContent or rendered_content HTML field
      let renderedContent = null;
      if (normalized && typeof normalized === 'object') {
        if (typeof normalized.renderedContent === 'string') {
          renderedContent = normalized.renderedContent;
        } else if (typeof normalized.rendered_content === 'string') {
          renderedContent = normalized.rendered_content;
        } else if (
          normalized.grounding_metadata &&
          normalized.grounding_metadata.search_entry_point &&
          typeof normalized.grounding_metadata.search_entry_point.rendered_content === 'string'
        ) {
          renderedContent = normalized.grounding_metadata.search_entry_point.rendered_content;
        }
      }

        if (renderedContent) {
          // Pass HTML to widget for WebView rendering
          result.data = [{ renderedContent }];
          result.hasToolData = true;
          console.log('Passing renderedContent to widget for market research:', renderedContent.substring(0, 200));
        } else if (normalized && typeof normalized === 'object') {
        // Fallback: extract sources as before
        let searchResults = [];

        if (Array.isArray(normalized)) {
          searchResults = normalized;
        } else if (normalized.results && Array.isArray(normalized.results)) {
          searchResults = normalized.results;
        } else if (normalized.search_results && Array.isArray(normalized.search_results)) {
          searchResults = normalized.search_results;
        } else if (normalized.items && Array.isArray(normalized.items)) {
          searchResults = normalized.items;
        } else if (normalized.sources && Array.isArray(normalized.sources)) {
          searchResults = normalized.sources;
        } else if (normalized.web && normalized.web.results && Array.isArray(normalized.web.results)) {
          searchResults = normalized.web.results;
        } else {
          const textResponse = normalized.text || normalized.response || normalized.content || JSON.stringify(normalized);
          if (typeof textResponse === 'string') {
            searchResults = extractSourcesFromText(textResponse);
          } else {
            searchResults = [{
              title: normalized.title || 'Search Result',
              url: normalized.url || normalized.link || '#',
              snippet: normalized.snippet || normalized.description || '',
              source: normalized.source || 'Google Search',
              date: normalized.date || new Date().toISOString().split('T')[0]
            }];
          }
        }

        // Simplify to minimal link objects and dedupe by URL.
        // If an item doesn't include a usable URL (or uses '#'), try extracting URLs from its
        // snippet/text using the existing extractSourcesFromText helper.
        const links: any[] = [];
        const seen = new Set<string>();

        const pushLink = (title: string, url: string) => {
          try {
            const cleanUrl = String(url).trim();
            if (!cleanUrl || cleanUrl === '#') return false;
            // filter out image/static asset urls
            if (isLikelyAssetUrl(cleanUrl)) return false;
            // normalize trailing slash
            const normalized = cleanUrl.replace(/\/$/, '');
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            links.push({ title: title || prettyTitleFromUrl(normalized) || `Source ${links.length + 1}`, url: normalized });
            return true;
          } catch (e) {
            return false;
          }
        };

        searchResults.forEach((item: any, index: number) => {
          const possibleUrl = item.url || item.link || item.href || item.source || null;

          // If the item has an explicit usable URL, use it
          if (possibleUrl && String(possibleUrl).trim() !== '#') {
            pushLink(item.title || item.name || `Source ${links.length + 1}`, String(possibleUrl));
            return;
          }

          // Otherwise, try to pull URLs out of the snippet/text for this item
          const textToScan = item.snippet || item.text || item.description || JSON.stringify(item || {});
          const extracted = extractSourcesFromText(String(textToScan));
          if (extracted && extracted.length > 0) {
            extracted.forEach((s) => {
              pushLink(s.title || item.title || `Source ${links.length + 1}`, s.url);
            });
            return;
          }

          // As a final fallback, if the item has a 'id' that looks like a URL, try it
          if (item.id && typeof item.id === 'string' && (item.id.startsWith('http') || item.id.startsWith('www.'))) {
            pushLink(item.title || item.name || `Source ${links.length + 1}`, item.id);
          }
        });

        result.data = links;
        result.hasToolData = result.data.length > 0;
      }
      console.log('Final market research result:', result);
      break;

    case 'exa_productsearch_tool':
      // Normalize product results into product_alternatives
      result.type = 'product_alternatives';
      try {
        const norm = normalized;
        let items: any[] = [];
        if (Array.isArray(norm)) items = norm;
        else if (norm && typeof norm === 'object') items = norm.results || norm.data || [];
        // Ensure items are array of { title, url, price?, merchant?, image? }
        result.data = (items || []).map((it: any, idx: number) => ({
          id: it.id || idx.toString(),
          title: it.title || it.name || `Product ${idx + 1}`,
          url: it.url || it.link || '#',
          price: it.price || it.amount || null,
          currency: it.currency || 'USD',
          merchant: it.merchant || it.source || '',
          image: it.image || it.thumbnail || null,
          snippet: it.snippet || it.text || '',
        }));
        result.hasToolData = result.data.length > 0;
      } catch (e) {
        result.hasToolData = false;
      }
      break;

    default:
      // Check if this might be a market research related tool by name pattern
      if (toolName && (
        toolName.toLowerCase().includes('market') ||
        toolName.toLowerCase().includes('research') ||
        toolName.toLowerCase().includes('search')
      )) {
        console.log(`Detected potential market research tool: ${toolName}`);
        result.type = 'market_research';

        // Try to extract sources from the response
        if (normalized && typeof normalized === 'object') {
          const textResponse = normalized.text || normalized.response || normalized.content || JSON.stringify(normalized);
          if (typeof textResponse === 'string') {
            result.data = extractSourcesFromText(textResponse);
            result.hasToolData = result.data.length > 0;
          }
        }
      }
      break;
  }

  console.log(`Parsed tool response result:`, result);
  return result;
}

/**
 * Helper function to extract sources from Gemini's rendered content HTML
 */
function extractSourcesFromRenderedContent(renderedContent: string): any[] {
  const sources: any[] = [];

  // Parse HTML to extract links and titles
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let match;

  while ((match = linkPattern.exec(renderedContent)) !== null) {
    const url = match[1];
    const title = match[2];

    sources.push({
      title: title,
      url: url,
      snippet: '',
      source: url ? new URL(url).hostname : '',
      date: new Date().toISOString().split('T')[0]
    });
  }

  return sources;
}

/**
 * Helper function to extract source information from text responses
 * This handles cases where the market research agent returns text with embedded source links
 */
function extractSourcesFromText(text: string): any[] {
  const sources: any[] = [];

  // Pattern to match URLs in text
  const urlPattern = /https?:\/\/[^\s\)\]]+/g;
  const urls = text.match(urlPattern) || [];

  // Pattern to match source citations like "Source: [Title](URL)" or "[Title](URL)"
  const citationPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = citationPattern.exec(text)) !== null) {
    const title = match[1];
    const url = match[2];

    sources.push({
      title: title,
      url: url,
      snippet: '',
      source: url && url !== '#' ? new URL(url).hostname : '',
      date: new Date().toISOString().split('T')[0]
    });
  }

  // Pattern to match "Source: Title - URL" format
  const sourcePattern = /(?:Source|Sources?):\s*([^\n-]+?)\s*-\s*(https?:\/\/[^\s\n]+)/gi;
  while ((match = sourcePattern.exec(text)) !== null) {
    const title = match[1].trim();
    const url = match[2];

    sources.push({
      title: title,
      url: url,
      snippet: '',
      source: new URL(url).hostname,
      date: new Date().toISOString().split('T')[0]
    });
  }

  // Pattern to match "Title (URL)" format
  const titleUrlPattern = /([^(\n]+)\s*\((https?:\/\/[^)]+)\)/g;
  while ((match = titleUrlPattern.exec(text)) !== null) {
    const title = match[1].trim();
    const url = match[2];

    // Avoid duplicates
    if (!sources.some(s => s.url === url)) {
      sources.push({
        title: title,
        url: url,
        snippet: '',
        source: new URL(url).hostname,
        date: new Date().toISOString().split('T')[0]
      });
    }
  }

  // If no citations found, create sources from URLs
  if (sources.length === 0 && urls.length > 0) {
    urls.forEach((url, index) => {
      try {
        sources.push({
          title: `Source ${index + 1}`,
          url: url,
          snippet: '',
          source: new URL(url).hostname,
          date: new Date().toISOString().split('T')[0]
        });
      } catch (e) {
        // Invalid URL, skip
      }
    });
  }

  // If still no sources, create a generic one
  if (sources.length === 0) {
    sources.push({
      title: 'Market Research Results',
      url: '#',
      snippet: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
      source: 'Research Analysis',
      date: new Date().toISOString().split('T')[0]
    });
  }

  return sources;
}

/**
 * Heuristics to ignore image/static asset URLs and favicons.
 */
function isLikelyAssetUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const path = u.pathname || '';
    // common static file extensions
    if (/\.(png|jpe?g|gif|bmp|svg|ico|webp|map)$/i.test(path)) return true;
    // favicon or screenshot indicators
    if (/favicon|screenshot|__screenshot|chart/gi.test(path + u.hostname)) return true;
    // CDN-like small-image hosts (heuristic)
    if (/cdn\.|static\.|assets\./i.test(u.hostname)) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Create a readable title from a URL when no title is present.
 */
function prettyTitleFromUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      // If last looks like an id or file, fall back to hostname
      if (/^[a-zA-Z0-9\-\_]+$/.test(last) && last.length <= 30) {
        return decodeURIComponent(last.replace(/[-_]/g, ' '));
      }
    }
    return u.hostname.replace(/^www\./, '');
  } catch (e) {
    return String(urlStr).replace(/^https?:\/\//, '');
  }
}
