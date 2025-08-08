import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

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
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>{holding.symbol}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          {holding.company_name ? <Text style={styles.item}>{holding.company_name}</Text> : null}
          <Text style={styles.item}>Qty: {holding.quantity}</Text>
          <Text style={styles.item}>Avg cost: ${holding.average_cost.toFixed(2)}</Text>
          <Text style={styles.item}>Price: ${holding.current_price.toFixed(2)}</Text>
          <Text style={styles.item}>Value: ${holding.value.toFixed(2)}</Text>
          <Text style={[styles.item, holding.unrealized_gain >= 0 ? styles.gain : styles.loss]}>
            Unrealized: {holding.unrealized_gain >= 0 ? '+' : ''}{holding.unrealized_gain.toFixed(2)} ({holding.unrealized_gain_percent.toFixed(2)}%)
          </Text>
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
});


