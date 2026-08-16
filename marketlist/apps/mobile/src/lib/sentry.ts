/**
 * Optional Sentry for Expo. No-ops unless EXPO_PUBLIC_SENTRY_DSN is set
 * and @sentry/react-native is installed.
 */
type SentryLike = {
  init: (opts: { dsn: string; enableInExpoDevelopment?: boolean; tracesSampleRate?: number }) => void;
  captureException: (error: unknown) => void;
};

let sentry: SentryLike | null | undefined;

const loadSentry = (): SentryLike | null => {
  try {
    // Dynamic require keeps the app bootable without the native SDK.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryLike;
  } catch {
    return null;
  }
};

export const initSentry = (): void => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (sentry === undefined) sentry = loadSentry();
  if (!sentry) return;
  sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    tracesSampleRate: 0.1,
  });
};

export const captureException = (error: unknown): void => {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  if (sentry === undefined) sentry = loadSentry();
  if (!sentry) return;
  try {
    sentry.captureException(error);
  } catch {
    // ignore reporting failures
  }
};
