import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  defaultSymbol?: string;
  defaultCompanyName?: string;
  defaultType?: 'buy' | 'sell';
  addTrade: (t: { symbol: string; company_name?: string; type: 'buy' | 'sell'; quantity: number; price: number; fees?: number; date: string; }) => Promise<any>;
};

export function AddTradeModal({ visible, onClose, onSaved, defaultSymbol, defaultCompanyName, defaultType = 'buy', addTrade }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [symbol, setSymbol] = useState(defaultSymbol || '');
  const [companyName, setCompanyName] = useState(defaultCompanyName || '');
  const [type, setType] = useState<'buy' | 'sell'>(defaultType);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSymbol(defaultSymbol || '');
    setCompanyName(defaultCompanyName || '');
    setType(defaultType);
    setQuantity('');
    setPrice('');
    setFees('0');
    setDate(today);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    if (!symbol.trim() || !quantity || !price) {
      setError('Symbol, quantity and price are required');
      return;
    }
    const qty = parseFloat(quantity);
    const px = parseFloat(price);
    const f = parseFloat(fees || '0');
    if (!(qty > 0) || !(px > 0)) {
      setError('Quantity and price must be positive');
      return;
    }
    try {
      setSaving(true);
      await addTrade({ symbol: symbol.trim().toUpperCase(), company_name: companyName || undefined, type, quantity: qty, price: px, fees: isNaN(f) ? 0 : f, date });
      await onSaved();
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Trade</Text>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>

        <View style={styles.rowGroup}>
          <Text style={styles.label}>Symbol</Text>
          <TextInput placeholder="AAPL" placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={symbol} onChangeText={setSymbol} autoCapitalize="characters" />
        </View>
        <View style={styles.rowGroup}>
          <Text style={styles.label}>Company (optional)</Text>
          <TextInput placeholder="Apple Inc." placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={companyName} onChangeText={setCompanyName} />
        </View>

        <View style={[styles.rowGroup, styles.typeGroup]}>
          <TouchableOpacity style={[styles.typeButton, type === 'buy' && styles.typeButtonActive]} onPress={() => setType('buy')}>
            <Text style={[styles.typeText, type === 'buy' && styles.typeTextActive]}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.typeButton, type === 'sell' && styles.typeButtonActive]} onPress={() => setType('sell')}>
            <Text style={[styles.typeText, type === 'sell' && styles.typeTextActive]}>Sell</Text>
          </TouchableOpacity>
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
            <TextInput placeholder={today} placeholderTextColor={colors.neutral[500]} style={globalStyles.input} value={date} onChangeText={setDate} />
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
  rowGroup: { paddingHorizontal: 16, marginBottom: 12 },
  label: { color: colors.neutral[300], marginBottom: 8, fontFamily: 'Inter-Medium' },
  rowInline: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  typeGroup: { flexDirection: 'row', gap: 8 },
  typeButton: { flex: 1, backgroundColor: colors.neutral[700], paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  typeButtonActive: { backgroundColor: colors.primary[600] },
  typeText: { color: colors.neutral[300], fontFamily: 'Inter-Medium' },
  typeTextActive: { color: colors.neutral[50] },
  error: { color: colors.error[500], paddingHorizontal: 16, marginTop: 8 },
});


