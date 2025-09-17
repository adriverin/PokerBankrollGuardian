export type RootStackParamList = {
  AppTabs: undefined;
  QuickAddSession: { type?: 'cash' | 'mtt' } | undefined;
  Auth: undefined;
};

export type AppTabsParamList = {
  Dashboard: undefined;
  Sessions: undefined;
  Analytics: undefined;
  Simulate: undefined;
  Settings: undefined;
};

export type AuthStackParamList = {
  SignIn: undefined;
  TwoFactor: { email: string } | undefined;
};
