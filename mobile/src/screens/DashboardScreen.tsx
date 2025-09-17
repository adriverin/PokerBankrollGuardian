import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryTheme } from 'victory-native';
import ScreenShell from '@/components/ScreenShell';
import Card from '@/components/Card';
import Stat from '@/components/Stat';
import ChartContainer from '@/components/ChartContainer';
import SyncBanner from '@/components/SyncBanner';
import Fab from '@/components/Fab';
import { formatCurrency } from '@/utils/format';
import { useDashboardSummary, computeBankrollTimeline } from '@/shared/selectors/sessionSelectors';
import { useSessionStore } from '@/store/sessionStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { useTheme } from '@/theme';
import { runQuickSim, QuickSimResult } from '@/services/sim/quickSim';
import { RootStackParamList } from '@/navigation/types';

export default function DashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const summary = useDashboardSummary();
  const cashSessions = useSessionStore((state) => Object.values(state.cashById));
  const ledgerEntries = useLedgerStore((state) => Object.values(state.ledgerById));
  const [quickSimResult, setQuickSimResult] = useState<QuickSimResult | null>(null);

  const timeline = useMemo(
    () => computeBankrollTimeline(cashSessions, ledgerEntries),
    [cashSessions, ledgerEntries]
  );

  const hourlyStats = useMemo(() => computeHourlyStats(cashSessions), [cashSessions]);

  const runQuickSimulation = () => {
    if (!hourlyStats) return;
    try {
      const result = runQuickSim({
        muPerHour: hourlyStats.mu,
        sigmaPerHour: hourlyStats.sigma,
        horizonHours: 40,
        bankrollStart: summary.bankroll,
        iterations: 1000,
        nu: 5
      });
      setQuickSimResult(result);
    } catch (error) {
      console.warn('Quick sim failed', error);
    }
  };

  return (
    <View style={{ flex: 1 }} testID="dashboard-screen">
      <ScreenShell>
        <SyncBanner />
        <Card title="Current bankroll" subtitle="Net of sessions & ledger">
          <Stat label="Bankroll" value={formatCurrency(summary.bankroll)} tone={summary.bankroll >= 0 ? 'success' : 'danger'} />
          <Stat label="Last 30 days" value={formatCurrency(summary.last30Profit)} tone={summary.last30Profit >= 0 ? 'success' : 'danger'} />
          <Stat label="Hourly" value={formatCurrency(Math.round(summary.hourly))} />
        </Card>
        <ChartContainer title="Cumulative profit timeline">
          <VictoryChart theme={VictoryTheme.material} domainPadding={10}>
            <VictoryAxis dependentAxis style={{ axis: { stroke: theme.colors.muted } }} tickFormat={(tick) => formatCurrency(Number(tick))} />
            <VictoryAxis style={{ axis: { stroke: theme.colors.muted } }} tickFormat={() => ''} />
            <VictoryArea
              style={{ data: { fill: theme.colors.primary + '33', stroke: theme.colors.primary } }}
              interpolation="monotoneX"
              data={timeline.map((point, index) => ({ x: index, y: point.value }))}
            />
          </VictoryChart>
        </ChartContainer>
        <Card
          title="Quick simulation"
          subtitle="2k paths with Student-t hourly draws"
          right={
            <Pressable accessibilityRole="button" onPress={runQuickSimulation}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Run</Text>
            </Pressable>
          }
        >
          {quickSimResult ? (
            <View style={styles.simGrid}>
              <Stat label="Mean" value={formatCurrency(quickSimResult.mean)} />
              <Stat label="Median" value={formatCurrency(quickSimResult.median)} />
              <Stat label="P5" value={formatCurrency(quickSimResult.p5)} tone="danger" />
              <Stat label="P95" value={formatCurrency(quickSimResult.p95)} tone="success" />
              <Stat
                label="Risk of ruin"
                value={`${quickSimResult.riskOfRuinPct.toFixed(1)}%`}
                tone={quickSimResult.riskOfRuinPct > 5 ? 'danger' : 'success'}
              />
            </View>
          ) : (
            <Text style={{ color: theme.colors.muted }}>
              Use your recent hourly distribution to project bankroll outcomes over a 40h horizon.
            </Text>
          )}
        </Card>
      </ScreenShell>
      <Fab label="Log session" onPress={() => navigation.navigate('QuickAddSession', { type: 'cash' })} />
    </View>
  );
}

function computeHourlyStats(sessions: ReturnType<typeof useSessionStore.getState>['cashById'] extends Record<string, infer T>
  ? T[]
  : never) {
  if (!sessions.length) return null;
  const hourlyRates: number[] = [];
  for (const session of sessions) {
    if (!session.durationMinutes || session.durationMinutes <= 0) continue;
    const hours = session.durationMinutes / 60;
    const cashout = session.cashoutCents ?? 0;
    const buyin = session.buyinCents ?? 0;
    const tips = session.tipsCents ?? 0;
    const profit = cashout - buyin - tips;
    hourlyRates.push(profit / hours);
  }
  if (!hourlyRates.length) return null;
  const mean = hourlyRates.reduce((sum, value) => sum + value, 0) / hourlyRates.length;
  const variance =
    hourlyRates.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) /
    Math.max(1, hourlyRates.length - 1);
  return { mu: mean, sigma: Math.sqrt(variance) };
}

const styles = StyleSheet.create({
  simGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  }
});
