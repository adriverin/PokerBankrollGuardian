import React, { PropsWithChildren } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ChartContainerProps extends PropsWithChildren {
  title: string;
  description?: string;
}

export default function ChartContainer({ title, description, children }: ChartContainerProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}
      accessibilityRole="image"
      accessibilityLabel={title}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.colors.muted }]}>{description}</Text>
        ) : null}
      </View>
      <View style={styles.chartArea}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 14,
    gap: 10
  },
  header: {
    gap: 4
  },
  title: {
    fontSize: 16,
    fontWeight: '600'
  },
  description: {
    fontSize: 13
  },
  chartArea: {
    height: 200
  }
});
