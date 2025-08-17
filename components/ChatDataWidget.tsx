import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { colors } from '@/constants/colors';
import { TransactionItem } from './TransactionItem';
import { BudgetProgress } from './BudgetProgress';
import { GoalCard } from './GoalCard';
import { Transaction, Budget, Goal } from '@/services/api';
import { View as RNView } from 'react-native';
import PlanPreview from './PlanPreview';
import { ExternalLink } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

interface ChatDataWidgetProps {
  type: 'transactions' | 'budgets' | 'goals' | 'plan' | 'holdings' | 'trades' | 'watchlist' | 'quote' | 'portfolio_summary' | 'market_research';
  data: any;
  title?: string;
  compact?: boolean;
}

export function ChatDataWidget({ type, data, title, compact }: ChatDataWidgetProps) {
  if (!data || data.length === 0) return null;

  const fmtCurrency = (n: number) => `$${Number(n || 0).toFixed(2)}`;
  const fmtPct = (n: number) => `${Number(n || 0).toFixed(2)}%`;

  const renderContent = () => {
    switch (type) {
      case 'transactions':
        return (
          <View style={[styles.widgetContainer, compact && styles.widgetContainerCompact]}>
            <Text style={[styles.widgetTitle, compact && styles.widgetTitleCompact]}>{title || 'Recent Transactions'}</Text>
            <View style={styles.transactionsContainer}>
              {data.map((transaction: Transaction, index: number) => (
                <View key={index} style={[styles.transactionItem, compact && styles.transactionItemCompact]}>
                  <TransactionItem 
                    transaction={transaction} 
                    onPress={() => {}} 
                    compact={compact}
                  />
                </View>
              ))}
            </View>
          </View>
        );

      case 'budgets':
        return (
          <View style={[styles.widgetContainer, compact && styles.widgetContainerCompact]}>
            <Text style={[styles.widgetTitle, compact && styles.widgetTitleCompact]}>{title || 'Budget Overview'}</Text>
            <View style={styles.budgetsContainer}>
              {data.map((budget: Budget, index: number) => (
                <View key={index} style={[styles.budgetItem, compact && styles.budgetItemCompact]}>
                  <BudgetProgress budget={budget} compact={compact} />
                </View>
              ))}
            </View>
          </View>
        );

      case 'goals':
        return (
          <View style={[styles.widgetContainer, compact && styles.widgetContainerCompact]}>
            <Text style={[styles.widgetTitle, compact && styles.widgetTitleCompact]}>{title || 'Financial Goals'}</Text>
            <View style={styles.goalsContainer}>
              {data.map((goal: Goal, index: number) => (
                <View key={index} style={[styles.goalItem, compact && styles.goalItemCompact]}>
                  <GoalCard goal={goal} onPress={() => {}} compact={compact} />
                </View>
              ))}
            </View>
          </View>
        );

      case 'plan':
        // Expect the data array to contain a single plan object
        return (
          <View style={[styles.widgetContainer, compact && styles.widgetContainerCompact]}>
            <Text style={[styles.widgetTitle, compact && styles.widgetTitleCompact]}>{title || 'Proposed Monthly Plan'}</Text>
            <PlanPreview plan={Array.isArray(data) ? data[0] : data} compact={compact} />
          </View>
        );

      case 'holdings':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Holdings'}</Text>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.hCell, styles.flex2]}>Symbol</Text>
                <Text style={[styles.hCell, styles.flex1, styles.right]}>Qty</Text>
                <Text style={[styles.hCell, styles.flex1, styles.right]}>Price</Text>
                <Text style={[styles.hCell, styles.flex1_5, styles.right]}>Value</Text>
                <Text style={[styles.hCell, styles.flex1, styles.right]}>P/L%</Text>
              </View>
              {data.map((h: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={[styles.cell, styles.flex2]}>
                    {h.symbol}{h.company_name ? ` · ${h.company_name}` : ''}
                  </Text>
                  <Text style={[styles.cell, styles.flex1, styles.right]}>{Number(h.quantity || 0)}</Text>
                  <Text style={[styles.cell, styles.flex1, styles.right]}>{fmtCurrency(h.current_price)}</Text>
                  <Text style={[styles.cell, styles.flex1_5, styles.right]}>{fmtCurrency(h.value)}</Text>
                  <Text style={[styles.cell, styles.flex1, styles.right, (Number(h.unrealized_gain_percent || 0) >= 0 ? styles.gain : styles.loss)]}>
                    {fmtPct(h.unrealized_gain_percent)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'trades':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Recent Trades'}</Text>
            <View style={styles.table}>
              <View style={[styles.row, styles.headerRow]}>
                <Text style={[styles.hCell, styles.flex1]}>Type</Text>
                <Text style={[styles.hCell, styles.flex1]}>Symbol</Text>
                <Text style={[styles.hCell, styles.flex1, styles.right]}>Qty</Text>
                <Text style={[styles.hCell, styles.flex1, styles.right]}>Price</Text>
                <Text style={[styles.hCell, styles.flex2, styles.right]}>Date</Text>
              </View>
              {data.map((t: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={[styles.cell, styles.flex1]}>{String(t.type || '').toUpperCase()}</Text>
                  <Text style={[styles.cell, styles.flex1]}>{t.symbol}</Text>
                  <Text style={[styles.cell, styles.flex1, styles.right]}>{Number(t.quantity || 0)}</Text>
                  <Text style={[styles.cell, styles.flex1, styles.right]}>{fmtCurrency(t.price)}</Text>
                  <Text style={[styles.cell, styles.flex2, styles.right]}>{t.date || ''}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'watchlist':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Watchlist'}</Text>
            <View style={styles.table}>
              {data.map((w: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={[styles.cell, styles.flex2]}>{w.symbol}{w.company_name ? ` · ${w.company_name}` : ''}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'quote':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Quote'}</Text>
            {Array.isArray(data) && data[0] ? (
              <View style={{ gap: 6 }}>
                <Text style={styles.item}>{fmtCurrency(data[0].price)} ({Number(data[0].change || 0) >= 0 ? '+' : ''}{Number(data[0].change || 0).toFixed(2)})</Text>
                <Text style={styles.meta}>Prev close: {fmtCurrency(data[0].prev_close)}</Text>
              </View>
            ) : null}
          </View>
        );

      case 'portfolio_summary':
        return (
          <View style={styles.widgetContainer}>
            <Text style={styles.widgetTitle}>{title || 'Portfolio Summary'}</Text>
            {Array.isArray(data) && data[0] ? (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard]}>
                  <Text style={styles.summaryLabel}>Total</Text>
                  <Text style={styles.summaryValue}>{fmtCurrency(data[0].total_value)}</Text>
                </View>
                <View style={[styles.summaryCard]}>
                  <Text style={styles.summaryLabel}>Today</Text>
                  <Text style={[styles.summaryValue, Number(data[0].day_change || 0) >= 0 ? styles.gain : styles.loss]}>
                    {fmtCurrency(data[0].day_change)} ({fmtPct(data[0].day_change_percent)})
                  </Text>
                </View>
                <View style={[styles.summaryCard]}>
                  <Text style={styles.summaryLabel}>Overall</Text>
                  <Text style={[styles.summaryValue, Number(data[0].overall_gain || 0) >= 0 ? styles.gain : styles.loss]}>
                    {fmtCurrency(data[0].overall_gain)} ({fmtPct(data[0].overall_gain_percent)})
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        );

      case 'market_research':
        // Support both shapes: { renderedContent } or an array of result objects
        const htmlContent = Array.isArray(data) ? data[0]?.renderedContent : data?.renderedContent;
        // If we have HTML, render in WebView (preserve existing behavior)
        if (htmlContent) {
          // Inject CSS to style the HTML content for dark mode
          const injectedStyles = `
          <style>
            body { 
              background-color: ${colors.neutral[800]}; 
              color: ${colors.neutral[200]}; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 10px;
            }
            a { color: ${colors.primary[400]}; text-decoration: none; }
            .web-search-result { border-bottom: 1px solid ${colors.neutral[700]}; padding-bottom: 10px; margin-bottom: 10px; }
            .web-search-result:last-child { border-bottom: none; }
            .web-search-result-title { font-size: 16px; font-weight: 600; }
            .web-search-result-url { font-size: 12px; color: ${colors.neutral[400]}; margin-bottom: 4px; }
            .web-search-result-snippet { font-size: 14px; color: ${colors.neutral[300]}; }
          </style>
        `;
          return (
            <View style={[styles.widgetContainer, compact && styles.widgetContainerCompact]}>
              <Text style={[styles.widgetTitle, compact && styles.widgetTitleCompact]}>{title || 'Market Research Sources'}</Text>
              <View style={styles.webviewContainer}>
                <WebView
                  originWhitelist={['*']}
                  source={{ html: `${injectedStyles}<body>${htmlContent}</body>` }}
                  style={styles.webview}
                  onShouldStartLoadWithRequest={(event) => {
                    // Open external links in the device's browser
                    if (event.navigationType === 'click') {
                      Linking.openURL(event.url);
                      return false;
                    }
                    return true;
                  }}
                />
              </View>
            </View>
          );
        }

        // If no HTML, but data is an array of structured results, render them natively
        let resultsArray = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : null);
        if (!resultsArray || resultsArray.length === 0) return null;

        // Defensive: ensure every item is an object with title and url strings to avoid raw text nodes
        resultsArray = resultsArray.map((item: any, idx: number) => {
          if (!item || typeof item === 'string') {
            return { title: String(item || `Source ${idx + 1}`), url: '#' };
          }
          return {
            title: item.title && typeof item.title === 'string' ? item.title : (item.name && typeof item.name === 'string' ? item.name : `Source ${idx + 1}`),
            url: item.url && typeof item.url === 'string' ? item.url : (item.link && typeof item.link === 'string' ? item.link : '#')
          };
        });

        return (
          <View style={[styles.widgetContainer, compact && styles.widgetContainerCompact]}>
            <Text style={[styles.widgetTitle, compact && styles.widgetTitleCompact]}>{title || 'Market Research Sources'}</Text>
            <View style={styles.sourcesContainer}>
              {resultsArray.map((item: any, idx: number) => {
                // If the title is just a placeholder like "Source 4", replace it with a sequential label
                const isPlaceholder = typeof item.title === 'string' && /^Source\s+\d+$/i.test(item.title.trim());
                const displayTitle = !isPlaceholder && item.title ? item.title : `Source ${idx + 1}`;
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.sourceItem, compact && styles.sourceItemCompact]}
                    onPress={() => { if (item.url && item.url !== '#') Linking.openURL(item.url); }}
                  >
                    <View style={styles.sourceTitleContainer}>
                      <Text style={styles.sourceTitle}>{displayTitle}</Text>
                      <Text style={styles.sourceUrl}>{(item.url || '').replace(/^https?:\/\//, '')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  widgetContainer: {
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
    marginTop: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetContainerCompact: {
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
    borderLeftWidth: 2,
    shadowOpacity: 0.05,
    elevation: 0,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[400],
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  widgetTitleCompact: {
    fontSize: 12,
    marginBottom: 4,
  },
  transactionsContainer: {
    gap: 4,
  },
  transactionItem: {
    marginHorizontal: -12, // Offset container padding
  },
  transactionItemCompact: {
    marginHorizontal: -8,
  },
  budgetsContainer: {
    gap: 4,
  },
  budgetItem: {
    marginHorizontal: -12, // Offset container padding
  },
  budgetItemCompact: {
    marginHorizontal: -8,
  },
  goalsContainer: {
    gap: 4,
  },
  goalItem: {
    marginHorizontal: -12, // Offset container padding
  },
  goalItemCompact: {
    marginHorizontal: -8,
  },
  table: {
    width: '100%',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[700],
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[600],
    paddingBottom: 8,
    marginBottom: 4,
  },
  cell: {
    color: colors.neutral[200],
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  hCell: {
    color: colors.neutral[300],
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  flex1: { flex: 1 },
  flex1_5: { flex: 1.5 },
  flex2: { flex: 2 },
  right: { textAlign: 'right' },
  item: { color: colors.neutral[200], fontFamily: 'Inter-Regular' },
  meta: { color: colors.neutral[500], fontFamily: 'Inter-Regular', fontSize: 12 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.neutral[800],
    borderRadius: 10,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.neutral[700],
  },
  summaryLabel: {
    color: colors.neutral[400],
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    color: colors.neutral[100],
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  gain: { color: colors.success[500] },
  loss: { color: colors.error[500] },
  webviewContainer: {
    height: 300, // Give the WebView a fixed height
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.neutral[800],
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sourcesContainer: {
    gap: 8,
  },
  sourceItem: {
    backgroundColor: colors.neutral[700],
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary[500],
  },
  sourceItemCompact: {
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
  },
  sourceHeader: {
    marginBottom: 6,
  },
  sourceTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  sourceTitle: {
    color: colors.neutral[100],
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    flex: 1,
  },
  sourceUrl: {
    color: colors.primary[400],
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  sourceSnippet: {
    color: colors.neutral[300],
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  sourceDate: {
    color: colors.neutral[500],
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    textAlign: 'right',
  },
});
