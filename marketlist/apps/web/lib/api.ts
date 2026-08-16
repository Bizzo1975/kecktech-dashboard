const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };

export const getApiBase = () => API_BASE;

const ACCESS = 'ml_access';
const USER = 'ml_user';
const HOUSEHOLD = 'ml_household';
/** Legacy key — cleared on logout / migrate */
const LEGACY_REFRESH = 'ml_refresh';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  dietaryPrefs?: string[] | null;
  notificationPrefs?: {
    notifyExpiring?: boolean;
    notifyTripReminder?: boolean;
  } | null;
};

let memoryAccess: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

const rawFetch = async <T,>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<{ status: number; body: ApiResult<T> }> => {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const body = (await response.json()) as ApiResult<T>;
  return { status: response.status, body };
};

const tryRefresh = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const legacy = localStorage.getItem(LEGACY_REFRESH);
    const { status, body } = await rawFetch<{
      user: SessionUser;
      accessToken: string;
      refreshToken?: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(legacy ? { refreshToken: legacy } : {}),
    });
    if (status !== 200 || !body.success) {
      clearSession();
      return false;
    }
    saveSession({
      accessToken: body.data.accessToken,
      user: body.data.user,
      householdId: localStorage.getItem(HOUSEHOLD) || sessionStorage.getItem(HOUSEHOLD),
    });
    localStorage.removeItem(LEGACY_REFRESH);
    return true;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
};

export const apiFetch = async <T,>(
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
  const session = readSession();
  return (await rawFetch<T>(path, { ...options, token: session?.accessToken })).body;
};

export const saveSession = (payload: {
  accessToken: string;
  refreshToken?: string;
  user: SessionUser;
  householdId?: string | null;
}) => {
  memoryAccess = payload.accessToken;
  sessionStorage.setItem(ACCESS, payload.accessToken);
  sessionStorage.setItem(USER, JSON.stringify(payload.user));
  localStorage.setItem(USER, JSON.stringify(payload.user));
  if (payload.householdId) {
    sessionStorage.setItem(HOUSEHOLD, payload.householdId);
    localStorage.setItem(HOUSEHOLD, payload.householdId);
  }
  // Do not persist refresh in localStorage — httpOnly cookie is the source of truth.
  // Keep body refreshToken only for mobile-shaped clients / legacy one-shot.
  if (payload.refreshToken) {
    // intentionally unused on web after cookie set
  }
  localStorage.removeItem(LEGACY_REFRESH);
};

export const clearSession = () => {
  memoryAccess = null;
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(USER);
  sessionStorage.removeItem(HOUSEHOLD);
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(LEGACY_REFRESH);
  localStorage.removeItem(USER);
  localStorage.removeItem(HOUSEHOLD);
};

export const readSession = () => {
  if (typeof window === 'undefined') return null;
  const accessToken = memoryAccess || sessionStorage.getItem(ACCESS) || localStorage.getItem(ACCESS);
  const userRaw = sessionStorage.getItem(USER) || localStorage.getItem(USER);
  const householdId = sessionStorage.getItem(HOUSEHOLD) || localStorage.getItem(HOUSEHOLD);
  if (!accessToken || !userRaw) return null;
  return {
    accessToken,
    /** Present only as opaque marker for callers that still pass refresh; cookie handles real refresh */
    refreshToken: 'cookie',
    user: JSON.parse(userRaw) as SessionUser,
    householdId,
  };
};

export const setHouseholdId = (id: string) => {
  sessionStorage.setItem(HOUSEHOLD, id);
  localStorage.setItem(HOUSEHOLD, id);
};

export const updateStoredUser = (user: SessionUser) => {
  sessionStorage.setItem(USER, JSON.stringify(user));
  localStorage.setItem(USER, JSON.stringify(user));
};
