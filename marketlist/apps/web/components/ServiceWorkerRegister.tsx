'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'ml_sw_v3_reloaded';
const SW_VERSION = 'v3';
const CURRENT_CACHE = `marketlist-shell-${SW_VERSION}`;

const killStaleWorkers = async (): Promise<boolean> => {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
  const cachesKeys = await caches.keys();
  const hasStaleCache = cachesKeys.some(
    (k) => k.startsWith('marketlist-shell-') && k !== CURRENT_CACHE,
  );
  if (!hasStaleCache) return false;

  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  await Promise.all(cachesKeys.filter((k) => k !== CURRENT_CACHE).map((k) => caches.delete(k)));
  return true;
};

const registerFresh = async () => {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.register('/sw.js', {
    scope: '/',
    updateViaCache: 'none',
  });
  await reg.update();

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (localStorage.getItem(RELOAD_KEY) === SW_VERSION) return;
    localStorage.setItem(RELOAD_KEY, SW_VERSION);
    window.location.reload();
  });
};

export const ServiceWorkerRegister = () => {
  useEffect(() => {
    const run = async () => {
      try {
        const killed = await killStaleWorkers();
        await registerFresh();
        if (killed && localStorage.getItem(RELOAD_KEY) !== SW_VERSION) {
          localStorage.setItem(RELOAD_KEY, SW_VERSION);
          window.location.reload();
        }
      } catch {
        /* offline or denied */
      }
    };
    void run();
  }, []);

  return null;
};
