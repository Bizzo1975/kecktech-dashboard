import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Button, TextField } from '../../src/components/ui';
import { apiFetch } from '../../src/lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    const result = await apiFetch<{ message: string; resetUrl?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setDone(true);
    setDevUrl(result.data.resetUrl || null);
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
            Forgot password
          </Text>
          <Text className="font-ui text-base text-ink-muted dark:text-ink-muted-dark">
            We will email a reset link if that address is registered.
          </Text>
        </View>
        <View className="gap-4 rounded-2xl bg-white/90 p-5 dark:border dark:border-border-dark dark:bg-surface-dark-elevated">
          {done ? (
            <>
              <Text className="font-ui text-ink dark:text-ink-on-dark" accessibilityRole="text">
                If that email is registered, a reset link has been sent.
              </Text>
              {devUrl ? (
                <Text className="font-ui text-xs text-ink-muted dark:text-ink-muted-dark">
                  Dev URL available — open Reset password and paste the token from the link.
                </Text>
              ) : null}
              <Button
                label="Enter reset token"
                onPress={() => router.push('/(auth)/reset-password')}
              />
              <Link href="/(auth)/login" asChild>
                <Button label="Back to sign in" variant="ghost" />
              </Link>
            </>
          ) : (
            <>
              <TextField
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              {error ? <Text className="font-ui text-danger">{error}</Text> : null}
              <Button label="Send reset link" onPress={handleSubmit} loading={loading} />
              <Link href="/(auth)/login" asChild>
                <Button label="Back to sign in" variant="ghost" />
              </Link>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
