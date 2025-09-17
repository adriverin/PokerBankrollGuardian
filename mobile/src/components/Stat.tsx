import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface StatProps {
  label: string;
  value: string;
  trend?: string;
  tone?: 'default' | 'success' | 'danger';
}

export default function Stat({ label, value, trend, tone = 'default' }: StatProps) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.text;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.muted }]}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {trend ? <Text style={[styles.trend, { color: theme.colors.muted }]}>{trend}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4
  },
  label: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  value: {
    fontSize: 20,
    fontWeight: '700'
  },
  trend: {
    fontSize: 13
  }
});
