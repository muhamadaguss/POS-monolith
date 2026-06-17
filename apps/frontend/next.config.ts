import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  turbopack: {
    // process.cwd() akan mengarah ke folder 'apps/frontend'
    // kita naik 2 tingkat ke atas untuk mencapai root 'Point-of-sales'
    root: path.resolve(process.cwd(), "../../"),
  },
};

// PWA (Serwist) — sumber SW di src/app/sw.ts, ter-build ke public/sw.js.
// Aktif HANYA di production build. Dinonaktifkan selain itu (dev pakai Turbopack
// yang tak didukung plugin webpack @serwist/next; build production pakai
// `next build --webpack` — lihat script "build"). `disable` mencegah warning &
// caching saat dev.
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

// Bungkus dengan Sentry. Tetap berfungsi tanpa DSN/auth token:
// upload sourcemap hanya jalan bila SENTRY_AUTH_TOKEN (+ org/project) diisi
// saat deploy; tanpa itu, build lolos normal (upload di-skip, bukan gagal).
// Komposisi: Serwist di dalam, Sentry di luar (Sentry memproses config final).
export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Kurangi noise log build di CI/lokal.
  silent: !process.env.CI,
  // Jangan gagalkan build jika sourcemap upload bermasalah.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Tunnel event Sentry lewat route same-origin agar tak diblok ad-blocker
  // (Brave Shields / uBlock memblok *.ingest.sentry.io → status (blocked:other)).
  // SDK otomatis membuat rewrite di route ini & meneruskan envelope sisi server.
  tunnelRoute: "/monitoring",
});
