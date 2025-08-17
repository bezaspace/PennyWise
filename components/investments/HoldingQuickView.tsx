import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService } from '@/services/api';
import Sparkline from './Sparkline';

type Holding = {
  symbol: string;
  company_name?: string;
  quantity: number;
  average_cost: number;
  current_price: number;
  value: number;
  unrealized_gain: number;
  unrealized_gain_percent: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  holding: Holding | null;
  onLogTrade: (symbol: string, company?: string) => void;
  onRemoveHolding: (symbol: string) => Promise<void> | void;
};

export function HoldingQuickView({ visible, onClose, holding, onLogTrade, onRemoveHolding }: Props) {
  if (!holding) return null;
  const [history, setHistory] = useState<Array<{ t: number; price: number }> | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '1m' | '6m'>('1d');
  const [quote, setQuote] = useState<null | any>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingHistory(true);
      try {
        if (!holding) return;
        const series = await apiService.getPriceHistory(holding.symbol, selectedPeriod);
        if (!mounted) return;
  // series expected: [{t, price}, ...]
  setHistory(series || []);
      } catch (e) {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    if (visible && holding) load();
    return () => { mounted = false; };
  }, [visible, holding.symbol, selectedPeriod]);

  useEffect(() => {
    let mounted = true;
    async function loadQuote() {
      if (!holding) return;
      setLoadingQuote(true);
      try {
        const q = await apiService.getQuote(holding.symbol);
        if (!mounted) return;
        setQuote(q);
      } catch (e) {
        setQuote(null);
      } finally {
        setLoadingQuote(false);
      }
    }
    if (visible && holding) loadQuote();
    return () => { mounted = false; };
  }, [visible, holding.symbol]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>{holding.symbol}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {/* price row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.item, { fontSize: 20 }]}>${holding.current_price?.toFixed(2)}</Text>
            <Text style={[styles.item, holding.unrealized_gain >= 0 ? styles.gain : styles.loss]}>{holding.unrealized_gain >= 0 ? '+' : ''}{holding.unrealized_gain.toFixed(2)} ({holding.unrealized_gain_percent.toFixed(2)}%)</Text>
          </View>

          {/* period toggles */}
          <View style={styles.segmentRow}>
            {[
              { key: '1d', label: '1D' },
              { key: '1m', label: '1M' },
              { key: '6m', label: '6M' },
            ].map(p => (
              <TouchableOpacity
                key={p.key}
                style={[styles.segmentButton, selectedPeriod === (p.key as any) ? styles.segmentButtonActive : null]}
                onPress={() => setSelectedPeriod(p.key as any)}
              >
                <Text style={[styles.segmentText, selectedPeriod === (p.key as any) ? styles.segmentTextActive : null]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingHistory ? null : history && history.length > 0 ? (
            (() => {
              const screenWidth = Dimensions.get('window').width;
              const padding = 32; // modal horizontal padding
              const sparkWidth = Math.max(160, screenWidth - padding);
              return <Sparkline series={history} width={sparkWidth} height={220} />;
            })()
          ) : null}
          {holding.company_name ? <Text style={styles.item}>{holding.company_name}</Text> : null}
          <Text style={styles.item}>Qty: {holding.quantity}</Text>
          <Text style={styles.item}>Avg cost: ${holding.average_cost.toFixed(2)}</Text>
          <Text style={styles.item}>Value: ${holding.value.toFixed(2)}</Text>

          {/* extended quote fields - compact grid */}
          {quote ? (
            <View style={styles.statsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Open</Text>
                  <Text style={styles.statValue}>{quote.open ? `$${quote.open.toFixed(2)}` : '—'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>High</Text>
                  <Text style={styles.statValue}>{quote.day_high ? `$${quote.day_high.toFixed(2)}` : '—'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Low</Text>
                  <Text style={styles.statValue}>{quote.day_low ? `$${quote.day_low.toFixed(2)}` : '—'}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Market cap</Text>
                  <Text style={styles.statValue}>{quote.market_cap ? `${(quote.market_cap/1e9).toFixed(2)}B` : '—'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>P/E</Text>
                  <Text style={styles.statValue}>{quote.pe_ratio ?? '—'}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Div yield</Text>
                  <Text style={styles.statValue}>{quote.div_yield ? `${(quote.div_yield*100).toFixed(2)}%` : '—'}</Text>
                </View>
              </View>

              <View style={styles.stats52}
              >
                <Text style={styles.statLabel}>52-wk</Text>
                <Text style={styles.statValue}>{quote.fifty_two_wk_low ? `$${quote.fifty_two_wk_low.toFixed(2)}` : '—'} — {quote.fifty_two_wk_high ? `$${quote.fifty_two_wk_high.toFixed(2)}` : '—'}</Text>
              </View>
            </View>
          ) : null}
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <TouchableOpacity style={[globalStyles.button]} onPress={() => onLogTrade(holding.symbol, holding.company_name)}>
            <Text style={globalStyles.buttonText}>Log Trade</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[globalStyles.button, { backgroundColor: colors.error[600] }]} onPress={() => onRemoveHolding(holding.symbol)}>
            <Text style={globalStyles.buttonText}>Remove Holding</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[900] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { color: colors.neutral[100], fontFamily: 'Inter-SemiBold', fontSize: 18 },
  cancel: { color: colors.primary[400], fontFamily: 'Inter-Medium' },
  item: { color: colors.neutral[200], fontFamily: 'Inter-Regular' },
  gain: { color: colors.success[500] },
  loss: { color: colors.error[500] },
  // price and smallMeta removed; sparkline uses full-width now
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  segmentButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.neutral[700] },
  segmentButtonActive: { backgroundColor: colors.primary[400], borderColor: colors.primary[400] },
  segmentText: { color: colors.neutral[300], fontFamily: 'Inter-Medium' },
  segmentTextActive: { color: colors.neutral[100] },
  statsContainer: { marginTop: 8, gap: 8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1, paddingRight: 8 },
  statLabel: { color: colors.neutral[400], fontSize: 12, fontFamily: 'Inter-Medium' },
  statValue: { color: colors.neutral[100], fontSize: 13, fontFamily: 'Inter-SemiBold', marginTop: 2 },
  stats52: { marginTop: 6 },
});


