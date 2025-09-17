import React, { PropsWithChildren, useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import AppNavigator from '@/navigation/AppNavigator';
import { ThemeProvider, useTheme } from '@/theme';
import { useBiometricGate } from '@/hooks/useBiometricGate';
import { useSyncBootstrap } from '@/sync/useSyncBootstrap';
import { runMigrations } from '@/db/migrationsRunner';
import { initNotifications } from '@/services/notifications/init';
import SecurityGateOverlay from '@/components/SecurityGateOverlay';
import { useScreenProtection } from '@/services/security/screenProtection';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 2,
      refetchOnMount: false
    },
    mutations: {
      retry: 1
    }
  }
});

const persister = createAsyncStoragePersister({ storage: AsyncStorage });

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected));
  })
);

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

type ProvidersProps = PropsWithChildren;

export function AppProviders({ children }: ProvidersProps) {
  useEffect(() => {
    runMigrations().catch((error) => console.error('Failed to run migrations', error));
    initNotifications().catch((error) => console.warn('Failed to init notifications', error));
  }, []);

  useBiometricGate();
  useSyncBootstrap();
  useScreenProtection();

  return (
    <SafeAreaProvider>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {children}
            <SecurityGateOverlay />
          </GestureHandlerRootView>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SafeAreaProvider>
  );
}

export function AppNavigationContainer() {
  const theme = useTheme();

  return (
    <NavigationContainer theme={theme.colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={theme.colorScheme === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}
