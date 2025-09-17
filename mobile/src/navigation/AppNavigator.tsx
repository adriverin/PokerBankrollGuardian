import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppTabsParamList, AuthStackParamList, RootStackParamList } from './types';
import DashboardScreen from '@/screens/DashboardScreen';
import SessionsScreen from '@/screens/SessionsScreen';
import AnalyticsScreen from '@/screens/AnalyticsScreen';
import SimulateScreen from '@/screens/SimulateScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import QuickAddSessionModal from '@/screens/QuickAddSessionModal';
import SignInScreen from '@/screens/auth/SignInScreen';
import TwoFactorScreen from '@/screens/auth/TwoFactorScreen';
import { useAuthStore } from '@/store/authStore';

const Tab = createBottomTabNavigator<AppTabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AppTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingBottom: 10,
          paddingTop: 10
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Feather.glyphMap = 'pie-chart';
          switch (route.name) {
            case 'Dashboard':
              iconName = 'home';
              break;
            case 'Sessions':
              iconName = 'calendar';
              break;
            case 'Analytics':
              iconName = 'bar-chart-2';
              break;
            case 'Simulate':
              iconName = 'activity';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              break;
          }
          return <Feather name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Sessions" component={SessionsScreen} options={{ title: 'Sessions' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Tab.Screen name="Simulate" component={SimulateScreen} options={{ title: 'Simulate' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
      <AuthStack.Screen
        name="TwoFactor"
        component={TwoFactorScreen}
        options={{ title: 'Two-factor authentication' }}
      />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const status = useAuthStore((state) => state.status);
  return (
    <Stack.Navigator>
      {status === 'authenticated' ? (
        <>
          <Stack.Screen name="AppTabs" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="QuickAddSession"
            component={QuickAddSessionModal}
            options={{ presentation: 'modal', headerShown: false }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
