import '../global.css';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { useFonts, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { store, RootState, setSession, setHydrated, setHouseholdId } from '../src/store';
import { apiFetch } from '../src/lib/api';
import { clearTokens, getAccessToken, getHouseholdId, getRefreshToken, saveTokens } from '../src/lib/secureStorage';
import { connectSocket } from '../src/lib/socket';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { initSentry } from '../src/lib/sentry';
import { hasCompletedOnboarding } from './onboarding';

initSentry();

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const { accessToken, hydrated, householdId } = useSelector((s: RootState) => s.auth);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const hydrate = async () => {
      const onboarded = await hasCompletedOnboarding();
      if (!onboarded && segments[0] !== 'onboarding') {
        router.replace('/onboarding');
      }
      const access = await getAccessToken();
      const refresh = await getRefreshToken();
      if (!access || !refresh) {
        dispatch(setHydrated());
        return;
      }
      const me = await apiFetch<{ user: { id: string; email: string; name: string } }>('/auth/me', {
        token: access,
      });
      if (me.success) {
        dispatch(setSession({ user: me.data.user, accessToken: access, refreshToken: refresh }));
        const households = await apiFetch<{ households: Array<{ id: string }> }>('/households', {
          token: access,
        });
        if (households.success && households.data.households.length) {
          const sticky = await getHouseholdId();
          const match =
            (sticky && households.data.households.find((h) => h.id === sticky)) ||
            households.data.households[0];
          dispatch(setHouseholdId(match.id));
        }
        return;
      }
      const refreshed = await apiFetch<{
        user: { id: string; email: string; name: string };
        accessToken: string;
        refreshToken: string;
      }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (refreshed.success) {
        await saveTokens(refreshed.data.accessToken, refreshed.data.refreshToken);
        dispatch(
          setSession({
            user: refreshed.data.user,
            accessToken: refreshed.data.accessToken,
            refreshToken: refreshed.data.refreshToken,
          }),
        );
      } else {
        await clearTokens();
        dispatch(setHydrated());
      }
    };
    hydrate();
  }, [dispatch]);

  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    if (inOnboarding) return;
    if (!accessToken && !inAuth) {
      router.replace('/(auth)/login');
    } else if (accessToken && inAuth) {
      router.replace('/(app)');
    }
  }, [accessToken, hydrated, segments, router]);

  useEffect(() => {
    if (accessToken) {
      connectSocket(accessToken, householdId);
    }
  }, [accessToken, householdId]);

  return <>{children}</>;
};

const RootLayoutNav = () => {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <AuthGate>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: dark ? '#121512' : '#F7FAF8' },
          }}
        />
      </AuthGate>
    </ErrorBoundary>
  );
};

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
