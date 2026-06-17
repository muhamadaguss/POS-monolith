import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

// Service worker Kasirku (Serwist). Dikompilasi terpisah ke public/sw.js oleh
// @serwist/next saat build production (non-aktif di dev). Meng-cache app shell +
// aset statis; fallback navigasi offline → /offline.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Daftar precache di-inject saat build oleh @serwist/next.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
