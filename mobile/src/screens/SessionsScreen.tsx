import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenShell from '@/components/ScreenShell';
import Card from '@/components/Card';
import Fab from '@/components/Fab';
import { formatCurrency, formatHours } from '@/utils/format';
import dayjs from '@/utils/dayjs';
import { useSessionStore } from '@/store/sessionStore';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

const FILTERS = ['all', 'cash', 'mtt'] as const;

type FilterValue = (typeof FILTERS)[number];

export default function SessionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const [filter, setFilter] = useState<FilterValue>('all');
  const cashSessions = useSessionStore((state) => Object.values(state.cashById));
  const mttSessions = useSessionStore((state) => Object.values(state.mttById));

  const data = useMemo(() => {
    const cash = cashSessions.map((session) => ({
      type: 'cash' as const,
      id: session.id,
      date: session.endTs ?? session.startTs,
      net: (session.cashoutCents ?? 0) - (session.buyinCents ?? 0) - (session.tipsCents ?? 0),
      venue: session.venue,
      duration: session.durationMinutes,
      tags: session.tags ?? [],
      description: `${session.game ?? 'Cash'} · ${(session.bbCents / 100).toFixed(2)}/${(session.sbCents / 100).toFixed(2)}`
    }));
    const mtts = mttSessions.map((session) => ({
      type: 'mtt' as const,
      id: session.id,
      date: session.endTs ?? session.startTs,
      net: (session.cashCents ?? 0) + (session.bountiesCents ?? 0) - (session.buyinCents ?? 0) - (session.feeCents ?? 0),
      venue: session.venue,
      duration: undefined,
      tags: session.tags ?? [],
      description: `${session.game ?? 'MTT'} · Buy-in ${(session.buyinCents / 100).toFixed(2)}`
    }));
    const combined = [...cash, ...mtts].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
    if (filter === 'all') return combined;
    return combined.filter((item) => item.type === filter);
  }, [cashSessions, mttSessions, filter]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenShell testID="sessions-screen" scrollable={false}>
        <View style={styles.filterRow}>
          {FILTERS.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              onPress={() => setFilter(value)}
              style={[styles.filterChip, filter === value && { backgroundColor: theme.colors.primary }]}
            >
              <Text style={{ color: filter === value ? '#fff' : theme.colors.text, fontWeight: '600' }}>
                {value.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScreenShell>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, gap: 10 }}
        renderItem={({ item }) => (
          <Card
            title={item.venue ?? 'Unknown venue'}
            subtitle={`${dayjs(item.date).format('MMM D, YYYY')} • ${item.type.toUpperCase()}`}
          >
            <View style={styles.sessionRow}>
              <Text style={[styles.net, { color: item.net >= 0 ? theme.colors.success : theme.colors.danger }]}> 
                {formatCurrency(item.net)}
              </Text>
              {item.duration ? (
                <Text style={{ color: theme.colors.muted }}>{formatHours(item.duration)}</Text>
              ) : null}
            </View>
            <Text style={{ color: theme.colors.muted }}>{item.description}</Text>
            <View style={styles.tagRow}>
              {item.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { borderColor: theme.colors.border }]}> 
                  <Text style={{ color: theme.colors.muted }}>#{tag}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
      />
      <Fab label="Add session" onPress={() => navigation.navigate('QuickAddSession', { type: 'cash' })} />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    gap: 10
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)'
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  net: {
    fontSize: 20,
    fontWeight: '700'
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  }
});
