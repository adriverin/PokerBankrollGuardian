import 'dotenv/config';
import { ExpoConfig } from '@expo/config-types';

const IS_DEV = process.env.APP_VARIANT === 'development';

const config: ExpoConfig = {
  name: 'Poker Bankroll Guardian',
  slug: 'poker-bankroll-guardian',
  version: '0.1.0',
  scheme: 'poker',
  owner: undefined,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#111827'
  },
  assetBundlePatterns: ['**/*'],
  updates: {
    url: 'https://u.expo.dev/placeholder',
    fallbackToCacheTimeout: 0
  },
  sdkVersion: '54.0.0',
  runtimeVersion: {
    policy: 'sdkVersion'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'com.pokerbankrollguardian.dev' : 'com.pokerbankrollguardian.app',
    infoPlist: {
      NSFaceIDUsageDescription: 'Enable Face ID to protect your bankroll data.',
      NSCameraUsageDescription: 'Capture table photos for your session notes.',
      NSPhotoLibraryUsageDescription: 'Import CSV files from your library.'
    },
    associatedDomains: ['applinks:pokerbankrollguardian.com']
  },
  android: {
    package: IS_DEV ? 'com.pokerbankrollguardian.dev' : 'com.pokerbankrollguardian',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#111827'
    },
    permissions: [
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'RECORD_AUDIO'
    ],
    intentFilters: [
      {
        action: 'VIEW',
        data: [
          {
            scheme: 'poker'
          }
        ],
        category: ['BROWSABLE', 'DEFAULT']
      }
    ]
  },
  androidStatusBar: {
    barStyle: 'light-content',
    backgroundColor: '#111827'
  },
  web: {
    bundler: 'metro',
    favicon: './assets/favicon.png'
  },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true
  },
  plugins: ['expo-router'],
  extra: {
    eas: {
      projectId: '00000000-0000-0000-0000-000000000000'
    },
    apiUrl: process.env.API_URL || 'http://localhost:8000/api',
    websocketUrl: process.env.WS_URL || 'ws://localhost:8000/ws',
    env: process.env.APP_VARIANT || 'development'
  }
};

export default config;
