import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { colors } from '@/constants/colors';

interface SpendingPieProps {
  data: Record<string, number> | null;
  size?: number;
  maxSlices?: number; // top N slices, rest -> Other
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

const defaultColors = [
  colors.primary[500],
  colors.secondary[500],
  colors.accent[500],
  colors.warning[500],
  colors.success[500],
  colors.error[500],
  colors.neutral[400],
];

export const SpendingPie: React.FC<SpendingPieProps> = ({ data, size = 160, maxSlices = 6 }) => {
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Spending by Category</Text>
        <View style={styles.placeholder}><Text style={styles.placeholderText}>Loading...</Text></View>
      </View>
    );
  }

  const entries = Object.entries(data).map(([k, v]) => ({ category: k || 'Unknown', amount: v || 0 }));
  const total = entries.reduce((s, e) => s + e.amount, 0);

  if (total <= 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Spending by Category</Text>
        <View style={styles.placeholder}><Text style={styles.placeholderText}>No expenses in this period</Text></View>
      </View>
    );
  }

  // Sort and limit
  entries.sort((a, b) => b.amount - a.amount);
  const top = entries.slice(0, maxSlices - 1);
  const rest = entries.slice(maxSlices - 1);
  const otherAmount = rest.reduce((s, e) => s + e.amount, 0);
  const display = otherAmount > 0 ? [...top, { category: 'Other', amount: otherAmount }] : top;

  let startAngle = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Spending by Category</Text>
      <View style={styles.row}>
        <Svg width={size} height={size}>
          <G>
            {display.map((d, i) => {
              const sliceAngle = (d.amount / total) * 360;
              const path = arcPath(cx, cy, r, startAngle, startAngle + sliceAngle);
              const color = defaultColors[i % defaultColors.length];
              startAngle += sliceAngle;
              return <Path key={d.category + i} d={path} fill={color} />;
            })}
            <Circle cx={cx} cy={cy} r={r * 0.45} fill={colors.neutral[800]} />
          </G>
        </Svg>

        <View style={styles.legend}>
          {display.map((d, i) => (
            <View key={d.category} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: defaultColors[i % defaultColors.length] }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {d.category}: ${d.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: colors.neutral[100],
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legend: {
    marginLeft: 12,
    flex: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    marginRight: 8,
  },
  legendText: {
    color: colors.neutral[300],
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flexShrink: 1,
  },
  placeholder: {
    height: 120,
    backgroundColor: colors.neutral[800],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.neutral[400],
    fontFamily: 'Inter-Regular',
  },
});

export default SpendingPie;
