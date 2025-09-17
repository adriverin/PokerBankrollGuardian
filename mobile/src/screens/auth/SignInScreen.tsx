import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api/client';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export default function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const response = await apiClient.login({ email, password });
      if (response.requires_2fa) {
        navigation.navigate('Auth', {
          screen: 'TwoFactor',
          params: { email }
        } as any);
        return;
      }
      setCredentials({ accessToken: response.access_token, refreshToken: response.refresh_token });
      setStatus('authenticated');
      const profile = await apiClient.getMe();
      setUser({
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        updatedAt: profile.updated_at
      });
    } catch (error) {
      console.warn('Login failed', error);
      Alert.alert('Login failed', 'Check your credentials and try again.');
      setStatus('unauthenticated');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>Sign in to continue tracking your bankroll.</Text>
        <View style={styles.form}>
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
          />
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Sign in</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center'
  },
  container: {
    paddingHorizontal: 24,
    gap: 24
  },
  title: {
    fontSize: 28,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 16
  },
  form: {
    gap: 16
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
