import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import ScreenShell from '@/components/ScreenShell';
import Card from '@/components/Card';
import { runQuickSim, QuickSimResult } from '@/services/sim/quickSim';
import { useSessionStore } from '@/store/sessionStore';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

export default function SimulateScreen() {
  const theme = useTheme();
  const cashSessions = useSessionStore((state) => Object.values(state.cashById));
  const [mode, setMode] = useState<'history' | 'custom'>('history');
  const [mu, setMu] = useState('0');
  const [sigma, setSigma] = useState('5000');
  const [nu, setNu] = useState('5');
  const [iterations, setIterations] = useState('1000');
  const [horizon, setHorizon] = useState('40');
  const [bankroll, setBankroll] = useState('200000');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickSimResult | null>(null);

  const inferred = useMemo(() => inferFromHistory(cashSessions), [cashSessions]);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const params = mode === 'history' && inferred
        ? inferred
        : {
            muPerHour: Number(mu),
            sigmaPerHour: Number(sigma),
            nu: Number(nu),
            iterations: Number(iterations),
            horizonHours: Number(horizon),
            bankrollStart: Number(bankroll)
          };
      if (params.iterations <= 2000) {
        const res = runQuickSim(params);
        setResult(res);
      } else {
        // stub server call
        await new Promise((resolve) => setTimeout(resolve, 500));
        const res = runQuickSim({ ...params, iterations: 2000 });
        setResult(res);
      }
    } catch (error) {
      console.warn('Simulation failed', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell testID="simulate-screen">
      <Card title="Source">
        <View style={styles.segmentRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'history' }}
            style={[styles.segment, mode === 'history' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setMode('history')}
          >
            <Text style={{ color: mode === 'history' ? '#fff' : theme.colors.text }}>Use my data</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: mode === 'custom' }}
            style={[styles.segment, mode === 'custom' && { backgroundColor: theme.colors.primary }]}
            onPress={() => setMode('custom')}
          >
            <Text style={{ color: mode === 'custom' ? '#fff' : theme.colors.text }}>Custom</Text>
          </Pressable>
        </View>
        {mode === 'history' ? (
          inferred ? (
            <Text style={{ color: theme.colors.muted }}>
              Using hourly mean {formatCurrency(inferred.muPerHour)} and sigma {formatCurrency(inferred.sigmaPerHour)} from
              recent cash sessions.
            </Text>
          ) : (
            <Text style={{ color: theme.colors.danger }}>No historical data available – switch to custom.</Text>
          )
        ) : (
          <View style={styles.formGrid}>
            {renderInput('µ/hour (¢)', mu, setMu)}
            {renderInput('σ/hour (¢)', sigma, setSigma)}
            {renderInput('ν', nu, setNu)}
            {renderInput('Iterations', iterations, setIterations)}
            {renderInput('Horizon (h)', horizon, setHorizon)}
            {renderInput('Bankroll start (¢)', bankroll, setBankroll)}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          style={[styles.runButton, { backgroundColor: theme.colors.primary }]}
          onPress={runSimulation}
          disabled={loading || (mode === 'history' && !inferred)}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.runLabel}>Run simulation</Text>}
        </Pressable>
      </Card>
      {result ? (
        <Card title="Results" subtitle="Student-t quick simulation (<=2000 iters shown)">
          <View style={styles.resultGrid}>
            <ResultStat label="Mean" value={formatCurrency(result.mean)} />
            <ResultStat label="Median" value={formatCurrency(result.median)} />
            <ResultStat label="P5" value={formatCurrency(result.p5)} tone="danger" />
            <ResultStat label="P95" value={formatCurrency(result.p95)} tone="success" />
            <ResultStat label="Risk of ruin" value={`${result.riskOfRuinPct.toFixed(1)}%`} tone="danger" />
          </View>
        </Card>
      ) : null}
    </ScreenShell>
  );
}

function inferFromHistory(
  cashSessions: ReturnType<typeof useSessionStore.getState>['cashById'] extends Record<string, infer T> ? T[] : never
) {
  if (!cashSessions.length) return null;
  const hourlyRates: number[] = [];
  for (const session of cashSessions) {
    if (!session.durationMinutes || session.durationMinutes <= 0) continue;
    const profit = (session.cashoutCents ?? 0) - (session.buyinCents ?? 0) - (session.tipsCents ?? 0);
    hourlyRates.push(profit / (session.durationMinutes / 60));
  }
  if (!hourlyRates.length) return null;
  const mean = hourlyRates.reduce((sum, value) => sum + value, 0) / hourlyRates.length;
  const variance =
    hourlyRates.reduce((sum, value) => sum + (value - mean) * (value - mean), 0) /
    Math.max(1, hourlyRates.length - 1);
  return {
    muPerHour: mean,
    sigmaPerHour: Math.sqrt(variance),
    nu: 5,
    iterations: 1000,
    horizonHours: 40,
    bankrollStart: 200000
  };
}

function renderInput(label: string, value: string, onChange: (value: string) => void) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="numeric" style={styles.input} accessibilityLabel={label} />
    </View>
  );
}

function ResultStat({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.text;
  return (
    <View style={styles.resultStat}>
      <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color, fontWeight: '600', fontSize: 18 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segmentRow: {
    flexDirection: 'row',
    gap: 10
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    alignItems: 'center'
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14
  },
  inputWrapper: {
    width: '48%'
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 4
  },
  input: {
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15
  },
  runButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  runLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  resultStat: {
    width: '45%'
  }
});
