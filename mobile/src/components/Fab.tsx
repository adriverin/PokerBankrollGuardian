import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme';

interface FabProps {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress: () => void;
  testID?: string;
}

export default function Fab({ label, icon = 'plus', onPress, testID }: FabProps) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: pressed ? theme.colors.primary + 'cc' : theme.colors.primary,
          shadowColor: theme.colors.primary
        }
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={20} color="#fff" />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 4
  },
  label: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
