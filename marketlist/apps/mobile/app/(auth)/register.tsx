import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { Button, TextField } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';
import { saveHouseholdId, saveTokens } from '../../src/lib/secureStorage';
import { setHouseholdId, setSession } from '../../src/store';

export default function RegisterScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    const result = await apiFetch<{
      user: { id: string; email: string; name: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (!result.success) {
      setLoading(false);
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

    if (mode === 'join') {
      const joined = await apiFetch<{ household: { id: string } }>('/households/join', {
        method: 'POST',
        token: result.data.accessToken,
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      setLoading(false);
      if (!joined.success) {
        setError(joined.error.message || 'Could not join with that code.');
        return;
      }
      await saveHouseholdId(joined.data.household.id);
      dispatch(setHouseholdId(joined.data.household.id));
      const lists = await apiFetch<{ lists: Array<{ id: string; name: string }> }>(
        `/lists?householdId=${joined.data.household.id}`,
        { token: result.data.accessToken },
      );
      const weekly =
        lists.success &&
        (lists.data.lists.find((l) => l.name === 'Weekly run') || lists.data.lists[0]);
      if (weekly) {
        router.replace(`/(app)/lists/${weekly.id}`);
        return;
      }
      router.replace('/(app)/lists');
      return;
    }

    const created = await apiFetch<{
      household: { id: string };
      list: { id: string };
    }>('/households', {
      method: 'POST',
      token: result.data.accessToken,
      body: JSON.stringify({ name: `${name}'s home` }),
    });
    setLoading(false);
    if (!created.success) {
      setError(
        created.error.message ||
          'Account created, but household setup failed. Open Settings to create a home.',
      );
      return;
    }
    await saveHouseholdId(created.data.household.id);
    dispatch(setHouseholdId(created.data.household.id));
    router.replace(`/(app)/lists/${created.data.list.id}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-surface px-6 dark:bg-surface-dark"
    >
      <View className="gap-6">
        <Text className="font-display text-4xl text-ink dark:text-ink-on-dark">Join Marketlist</Text>
        <View className="flex-row gap-2" accessibilityRole="tablist">
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'create' }}
            onPress={() => setMode('create')}
            className={`flex-1 rounded-xl px-3 py-3 ${mode === 'create' ? 'bg-sage' : 'bg-white dark:bg-ink/80'}`}
          >
            <Text className="text-center font-ui-medium text-ink dark:text-ink-on-dark">Create home</Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'join' }}
            onPress={() => setMode('join')}
            className={`flex-1 rounded-xl px-3 py-3 ${mode === 'join' ? 'bg-sage' : 'bg-white dark:bg-ink/80'}`}
          >
            <Text className="text-center font-ui-medium text-ink dark:text-ink-on-dark">Join with code</Text>
          </Pressable>
        </View>
        <View className="gap-4 rounded-2xl bg-white p-5 dark:border dark:border-border-dark dark:bg-surface-dark-elevated">
          <TextField label="Name" value={name} onChangeText={setName} />
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
          {mode === 'join' ? (
            <TextField
              label="Invite code"
              autoCapitalize="characters"
              value={inviteCode}
              onChangeText={setInviteCode}
            />
          ) : null}
          {error ? <Text className="text-danger">{error}</Text> : null}
          <Button
            label={mode === 'join' ? 'Join household' : 'Create account'}
            onPress={handleRegister}
            loading={loading}
          />
          <Link href="/(auth)/login" asChild>
            <Button label="Back to sign in" variant="ghost" />
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
