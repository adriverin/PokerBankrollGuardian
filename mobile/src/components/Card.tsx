import React, { PropsWithChildren } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function Card({ title, subtitle, right, children }: CardProps) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card }]}
      accessibilityRole={title ? 'summary' : undefined}
    >
      {title ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
            {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.muted }]}>{subtitle}</Text> : null}
          </View>
          {right ? <View>{right}</View> : null}
        </View>
      ) : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10
  },
  title: {
    fontSize: 16,
    fontWeight: '600'
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13
  },
  content: {
    gap: 10
  }
});
