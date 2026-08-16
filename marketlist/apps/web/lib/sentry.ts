/**
 * Optional browser Sentry. No-op unless NEXT_PUBLIC_SENTRY_DSN is set.
 * Uses dynamic import so the SDK loads only when a DSN is present.
 */
type SentryLike = {
  init: (opts: { dsn: string; tracesSampleRate?: number }) => void;
  captureException: (error: unknown) => void;
};

let sentry: SentryLike | null = null;
let initialized = false;
let loading: Promise<SentryLike | null> | null = null;

const loadSentry = async (): Promise<SentryLike | null> => {
  if (typeof window === 'undefined') return null;
  if (sentry) return sentry;
  if (loading) return loading;
  loading = import('@sentry/nextjs')
    .then((mod) => {
      sentry = mod as unknown as SentryLike;
      return sentry;
    })
    .catch(() => {
      console.info('[marketlist] @sentry/nextjs failed to load — skipping');
      return null;
    });
  return loading;
};

export const initSentry = (): void => {
  if (initialized) return;
  initialized = true;
  if (typeof window === 'undefined') return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  void loadSentry().then((sdk) => {
    if (!sdk) return;
    sdk.init({
      dsn,
      tracesSampleRate: 0.1,
    });
  });
};

export const captureException = (error: unknown): void => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  void loadSentry().then((sdk) => {
    if (!sdk) return;
    try {
      sdk.captureException(error);
    } catch {
      // ignore
    }
  });
};
