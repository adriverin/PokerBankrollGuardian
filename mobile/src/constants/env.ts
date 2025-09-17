import Constants from 'expo-constants';

export const ENV = {
  apiUrl: Constants.expoConfig?.extra?.apiUrl as string,
  websocketUrl: Constants.expoConfig?.extra?.websocketUrl as string,
  env: (Constants.expoConfig?.extra?.env as string) ?? 'development'
};
