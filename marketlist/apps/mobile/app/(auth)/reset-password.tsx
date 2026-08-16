import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, TextField } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = params.token;
    if (typeof raw === 'string' && raw.trim()) {
      setToken(raw.trim());
      return;
    }
    if (Array.isArray(raw) && raw[0]) {
      setToken(String(raw[0]).trim());
    }
  }, [params.token]);

  const handleSubmit = async () => {
    if (!token.trim() || password.length < 8) {
      setError('Token and a password of at least 8 characters are required.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: token.trim(), password }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-surface px-6 dark:bg-surface-dark"
    >
      <View className="z-10 gap-6">
        <View className="gap-2">
          <Text
            className="font-display text-4xl text-ink dark:text-ink-on-dark"
            accessibilityRole="header"
          >
            Reset password
          </Text>
          <Text className="font-ui text-base text-ink-muted dark:text-ink-muted-dark">
            Paste the token from your email or open the deep link marketlist://reset-password?token=…
          </Text>
        </View>
        <View className="gap-4 rounded-2xl bg-white/90 p-5 dark:border dark:border-border-dark dark:bg-surface-dark-elevated">
          <TextField
            label="Reset token"
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
          />
          <TextField
            label="New password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text className="font-ui text-danger">{error}</Text> : null}
          <Button label="Update password" onPress={handleSubmit} loading={loading} />
          <Link href="/(auth)/login" asChild>
            <Button label="Back to sign in" variant="ghost" />
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
