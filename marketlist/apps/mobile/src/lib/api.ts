import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from './secureStorage';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export const getApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (extra?.apiUrl) {
    if (Platform.OS === 'android' && extra.apiUrl.includes('localhost')) {
      return extra.apiUrl.replace('localhost', '10.0.2.2');
    }
    return extra.apiUrl;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api';
};

export type ApiResult<T> = { success: true; data: T } | { success: false; error: { message: string; code: string } };

type RefreshPayload = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string };
};

let refreshInFlight: Promise<string | null> | null = null;

/**
 * 401 recovery rotates tokens in SecureStore only.
 * Redux auth state is not updated from here (no store access in this module);
 * subsequent apiFetch calls that omit `token` (or re-read via getAccessToken) will
 * pick up the rotated access token. Screens that pass a Redux `accessToken` prop
 * may still send a stale bearer until they remount / re-select from session bootstrap.
 */
const rawFetch = async <T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<{ status: number; body: ApiResult<T> }> => {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const body = (await response.json()) as ApiResult<T>;
  return { status: response.status, body };
};

const tryRefresh = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearTokens();
      return null;
    }
    const { status, body } = await rawFetch<RefreshPayload>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    if (status !== 200 || !body.success) {
      await clearTokens();
      return null;
    }
    await saveTokens(body.data.accessToken, body.data.refreshToken);
    return body.data.accessToken;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<ApiResult<T>> => {
  const first = await rawFetch<T>(path, options);
  const unauthorized =
    first.status === 401 ||
    (!first.body.success && first.body.error?.code === 'UNAUTHORIZED');
  const isRefreshCall = path.includes('/auth/refresh');
  if (!unauthorized || isRefreshCall) {
    return first.body;
  }
  const refreshed = await tryRefresh();
  if (!refreshed) return first.body;
  const token = (await getAccessToken()) || refreshed;
  return (await rawFetch<T>(path, { ...options, token })).body;
};
