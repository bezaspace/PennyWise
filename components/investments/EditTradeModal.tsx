import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

type Trade = {
  id: string;
  symbol: string;
  company_name?: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees?: number;
  date: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  trade: Trade | null;
  onSaved: () => Promise<void> | void;
  updateTrade: (id: string, updates: Partial<Pick<Trade, 'quantity' | 'price' | 'fees' | 'date'>>) => Promise<any>;
};

export function EditTradeModal({ visible, onClose, trade, onSaved, updateTrade }: Props) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (trade) {
      setQuantity(String(trade.quantity));
      setPrice(String(trade.price));
      setFees(String(trade.fees ?? 0));
      setDate(trade.date.slice(0, 10));
      setError(null);
    }
  }, [trade]);

  if (!trade) return null;

  const handleSave = async () => {
    setError(null);
    const qty = parseFloat(quantity);
    const px = parseFloat(price);
    const f = parseFloat(fees || '0');
    if (!(qty > 0) || !(px > 0)) {
      setError('Quantity and price must be positive');
      return;
    }
    try {
      setSaving(true);
      await updateTrade(trade.id, { quantity: qty, price: px, fees: isNaN(f) ? 0 : f, date });
      await onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to update trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit {trade.type.toUpperCase()} {trade.symbol}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>

        <View style={styles.rowInline}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={quantity} onChangeText={setQuantity} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Price</Text>
            <TextInput keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={price} onChangeText={setPrice} />
          </View>
        </View>

        <View style={styles.rowInline}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Fees (optional)</Text>
            <TextInput keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={fees} onChangeText={setFees} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput placeholder={date} placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={date} onChangeText={setDate} />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity disabled={saving} style={[globalStyles.button, { margin: 16, opacity: saving ? 0.6 : 1 }]} onPress={handleSave}>
          <Text style={globalStyles.buttonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[900] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { color: colors.neutral[100], fontFamily: 'Inter-SemiBold', fontSize: 18 },
  cancel: { color: colors.primary[400], fontFamily: 'Inter-Medium' },
  rowInline: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, marginTop: 12 },
  label: { color: colors.neutral[300], marginBottom: 8, fontFamily: 'Inter-Medium' },
  error: { color: colors.error[500], paddingHorizontal: 16, marginTop: 8 },
});


