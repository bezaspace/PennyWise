import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { globalStyles } from '@/constants/styles';

type Props = {
  visible: boolean;
  onClose: () => void;
  trade: {
    id: string;
    symbol: string;
    company_name?: string;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    fees?: number;
    date: string;
  } | null;
  onEdit: () => void;
  onDelete: () => Promise<void> | void;
};

export function TradeDetailsModal({ visible, onClose, trade, onEdit, onDelete }: Props) {
  if (!trade) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[globalStyles.safeArea, styles.container]}>
        <View style={styles.header}>
          <Text style={styles.title}>Trade Details</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Close</Text></TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={styles.item}>Type: {trade.type.toUpperCase()}</Text>
          <Text style={styles.item}>Symbol: {trade.symbol}</Text>
          {trade.company_name ? <Text style={styles.item}>Company: {trade.company_name}</Text> : null}
          <Text style={styles.item}>Quantity: {trade.quantity}</Text>
          <Text style={styles.item}>Price: ${trade.price.toFixed(2)}</Text>
          <Text style={styles.item}>Fees: ${Number(trade.fees || 0).toFixed(2)}</Text>
          <Text style={styles.item}>Date: {new Date(trade.date).toLocaleString()}</Text>
        </View>
        <View style={{ padding: 16, gap: 8 }}>
          <TouchableOpacity style={[globalStyles.button]} onPress={onEdit}>
            <Text style={globalStyles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[globalStyles.button, { backgroundColor: colors.error[600] }]} onPress={onDelete}>
            <Text style={globalStyles.buttonText}>Delete</Text>
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
});


