import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/theme';

interface ScreenShellProps extends PropsWithChildren {
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

export default function ScreenShell({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  testID
}: ScreenShellProps) {
  const theme = useTheme();
  const content = (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>{children}</View>
  );
  if (!scrollable) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.background }]} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <ScrollView
      testID={testID}
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        onRefresh
          ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
              />
            )
          : undefined
      }
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16
  },
  scrollContent: {
    paddingBottom: 120
  }
});
