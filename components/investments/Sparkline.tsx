import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Rect, Line, Text as SvgText, Circle } from 'react-native-svg';
import { colors } from '@/constants/colors';

type Point = { t: number; price: number };

type Props = {
  points?: number[];
  series?: Point[]; // preferred: timestamped series
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string | null;
};

export default function Sparkline({ points, series, width = 200, height = 84, strokeColor = colors.success[400], strokeWidth = 2, fillColor = null }: Props) {
  // If series provided, normalize timestamps (seconds -> ms) and sort ascending
  let normalizedSeries: Point[] | null = null;
  if (series && series.length > 0) {
    normalizedSeries = series
      .map(s => ({ t: (s.t < 1e12 ? s.t * 1000 : s.t), price: s.price }))
      .sort((a, b) => (a.t as number) - (b.t as number));
  }
  const data: number[] = normalizedSeries && normalizedSeries.length > 0 ? normalizedSeries.map(s => s.price) : (points || []);
  if (!data || data.length === 0) return <View />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const marginLeft = 56;
  const marginBottom = 22;
  const chartWidth = Math.max(8, width - marginLeft - 12);
  const chartHeight = Math.max(8, height - marginBottom - 10);

  const stepX = chartWidth / Math.max(1, data.length - 1);
  const coords = data.map((p, i) => {
    const x = marginLeft + i * stepX;
    const y = 6 + (chartHeight - ((p - min) / range) * chartHeight);
    return `${x},${y}`;
  });

  const yTicks = [max, (max + min) / 2, min];

  const xLabels: { x: number; label: string }[] = [];
  if (normalizedSeries && normalizedSeries.length > 0) {
    const len = normalizedSeries.length;
    const first = normalizedSeries[0];
    const last = normalizedSeries[len - 1];
    const quarterIndex = Math.floor((len - 1) / 4);
    const quarter = normalizedSeries[Math.max(0, Math.min(quarterIndex, len - 1))];
    const df = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const fmt = (ts: number) => df.format(new Date(ts));
    // place labels at the actual x positions corresponding to the points
    const xFirst = marginLeft;
    const xQuarter = marginLeft + quarterIndex * stepX;
    const xLast = marginLeft + (len - 1) * stepX;
    xLabels.push({ x: xFirst, label: fmt(first.t) });
    xLabels.push({ x: Math.round(xQuarter), label: fmt(quarter.t) });
    xLabels.push({ x: xLast, label: fmt(last.t) });
  }

  return (
    <View style={{ borderRadius: 8, overflow: 'hidden' }}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.neutral[900]} opacity={0.02} rx={8} />

        {yTicks.map((val, idx) => {
          const y = 6 + (chartHeight - ((val - min) / range) * chartHeight);
          return (
            <React.Fragment key={idx}>
              <Line x1={marginLeft} y1={y} x2={marginLeft + chartWidth} y2={y} stroke={colors.neutral[700]} strokeWidth={0.5} />
              <SvgText x={marginLeft - 12} y={y + 4} fontSize={10} fill={colors.neutral[400]} textAnchor="end">{val.toFixed(2)}</SvgText>
            </React.Fragment>
          );
        })}

        <Line x1={marginLeft} y1={6 + chartHeight + 2} x2={marginLeft + chartWidth} y2={6 + chartHeight + 2} stroke={colors.neutral[700]} strokeWidth={0.8} />

        {xLabels.map((xl, i) => (
          <SvgText key={i} x={xl.x} y={6 + chartHeight + 18} fontSize={11} fill={colors.neutral[400]} textAnchor="middle">{xl.label}</SvgText>
        ))}

        {data.length === 1 ? (
          (() => {
            // single point: render a small dot
            const [xStr, yStr] = coords[0].split(',');
            const cx = Number(xStr);
            const cy = Number(yStr);
            return <Circle cx={cx} cy={cy} r={3.5} fill={strokeColor} />;
          })()
        ) : (
          <Polyline points={coords.join(' ')} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>
    </View>
  );
}
