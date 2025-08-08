import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { useInvestments } from '@/hooks/useInvestments';
import { AddTradeModal } from '@/components/investments/AddTradeModal';
import { SearchSymbolModal } from '@/components/investments/SearchSymbolModal';
import { HoldingQuickView } from '@/components/investments/HoldingQuickView';
import { InstrumentQuickView } from '@/components/investments/InstrumentQuickView';
import { TradeDetailsModal } from '@/components/investments/TradeDetailsModal';
import { EditTradeModal } from '@/components/investments/EditTradeModal';

function SectionHeader({ title, actionText, onPress }: { title: string; actionText?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionText && onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.sectionAction}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function InvestmentsScreen() {
  const {
    summary,
    holdings,
    trades,
    watchlist,
    loading,
    error,
    reload,
    loadAllTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    removeHolding,
    addToWatchlist,
    removeFromWatchlist,
  } = useInvestments();

  const [showAllTrades, setShowAllTrades] = useState(false);

  const tradesToShow = useMemo(() => (showAllTrades ? trades : trades.slice(0, 3)), [showAllTrades, trades]);

  const [showAddTrade, setShowAddTrade] = useState(false);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState<null | (typeof holdings[number])>(null);
  const [selectedWatch, setSelectedWatch] = useState<null | { id: string; symbol: string; company_name?: string }>(null);
  const [selectedTrade, setSelectedTrade] = useState<null | (typeof trades[number])>(null);
  const [showEditTrade, setShowEditTrade] = useState(false);
  const [prefill, setPrefill] = useState<{ symbol?: string; company_name?: string; type?: 'buy' | 'sell' }>({});

  const handleRefresh = () => {
    reload();
    if (showAllTrades) loadAllTrades();
  };

  const isEmpty = !holdings.length && !watchlist.length && (!trades || !trades.length);

  return (
    <View style={globalStyles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={!!loading} onRefresh={handleRefresh} tintColor={colors.neutral[100]} />}
      >
        {/* Portfolio Summary */}
        <View style={globalStyles.card}>
          <Text style={globalStyles.title}>Portfolio</Text>
          {summary ? (
            <View>
              <Text style={styles.valueText}>${summary.total_value.toFixed(2)}</Text>
              <Text style={styles.deltaText}>
                Day {summary.day_change >= 0 ? '+' : ''}{summary.day_change.toFixed(2)} ({summary.day_change_percent.toFixed(2)}%)
              </Text>
              <Text style={styles.deltaText}>
                Overall {summary.overall_gain >= 0 ? 'Gain +' : 'Loss '}
                {summary.overall_gain.toFixed(2)} ({summary.overall_gain_percent.toFixed(2)}%)
              </Text>
              <View style={styles.quickActions}>
                <TouchableOpacity style={styles.primaryButton}
                  onPress={() => { setPrefill({}); setShowAddTrade(true); }}>
                  <Text style={styles.buttonText}>Add Trade</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton}
                  onPress={() => setShowAddWatch(true)}>
                  <Text style={styles.secondaryButtonText}>Add to Watchlist</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text style={globalStyles.body}>Loading...</Text>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Empty State */}
        {isEmpty && (
          <View style={globalStyles.card}>
            <Text style={globalStyles.subtitle}>Track your investments</Text>
            <Text style={globalStyles.body}>Add a stock you own or a stock you’re watching to get started.</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.primaryButton}
                onPress={() => { setPrefill({}); setShowAddTrade(true); }}>
                <Text style={styles.buttonText}>Add Holding</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton}
                onPress={() => setShowAddWatch(true)}>
                <Text style={styles.secondaryButtonText}>Add to Watchlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Holdings */}
        <View style={globalStyles.card}>
          <SectionHeader title="Holdings" />
          {holdings.length === 0 ? (
            <Text style={globalStyles.body}>Add your first holding to see it here.</Text>
          ) : (
            <View>
              {holdings.map(h => (
                <TouchableOpacity key={h.symbol} style={styles.row} onPress={() => setSelectedHolding(h)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{h.symbol}</Text>
                    {h.company_name ? <Text style={styles.rowSub}>{h.company_name}</Text> : null}
                    <Text style={styles.rowMeta}>Qty {h.quantity} • Avg ${h.average_cost.toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rowTitle}>${h.value.toFixed(2)}</Text>
                    <Text style={[styles.pnlText, (h.unrealized_gain >= 0) ? styles.gain : styles.loss]}>
                      {h.unrealized_gain >= 0 ? '+' : ''}{h.unrealized_gain.toFixed(2)} ({h.unrealized_gain_percent.toFixed(2)}%)
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Trades */}
        <View style={globalStyles.card}>
          <SectionHeader title="Recent Trades" actionText={showAllTrades ? 'Show Less' : 'View All'} onPress={() => {
            const next = !showAllTrades;
            setShowAllTrades(next);
            if (next) loadAllTrades();
          }} />
          {tradesToShow.length === 0 ? (
            <Text style={globalStyles.body}>No trades yet. Log your first trade to start tracking your performance.</Text>
          ) : (
            <View>
              {tradesToShow.map(t => (
                <TouchableOpacity key={t.id} style={styles.row} onPress={() => setSelectedTrade(t)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{t.type.toUpperCase()} {t.symbol}</Text>
                    <Text style={styles.rowSub}>{t.quantity} @ ${t.price.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{new Date(t.date).toLocaleDateString()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Watchlist */}
        <View style={globalStyles.card}>
          <SectionHeader title="Watchlist" />
          {watchlist.length === 0 ? (
            <Text style={globalStyles.body}>Add a stock to your watchlist to track its price.</Text>
          ) : (
            <View>
              {watchlist.map(w => (
                <TouchableOpacity key={w.id} style={styles.row} onPress={() => setSelectedWatch(w)}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{w.symbol}</Text>
                    {w.company_name ? <Text style={styles.rowSub}>{w.company_name}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <AddTradeModal
        visible={showAddTrade}
        onClose={() => setShowAddTrade(false)}
        onSaved={reload}
        addTrade={addTrade}
        defaultSymbol={prefill.symbol}
        defaultCompanyName={prefill.company_name}
        defaultType={prefill.type || 'buy'}
      />

      <SearchSymbolModal
        visible={showAddWatch}
        onClose={() => setShowAddWatch(false)}
        onConfirm={async (symbol, company) => { await addToWatchlist({ symbol, company_name: company }); reload(); }}
      />

      <HoldingQuickView
        visible={!!selectedHolding}
        onClose={() => setSelectedHolding(null)}
        holding={selectedHolding}
        onLogTrade={(symbol, company) => { setSelectedHolding(null); setPrefill({ symbol, company_name: company }); setShowAddTrade(true); }}
        onRemoveHolding={async (symbol) => { await removeHolding(symbol); setSelectedHolding(null); reload(); }}
      />

      <InstrumentQuickView
        visible={!!selectedWatch}
        onClose={() => setSelectedWatch(null)}
        symbol={selectedWatch?.symbol || null}
        companyName={selectedWatch?.company_name}
        onAddToHoldings={(symbol) => { setSelectedWatch(null); setPrefill({ symbol }); setShowAddTrade(true); }}
        onRemoveFromWatchlist={async (idOrSymbol) => { await removeFromWatchlist(idOrSymbol); setSelectedWatch(null); reload(); }}
      />

      <TradeDetailsModal
        visible={!!selectedTrade}
        onClose={() => setSelectedTrade(null)}
        trade={selectedTrade}
        onEdit={() => { setShowEditTrade(true); }}
        onDelete={async () => { if (selectedTrade) { await deleteTrade(selectedTrade.id); setSelectedTrade(null); reload(); } }}
      />

      <EditTradeModal
        visible={showEditTrade}
        onClose={() => setShowEditTrade(false)}
        trade={selectedTrade}
        onSaved={async () => { setShowEditTrade(false); await reload(); }}
        updateTrade={updateTrade}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.neutral[100],
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
  },
  sectionAction: {
    color: colors.primary[400],
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  valueText: {
    color: colors.neutral[50],
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    marginBottom: 6,
  },
  deltaText: {
    color: colors.neutral[300],
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: {
    color: colors.neutral[50],
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    backgroundColor: colors.neutral[700],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.neutral[100],
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    color: colors.error[500],
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[700],
  },
  rowTitle: {
    color: colors.neutral[100],
    fontFamily: 'Inter-Medium',
    fontSize: 16,
  },
  rowSub: {
    color: colors.neutral[400],
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  rowMeta: {
    color: colors.neutral[400],
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  pnlText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  gain: {
    color: colors.success[500],
  },
  loss: {
    color: colors.error[500],
  },
});


