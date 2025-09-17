import React from 'react';
import { AppProviders, AppNavigationContainer } from '@/providers/AppProviders';
import '@/utils/dayjs';

export default function App() {
  return (
    <AppProviders>
      <AppNavigationContainer />
    </AppProviders>
  );
}
