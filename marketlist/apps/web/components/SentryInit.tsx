'use client';

import { useEffect } from 'react';
import { initSentry } from '../lib/sentry';

/** Loads optional Sentry when NEXT_PUBLIC_SENTRY_DSN is set. */
export const SentryInit = () => {
  useEffect(() => {
    initSentry();
  }, []);
  return null;
};
