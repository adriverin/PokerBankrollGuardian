import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, Pressable, Alert } from 'react-native';
import ScreenShell from '@/components/ScreenShell';
import Card from '@/components/Card';
import { useSettingsStore } from '@/store/settingsStore';
import { formatCurrency } from '@/utils/format';
import { exportLocalJson } from '@/services/storage/export';
import { runSyncCycle } from '@/sync/useSyncBootstrap';
import { useTheme } from '@/theme';
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/store/authStore';
import { seedExampleFiveFiveChf } from '@/dev/seed';

export default function SettingsScreen() {
  const theme = useTheme();
  const {
    currency,
    timezone,
    defaultStake,
    setCurrency,
    setTimezone,
    setDefaultStake,
    biometricLockEnabled,
    setBiometricLockEnabled,
    idleLockMinutes,
    setIdleLockMinutes
  } = useSettingsStore();
  const [exportPath, setExportPath] = useState<string | null>(null);
  const logout = useAuthStore((state) => state.logout);

  const handleExport = async () => {
    try {
      const path = await exportLocalJson();
      setExportPath(path);
    } catch (error) {
      Alert.alert('Export failed', String(error));
    }
  };

  const handleSyncNow = async () => {
    try {
      await runSyncCycle();
      Alert.alert('Sync complete', 'Latest data synchronised.');
    } catch (error) {
      Alert.alert('Sync failed', String(error));
    }
  };

  const handleLogout = async () => {
    await apiClient.logout();
    await logout();
  };

  return (
    <ScreenShell testID="settings-screen">
      <Card title="Locale">
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Currency</Text>
            <TextInput
              value={currency}
              onChangeText={setCurrency}
              style={[styles.input, { borderColor: theme.colors.border }]}
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Timezone</Text>
            <TextInput
              value={timezone}
              onChangeText={setTimezone}
              style={[styles.input, { borderColor: theme.colors.border }]}
              autoCapitalize="characters"
            />
          </View>
        </View>
      </Card>
      <Card title="Default stake">
        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SB (¢)</Text>
            <TextInput
              value={String(defaultStake.sbCents)}
              onChangeText={(value) =>
                setDefaultStake({ ...defaultStake, sbCents: Number(value || defaultStake.sbCents) })
              }
              keyboardType="numeric"
              style={[styles.input, { borderColor: theme.colors.border }]}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>BB (¢)</Text>
            <TextInput
              value={String(defaultStake.bbCents)}
              onChangeText={(value) =>
                setDefaultStake({ ...defaultStake, bbCents: Number(value || defaultStake.bbCents) })
              }
              keyboardType="numeric"
              style={[styles.input, { borderColor: theme.colors.border }]}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Buy-in (¢)</Text>
            <TextInput
              value={String(defaultStake.buyInCents)}
              onChangeText={(value) =>
                setDefaultStake({ ...defaultStake, buyInCents: Number(value || defaultStake.buyInCents) })
              }
              keyboardType="numeric"
              style={[styles.input, { borderColor: theme.colors.border }]}
            />
          </View>
        </View>
        <Text style={{ color: theme.colors.muted }}>
          Example buy-in: {formatCurrency(defaultStake.buyInCents)} for {formatCurrency(defaultStake.bbCents)} /{' '}
          {formatCurrency(defaultStake.sbCents)} blinds.
        </Text>
      </Card>
      <Card title="Security">
        <View style={styles.rowBetween}>
          <Text style={{ color: theme.colors.text, fontSize: 16 }}>Biometric lock</Text>
          <Switch value={biometricLockEnabled} onValueChange={setBiometricLockEnabled} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={{ color: theme.colors.text, fontSize: 16 }}>Auto-lock minutes</Text>
          <TextInput
            value={String(idleLockMinutes)}
            onChangeText={(value) => setIdleLockMinutes(Number(value) || idleLockMinutes)}
            keyboardType="numeric"
            style={[styles.inputSmall, { borderColor: theme.colors.border }]}
          />
        </View>
      </Card>
      <Card title="Data">
        <Pressable accessibilityRole="button" style={styles.exportButton} onPress={handleExport}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Export JSON snapshot</Text>
        </Pressable>
        {exportPath ? <Text style={{ color: theme.colors.muted }}>Saved to {exportPath}</Text> : null}
        <Pressable accessibilityRole="button" style={styles.exportButton} onPress={handleSyncNow}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Sync now</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.exportButton} onPress={seedExampleFiveFiveChf}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Seed example 5/5 CHF sessions</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => Alert.alert('Delete account', 'Contact support to delete your account securely.')}
        >
          <Text style={{ color: theme.colors.danger }}>Delete account</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleLogout}>
          <Text style={{ color: theme.colors.danger }}>Sign out</Text>
        </Pressable>
      </Card>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  inputGroup: {
    flex: 1
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 3
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15
  },
  inputSmall: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    width: 80,
    textAlign: 'center'
  },
  exportButton: {
    paddingVertical: 10
  }
});
