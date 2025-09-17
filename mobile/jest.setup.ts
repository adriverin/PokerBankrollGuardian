import '@testing-library/jest-native/extend-expect';
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';
import mockRNCNetInfo from '@react-native-community/netinfo/jest/netinfo-mock';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('expo-sqlite');
jest.mock('@react-native-community/netinfo', () => mockRNCNetInfo);
jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiUrl: 'http://localhost:8000/api',
      websocketUrl: 'ws://localhost:8000/ws',
      env: 'test'
    }
  }
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined)
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() }))
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true }))
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///documents/',
  writeAsStringAsync: jest.fn(async () => undefined),
  readAsStringAsync: jest.fn(async () => ''),
  StorageAccessFramework: {
    getUriForDirectoryInRoot: jest.fn(),
    readAsStringAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn()
  }
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ type: 'cancel' }))
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn()
}));
