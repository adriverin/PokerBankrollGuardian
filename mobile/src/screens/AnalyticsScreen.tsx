import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { VictoryChart, VictoryBar, VictoryTheme, VictoryPie } from 'victory-native';
import ScreenShell from '@/components/ScreenShell';
import Card from '@/components/Card';
import { useSessionStore } from '@/store/sessionStore';
import dayjs from '@/utils/dayjs';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

const RANGES = [
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '365d', value: 365 },
  { label: 'All', value: 0 }
];

type RangeValue = (typeof RANGES)[number]['value'];

export default function AnalyticsScreen() {
  const theme = useTheme();
  const cashSessions = useSessionStore((state) => Object.values(state.cashById));
  const mttSessions = useSessionStore((state) => Object.values(state.mttById));
  const [range, setRange] = useState<RangeValue>(30);

  const filteredCash = useMemo(() => filterByRange(cashSessions, range), [cashSessions, range]);
  const filteredMtt = useMemo(() => filterByRange(mttSessions, range), [mttSessions, range]);

  const histogramData = useMemo(() => buildHistogram(filteredCash), [filteredCash]);
  const gameBreakdown = useMemo(() => breakdownByGame(filteredCash, filteredMtt), [filteredCash, filteredMtt]);
  const dowBreakdown = useMemo(() => breakdownByDayOfWeek(filteredCash), [filteredCash]);
  const recommendation = useMemo(() => buildRecommendation(filteredCash), [filteredCash]);

  return (
    <ScreenShell testID="analytics-screen">
      <View style={styles.rangeRow}>
        {RANGES.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setRange(option.value)}
            style={[styles.rangeChip, range === option.value && { backgroundColor: theme.colors.primary }]}
            accessibilityRole="button"
            accessibilityState={{ selected: range === option.value }}
          >
            <Text style={{ color: range === option.value ? '#fff' : theme.colors.text }}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
      <Card title="Profit histogram" subtitle="Bucketed by month">
        <VictoryChart theme={VictoryTheme.material} domainPadding={20} height={220}>
          <VictoryBar
            data={histogramData}
            x="label"
            y="value"
            style={{ data: { fill: theme.colors.primary } }}
          />
        </VictoryChart>
      </Card>
      <Card title="Game breakdown">
        <VictoryPie
          data={gameBreakdown}
          colorScale={[theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.muted]}
          labels={({ datum }) => `${datum.x}: ${datum.y}`}
          padAngle={2}
        />
      </Card>
      <Card title="Day-of-week performance">
        <VictoryBar
          data={dowBreakdown}
          x="label"
          y="value"
          style={{ data: { fill: theme.colors.success } }}
          height={220}
        />
      </Card>
      <Card title="Policy guidance" subtitle="Stake recommendation based on hourly volatility">
        <Text style={{ color: theme.colors.text, fontSize: 16 }}>{recommendation.summary}</Text>
        <Text style={{ color: theme.colors.muted }}>{recommendation.detail}</Text>
      </Card>
    </ScreenShell>
  );
}

function filterByRange<T extends { startTs: string; endTs?: string | null }>(items: T[], range: RangeValue) {
  if (!range) return items;
  const cutoff = dayjs().subtract(range, 'day');
  return items.filter((item) => dayjs(item.endTs ?? item.startTs).isAfter(cutoff));
}

function buildHistogram(cashSessions: ReturnType<typeof useSessionStore.getState>['cashById'] extends Record<string, infer T>
  ? T[]
  : never) {
  const buckets = new Map<string, number>();
  for (const session of cashSessions) {
    const key = dayjs(session.endTs ?? session.startTs).format('YYYY-MM');
    const profit = (session.cashoutCents ?? 0) - (session.buyinCents ?? 0) - (session.tipsCents ?? 0);
    buckets.set(key, (buckets.get(key) ?? 0) + profit);
  }
  return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
}

function breakdownByGame(
  cashSessions: ReturnType<typeof useSessionStore.getState>['cashById'] extends Record<string, infer T> ? T[] : never,
  mttSessions: ReturnType<typeof useSessionStore.getState>['mttById'] extends Record<string, infer T> ? T[] : never
) {
  const map = new Map<string, number>();
  for (const session of cashSessions) {
    const key = session.game ?? 'Cash';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  for (const session of mttSessions) {
    const key = session.game ?? 'MTT';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([x, y]) => ({ x, y }));
}

function breakdownByDayOfWeek(
  cashSessions: ReturnType<typeof useSessionStore.getState>['cashById'] extends Record<string, infer T> ? T[] : never
) {
  const map = new Map<string, number>();
  for (const session of cashSessions) {
    const dow = dayjs(session.startTs).format('ddd');
    const profit = (session.cashoutCents ?? 0) - (session.buyinCents ?? 0) - (session.tipsCents ?? 0);
    map.set(dow, (map.get(dow) ?? 0) + profit);
  }
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
}

function buildRecommendation(
  cashSessions: ReturnType<typeof useSessionStore.getState>['cashById'] extends Record<string, infer T> ? T[] : never
) {
  if (!cashSessions.length) {
    return {
      summary: 'Log sessions to unlock stake recommendations.',
      detail: 'No recent cash sessions were found for this window.'
    };
  }
  const hourly = cashSessions
    .filter((session) => session.durationMinutes)
    .map((session) => {
      const profit = (session.cashoutCents ?? 0) - (session.buyinCents ?? 0) - (session.tipsCents ?? 0);
      return profit / ((session.durationMinutes ?? 0) / 60);
    });
  if (!hourly.length) {
    return {
      summary: 'Insufficient data for hourly analysis.',
      detail: 'Track session durations to compute accurate hourly rates.'
    };
  }
  const mean = hourly.reduce((sum, v) => sum + v, 0) / hourly.length;
  const volatility = Math.sqrt(
    hourly.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) / Math.max(1, hourly.length - 1)
  );
  const ratio = Math.abs(mean) / (volatility || 1);
  if (ratio > 3) {
    return {
      summary: 'Aggressive stakes supported.',
      detail: `Strong hourly edge detected (${formatCurrency(mean)} ± ${formatCurrency(volatility)}).`
    };
  }
  if (ratio > 1.5) {
    return {
      summary: 'Maintain current policy.',
      detail: `Hourly ${formatCurrency(mean)} with volatility ${formatCurrency(volatility)} suggests steady play.`
    };
  }
  return {
    summary: 'Consider a cautious stake policy.',
    detail: `Hourly edge ${formatCurrency(mean)} is small relative to swings (${formatCurrency(volatility)}).`
  };
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    gap: 12
  },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)'
  }
});
