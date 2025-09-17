import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSecurityStore } from '@/store/securityStore';
import { useSettingsStore } from '@/store/settingsStore';
import dayjs from '@/utils/dayjs';
import { useTheme } from '@/theme';

export default function SecurityGateOverlay() {
  const { locked, setLocked } = useSecurityStore();
  const setLastUnlock = useSettingsStore((state) => state.setBiometricLastUnlock);
  const theme = useTheme();

  const onUnlock = useCallback(async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Poker Bankroll Guardian'
    });
    if (result.success) {
      setLocked(false);
      setLastUnlock(dayjs().toISOString());
    }
  }, [setLastUnlock, setLocked]);

  if (!locked) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: '#000000cc' }]}
      accessibilityRole="alert"
    >
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}
        accessibilityLabel="Locked screen"
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>Locked</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>Authenticate to continue</Text>
        <Pressable
          onPress={onUnlock}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: pressed ? theme.colors.primary + 'cc' : theme.colors.primary
            }
          ]}
        >
          <Text style={styles.buttonLabel}>Unlock</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  card: {
    width: '80%',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center'
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 140
  },
  buttonLabel: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16
  }
});
