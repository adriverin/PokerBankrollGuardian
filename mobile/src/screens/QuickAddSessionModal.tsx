import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import CashSessionForm from '@/screens/forms/CashSessionForm';
import MttSessionForm from '@/screens/forms/MttSessionForm';
import { useTheme } from '@/theme';

export default function QuickAddSessionModal() {
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const [tab, setTab] = useState<'cash' | 'mtt'>((route.params as any)?.type ?? 'cash');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}
      testID="quick-add-modal"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Quick session</Text>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}>
          <Text style={[styles.close, { color: theme.colors.primary }]}>Close</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'cash' }}
          style={[styles.tab, tab === 'cash' && { backgroundColor: theme.colors.primary }]}
          onPress={() => setTab('cash')}
        >
          <Text style={[styles.tabLabel, { color: tab === 'cash' ? '#fff' : theme.colors.text }]}>Cash</Text>
        </Pressable>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'mtt' }}
          style={[styles.tab, tab === 'mtt' && { backgroundColor: theme.colors.primary }]}
          onPress={() => setTab('mtt')}
        >
          <Text style={[styles.tabLabel, { color: tab === 'mtt' ? '#fff' : theme.colors.text }]}>MTT</Text>
        </Pressable>
      </View>
      <View style={styles.body}>
        {tab === 'cash' ? (
          <CashSessionForm onSaved={() => navigation.goBack()} />
        ) : (
          <MttSessionForm onSaved={() => navigation.goBack()} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  close: {
    fontSize: 16,
    fontWeight: '600'
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.3)'
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  body: {
    flex: 1,
    paddingHorizontal: 16
  }
});
