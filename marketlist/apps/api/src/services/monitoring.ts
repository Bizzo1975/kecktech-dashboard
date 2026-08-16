type CaptureContext = Record<string, unknown>;

type SentryLike = {
  init: (opts: { dsn: string; environment?: string; tracesSampleRate?: number }) => void;
  captureException: (error: unknown, hint?: { extra?: CaptureContext }) => void;
};

let sentry: SentryLike | null = null;
let initialized = false;

const loadSentry = (): SentryLike | null => {
  try {
    // Optional peer — no-op when package missing or DSN unset
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/node') as SentryLike;
  } catch {
    return null;
  }
};

/** Call once at process start. No-ops when SENTRY_DSN is unset. */
export const initMonitoring = (): void => {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN || '';
  if (!dsn) return;

  sentry = loadSentry();
  if (!sentry) {
    console.warn('[marketlist] SENTRY_DSN set but @sentry/node is not installed');
    return;
  }

  sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
};

export const captureException = async (error: unknown, context: CaptureContext = {}) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error('[marketlist]', err.message, context);

  if (!sentry) {
    sentry = process.env.SENTRY_DSN ? loadSentry() : null;
  }
  if (!sentry) return;

  try {
    sentry.captureException(err, { extra: context });
  } catch (sendError) {
    console.error('[marketlist] failed to report error', sendError);
  }
};
