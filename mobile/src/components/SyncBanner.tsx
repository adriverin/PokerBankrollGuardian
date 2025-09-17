import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { useSyncBanner } from '@/hooks/useSyncBanner';

export default function SyncBanner() {
  const banner = useSyncBanner();
  const theme = useTheme();
  if (!banner) return null;
  const toneColor =
    banner.tone === 'danger'
      ? theme.colors.danger
      : banner.tone === 'warning'
      ? theme.colors.warning
      : banner.tone === 'success'
      ? theme.colors.success
      : theme.colors.primary;
  return (
    <View style={[styles.container, { backgroundColor: toneColor + '22', borderColor: toneColor }]}
      accessibilityRole="status"
    >
      <Text style={[styles.text, { color: toneColor }]}>{banner.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  text: {
    fontSize: 14
  }
});
