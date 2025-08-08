import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (symbol: string, companyName?: string) => void;
};

export function SearchSymbolModal({ visible, onClose, onConfirm }: Props) {
  const [symbol, setSymbol] = useState('');
  const [company, setCompany] = useState('');

  const handleConfirm = () => {
    if (!symbol.trim()) return;
    onConfirm(symbol.trim().toUpperCase(), company.trim() || undefined);
    setSymbol('');
    setCompany('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>Add to Watchlist</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>
        <View style={{ padding: 16 }}>
          <Text style={styles.label}>Symbol</Text>
          <TextInput style={globalStyles.input} placeholder="AAPL" placeholderTextColor={colors.neutral[500]} value={symbol} onChangeText={setSymbol} autoCapitalize="characters" />
        </View>
        <View style={{ padding: 16 }}>
          <Text style={styles.label}>Company (optional)</Text>
          <TextInput style={globalStyles.input} placeholder="Apple Inc." placeholderTextColor={colors.neutral[500]} value={company} onChangeText={setCompany} />
        </View>
        <TouchableOpacity style={[globalStyles.button, { margin: 16 }]} onPress={handleConfirm}>
          <Text style={globalStyles.buttonText}>Save</Text>
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
  label: { color: colors.neutral[300], marginBottom: 8, fontFamily: 'Inter-Medium' },
});


