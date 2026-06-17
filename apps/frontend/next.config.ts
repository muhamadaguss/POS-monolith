import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    // process.cwd() akan mengarah ke folder 'apps/frontend'
    // kita naik 2 tingkat ke atas untuk mencapai root 'Point-of-sales'
    root: path.resolve(process.cwd(), "../../"),
  },
};

// Bungkus dengan Sentry. Tetap berfungsi tanpa DSN/auth token:
// upload sourcemap hanya jalan bila SENTRY_AUTH_TOKEN (+ org/project) diisi
// saat deploy; tanpa itu, build lolos normal (upload di-skip, bukan gagal).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Kurangi noise log build di CI/lokal.
  silent: !process.env.CI,
  // Jangan gagalkan build jika sourcemap upload bermasalah.
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
