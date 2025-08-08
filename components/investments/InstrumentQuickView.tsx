import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';
import { apiService } from '@/services/api';

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
  const [quote, setQuote] = useState<null | { price: number; prev_close: number; change: number; change_percent: number; last_updated: number }>(null);

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
});


