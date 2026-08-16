import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Button, TextField } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';
import { saveHouseholdId, saveTokens } from '../../src/lib/secureStorage';
import { setHouseholdId, setSession } from '../../src/store';

export default function LoginScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const result = await apiFetch<{
      user: { id: string; email: string; name: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    await saveTokens(result.data.accessToken, result.data.refreshToken);
    dispatch(
      setSession({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }),
    );
    const households = await apiFetch<{ households: Array<{ id: string }> }>('/households', {
      token: result.data.accessToken,
    });
    if (households.success && households.data.households[0]) {
      await saveHouseholdId(households.data.households[0].id);
      dispatch(setHouseholdId(households.data.households[0].id));
      const lists = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${households.data.households[0].id}`,
        { token: result.data.accessToken },
      );
      const weekly =
        lists.success &&
        (lists.data.lists.find((l) => l.name === 'Weekly run') || lists.data.lists[0]);
      if (weekly) {
        router.replace(`/(app)/lists/${weekly.id}`);
        return;
      }
    }
    router.replace('/(app)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-surface px-6 dark:bg-surface-dark"
    >
      <View className="absolute inset-0 bg-sage/80 dark:bg-surface-dark-elevated/90" />
      <View className="z-10 gap-6">
        <View className="gap-2">
          <Text
            className="font-display text-5xl text-ink dark:text-ink-on-dark"
            accessibilityRole="header"
          >
            Marketlist
          </Text>
          <Text className="font-ui text-base text-ink-muted dark:text-ink-muted-dark">
            Shop smarter together
          </Text>
        </View>
        <View className="gap-4 rounded-2xl bg-white/90 p-5 dark:bg-surface-dark-elevated dark:border dark:border-border-dark">
          <TextField
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {error ? <Text className="font-ui text-danger">{error}</Text> : null}
          <Button label="Sign in" onPress={handleLogin} loading={loading} />
          <Button
            label="Try demo"
            variant="ghost"
            onPress={async () => {
              setEmail('demo@marketlist.app');
              setPassword('demo12345');
              setLoading(true);
              setError(null);
              const result = await apiFetch<{
                user: { id: string; email: string; name: string };
                accessToken: string;
                refreshToken: string;
              }>('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: 'demo@marketlist.app', password: 'demo12345' }),
              });
              setLoading(false);
              if (!result.success) {
                setError(result.error.message + ' — run npm run seed');
                return;
              }
              await saveTokens(result.data.accessToken, result.data.refreshToken);
              dispatch(
                setSession({
                  user: result.data.user,
                  accessToken: result.data.accessToken,
                  refreshToken: result.data.refreshToken,
                }),
              );
              const households = await apiFetch<{ households: Array<{ id: string }> }>('/households', {
                token: result.data.accessToken,
              });
              if (households.success && households.data.households[0]) {
                await saveHouseholdId(households.data.households[0].id);
                dispatch(setHouseholdId(households.data.households[0].id));
                const lists = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
                  `/lists?householdId=${households.data.households[0].id}`,
                  { token: result.data.accessToken },
                );
                const weekly =
                  lists.success &&
                  (lists.data.lists.find((l) => l.name === 'Weekly run') || lists.data.lists[0]);
                if (weekly) {
                  router.replace(`/(app)/lists/${weekly.id}`);
                  return;
                }
              }
              router.replace('/(app)');
            }}
          />
          {__DEV__ ? (
            <Text className="font-ui text-xs text-ink-muted dark:text-ink-muted-dark">
              Demo: demo@marketlist.app
            </Text>
          ) : null}
          <Link href="/(auth)/forgot-password" asChild>
            <Button label="Forgot password?" variant="ghost" />
          </Link>
          <Link href="/(auth)/register" asChild>
            <Button label="Create account" variant="ghost" />
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
