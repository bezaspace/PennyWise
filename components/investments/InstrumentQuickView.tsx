import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService } from '@/services/api';
import Sparkline from './Sparkline';

type Props = {
  visible: boolean;
  onClose: () => void;
  symbol: string | null;
  onAddToHoldings: (symbol: string) => void;
  onRemoveFromWatchlist: (idOrSymbol: string) => Promise<void> | void;
  companyName?: string;
};

export function InstrumentQuickView({ visible, onClose, symbol, companyName, onAddToHoldings, onRemoveFromWatchlist }: Props) {
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<null | any>(null);
  const [history, setHistory] = useState<Array<{ t: number; price: number }> | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '1m' | '6m'>('1d');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!symbol) return;
      setLoading(true);
      try {
        const q = await apiService.getQuote(symbol);
        if (!cancelled) setQuote(q);
      } catch {
        if (!cancelled) setQuote(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (visible) load();
    return () => { cancelled = true; };
  }, [symbol, visible]);

  useEffect(() => {
    let mounted = true;
    async function loadHistory() {
      if (!symbol) return;
      setLoadingHistory(true);
      try {
        const series = await apiService.getPriceHistory(symbol, selectedPeriod);
        if (!mounted) return;
        setHistory(series || []);
      } catch (e) {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
    if (visible && symbol) loadHistory();
    return () => { mounted = false; };
  }, [symbol, visible, selectedPeriod]);

  if (!symbol) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>{symbol}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          {companyName ? <Text style={styles.company}>{companyName}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {loading ? (
              <ActivityIndicator color={colors.neutral[100]} />
            ) : quote ? (
              <View style={{ gap: 6 }}>
                <Text style={styles.item}>Price: ${quote.price.toFixed(2)}</Text>
                <Text style={[styles.item, quote.change >= 0 ? styles.gain : styles.loss]}>
                  Today: {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                </Text>
                <Text style={styles.meta}>Updated {Math.max(0, Math.round((Date.now()/1000 - quote.last_updated) / 60))} min ago</Text>
              </View>
            ) : (
              <Text style={styles.item}>Couldn't load price. Pull to refresh on the main screen.</Text>
            )}

            <View style={{ marginLeft: 12 }}>
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
            </View>
          </View>

          {loadingHistory ? null : history && history.length > 0 ? (
            (() => {
              const screenWidth = Dimensions.get('window').width;
              const padding = 32; // modal horizontal padding
              const sparkWidth = Math.max(160, screenWidth - padding);
              return <Sparkline series={history} width={sparkWidth} height={220} />;
            })()
          ) : null}
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

              <View style={styles.stats52}>
                <Text style={styles.statLabel}>52-wk</Text>
                <Text style={styles.statValue}>{quote.fifty_two_wk_low ? `$${quote.fifty_two_wk_low.toFixed(2)}` : '—'} — {quote.fifty_two_wk_high ? `$${quote.fifty_two_wk_high.toFixed(2)}` : '—'}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ padding: 16, gap: 8 }}>
          <TouchableOpacity style={[globalStyles.button]} onPress={() => onAddToHoldings(symbol)}>
            <Text style={globalStyles.buttonText}>Add to Holdings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[globalStyles.button, { backgroundColor: colors.error[600] }]} onPress={() => onRemoveFromWatchlist(symbol)}>
            <Text style={globalStyles.buttonText}>Remove from Watchlist</Text>
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
  company: { color: colors.neutral[300], fontFamily: 'Inter-Regular', marginBottom: 8 },
  item: { color: colors.neutral[200], fontFamily: 'Inter-Regular' },
  meta: { color: colors.neutral[500], fontFamily: 'Inter-Regular', fontSize: 12 },
  gain: { color: colors.success[500] },
  loss: { color: colors.error[500] },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.neutral[700] },
  segmentButtonActive: { backgroundColor: colors.primary[400], borderColor: colors.primary[400] },
  segmentText: { color: colors.neutral[300], fontFamily: 'Inter-Medium' },
  segmentTextActive: { color: colors.neutral[100] },
  statsContainer: { marginTop: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  statItem: { flex: 1, paddingVertical: 6 },
  statLabel: { color: colors.neutral[500], fontFamily: 'Inter-Regular', fontSize: 12 },
  statValue: { color: colors.neutral[100], fontFamily: 'Inter-SemiBold', fontSize: 14, marginTop: 4 },
  stats52: { marginTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[800], paddingTop: 8 },
});


