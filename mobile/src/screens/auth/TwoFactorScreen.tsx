import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/api/client';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export default function TwoFactorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const theme = useTheme();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const setUser = useAuthStore((state) => state.setUser);
  const setStatus = useAuthStore((state) => state.setStatus);
  const email = (route.params as any)?.email ?? '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    setLoading(true);
    try {
      const response = await apiClient.verifyTwoFactor({ email, code });
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
      Alert.alert('Verification failed', 'Double-check the code and try again.');
      setStatus('unauthenticated');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Enter the 6-digit code</Text>
      <Text style={{ color: theme.colors.muted }}>Sent to {email}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text }]}
        maxLength={6}
        textContentType="oneTimeCode"
      />
      <Pressable
        accessibilityRole="button"
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={verify}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonLabel}>Verify</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16
  },
  title: {
    fontSize: 22,
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4
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
