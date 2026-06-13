# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Kasirku** — a cloud-based, multi-tenant SaaS POS platform for SMB retail/F&B. Monorepo with three packages, but **not** a configured workspace (no root `workspaces` field). The root `package.json` only pins Prisma so the generated client hoists to the root `node_modules`. Each app is installed and run independently.

- `apps/frontend` — Next.js 16 (App Router, Turbopack dev), React 19, Auth.js v5 (cookie session), Tailwind v4. Read-only pages are React Server Components; POS + CRUD stay client (hybrid)
- `apps/backend` — NestJS 11, Prisma 5, PostgreSQL, JWT auth
- `packages/database` — Prisma schema, migrations, seed

This is not a git repository.

## Commands

Run each in its own package directory.

**Backend** (`apps/backend`)
- `npm run start:dev` — dev server with watch (port 3001, API at `/api/v1`)
- `npm run build` / `npm run start:prod`
- `npm run lint` — ESLint with `--fix`
- `npm test` — Jest; single file: `npm test -- auth.service.spec`; single test: `npm test -- -t "test name"`
- `npm run test:e2e` — e2e via `test/jest-e2e.json`
- **Unit tests** mock Prisma via `test/prisma-mock.ts` (`createMockPrisma()`) — no DB needed. Service spec files live beside each service (`*.service.spec.ts`). Critical-path coverage: auth refresh-rotation, transactions void/refund, shifts close-cash, products/users/inventory/outlets/billing validations. The e2e (`test/app.e2e-spec.ts`) is a hermetic smoke test (guard 401, public login, validation **422** — the global pipe uses `errorHttpStatusCode: 422`, not 400).
- Swagger UI at `http://localhost:3001/api/docs` (non-production only)

**Frontend** (`apps/frontend`)
- `npm run dev` — Next dev (port 3000)
- `npm run build` / `npm run start`
- `npm run lint` — `eslint`

**Database** (`packages/database`)
- `npm run db:migrate` — `prisma migrate dev` (creates + applies migration)
- `npm run db:migrate:prod` — `prisma migrate deploy`
- `npm run db:generate` — regenerate client (**see gotcha below**)
- `npm run db:seed` / `npm run db:reset` / `npm run db:studio`

### Prisma client path gotcha (monorepo)
The backend resolves `@prisma/client` from the **root** `node_modules` (it's pinned there). Running `prisma generate` from `packages/database` can write the generated client into `packages/database/node_modules/.prisma`, which the backend never loads → stale-types / runtime mismatch. If you hit "type X is not assignable" or missing-field errors right after a schema change:
```
rm -rf packages/database/node_modules/.prisma packages/database/node_modules/@prisma/client
# then regenerate from the repo root so it hoists
npx prisma generate --schema packages/database/prisma/schema.prisma
```

## Backend architecture

NestJS with a global pipeline wired in `apps/backend/src/app.module.ts`. Understanding this pipeline is the fastest way to be productive — most behavior is cross-cutting, not per-controller.

- **Global prefix** `api/v1` (set in `main.ts`). CORS restricted to `FRONTEND_URL`.
- **Auth is default-on.** `JwtAuthGuard` is a global `APP_GUARD` — every route requires a valid access token *unless* decorated `@Public()` (`common/decorators/public.decorator.ts`). `JwtStrategy` extracts the token via `ExtractJwt.fromExtractors([fromAuthHeaderAsBearerToken(), cookieExtractor])` — **Bearer header is primary**, cookie (`access_token`) is a fallback (additive for the Auth.js migration; `cookie-parser` is wired in `main.ts`).
- **Security headers via Helmet** (`main.ts`); CSP off in non-prod (Swagger). Static uploads at `/uploads` (product images) set `Cross-Origin-Resource-Policy: cross-origin` so the frontend (different origin) can load `<img>` — Helmet's global CORP is `same-origin` and would otherwise block them.
- **RBAC layered on top.** `RolesGuard` activates only when `@Roles()` is present; `PermissionsGuard` only when `@RequirePermissions()` is present. Roles/permissions are defined in `common/rbac/` — see RBAC model below.
- **Response envelope.** `ResponseInterceptor` wraps every success response as `{ success, data, timestamp }`. The frontend axios layer unwraps `data`, so backend handlers should return the bare payload.
- **Errors.** `GlobalExceptionFilter` normalizes all thrown errors.
- **Audit logging is automatic.** `AuditLogInterceptor` records every mutating request (POST/PATCH/PUT/DELETE) into the `AuditLog` table. Opt a route out with `@SkipAuditLog()`.
- **Rate limiting** via `ThrottlerGuard` (default 100 req / 60s per IP, env-overridable).
- **Validation** is global via `createValidationPipe()` (`common/pipes/validation.pipe.ts`). It uses **class-validator + class-transformer** (decorated DTOs), not zod, and returns **422** on failure.
- **Prisma** exposed through `PrismaModule` / `PrismaService` (connect/disconnect on lifecycle hooks). Inject `PrismaService`, don't `new PrismaClient()`.

Feature modules under `src/modules/`: `auth, users, outlets, products, inventory, shifts, transactions, reports, audit-logs`. Each follows controller / service / `dto/` convention.

### RBAC model (`common/rbac/`)
Four roles: `SUPER_ADMIN`, `TENANT_OWNER`, `STORE_MANAGER`, `CASHIER`. Permissions are string constants in `PERMISSIONS`; defaults per role in `ROLE_DEFAULT_PERMISSIONS`. Key distinctions to keep in mind when touching auth:
- `TENANT_OWNER` has `staff.manage_global` (cross-outlet) but **not** `staff.manage_local`. The Owner operates across all outlets and has **no `currentOutletId`** (it's `null`) — code that gates on `currentOutletId` must special-case the Owner.
- `STORE_MANAGER` has `staff.manage_local` and is scoped to one outlet.
- `CASHIER` has `shift.own` + `pos.transaction` only; `pos.void`/`pos.refund` require a manager PIN and are intentionally excluded from cashier defaults.
- A `UserOutletRole` row can override the default permission set for a user at a specific outlet.

### Auth flow & token rotation
JWT access token (15m) + refresh token (7d). TTLs are read from `config/jwt.config.ts` (env `JWT_ACCESS_EXPIRES_IN`/`JWT_REFRESH_EXPIRES_IN`); the `RefreshToken.expiresAt` DB row is derived from the same duration via `ms()` so the JWT `exp` claim and the DB row never diverge. The `auth` module implements **refresh-token rotation with reuse-detection and a 30s grace window** (`RefreshToken.replacedByTokenId` links a rotated token to its successor). Rotating the same token twice in parallel triggers reuse-detection and revokes the whole session — this was the historic "always 401 after desktop sleep" bug. **Refresh is now handled by Auth.js in the `jwt` callback (server-side, serialized per request)**, which structurally avoids the parallel-rotation race the old frontend single-flight code worked around. `selectOutlet` for an Owner keeps the `TENANT_OWNER` role + global permissions and only verifies the outlet belongs to the tenant.

## Frontend architecture

**This is Next.js 16, not the Next.js in your training data.** `apps/frontend/CLAUDE.md` imports `AGENTS.md`, which mandates: read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code, and heed deprecation notices. APIs/conventions may differ.

### Auth: Auth.js v5 + cookie (NOT localStorage anymore)
Auth was migrated off localStorage/Zustand to **Auth.js v5 (`next-auth@5 beta`)** with a JWT session in an **HttpOnly cookie** (`authjs.session-token`). The backend NestJS stays the token **authority** (bcrypt, RBAC, rotation, audit); Auth.js is the Next.js **session layer** via a `Credentials` provider that delegates login/refresh to `/auth/*`.
- **`src/auth.ts`** — the config: `Credentials.authorize()` → `POST /auth/login`; `jwt` callback copies backend tokens + refreshes (`POST /auth/refresh`) when the access token nears expiry (`REFRESH_BUFFER_MS = 60s`, must stay **< access TTL** of 15m); `session` callback exposes `user`/`outlets`/`backendAccessToken` to the client but **never** the refresh token. Token-type augmentation uses `declare module '@auth/core/jwt'` (NOT `next-auth/jwt`).
- **`src/app/api/auth/[...nextauth]/route.ts`** — `import { handlers }; export const { GET, POST } = handlers;` (not `export { GET, POST } from '@/auth'`).
- **`src/proxy.ts`** (Next 16 renamed `middleware`→`proxy`; file `src/proxy.ts`, runs on Node runtime) — `export { auth as proxy }` wrapper does **optimistic** server-side gating + by-role redirect. This is NOT the only defense (see DAL).
- **`src/lib/session.ts`** = the **DAL**: `verifySession()` (`cache()`-memoized, redirects to `/login` if no session or `RefreshTokenError`), `getBackendToken()`, and **`serverFetch<T>(path)`** — the server-side replacement for axios: verifies session, injects `Bearer`, unwraps the `{success,data}` envelope, 401→redirect. **Real auth verification happens here, per server-fetch — not in proxy alone.**

### Routing & role gating
App Router route groups: `(auth)` (login, select-outlet), `(dashboard)`, `(pos)`, plus `admin`. Gating is layered: `proxy.ts` (optimistic redirect, server) + per-page/DAL checks. By role: Owner → `/dashboard` (skips `currentOutletId`); Cashier → `/pos`; Manager → `/dashboard` if it has `currentOutletId` else `/select-outlet`. `app/page.tsx` is the role-based entry redirector. The `(dashboard)`/`(pos)` layouts are still Client Components and call `useAuthGuard()` (see shims).

### RSC migration & the HYBRID model
Read-only pages were converted to **React Server Components** (data fetched server-side via `serverFetch`, rendered to HTML; interactive chrome is small Client children; filters live in **URL searchParams**; each segment has `loading.tsx` + `error.tsx`). **Done:** dashboard, reports, shift/history, audit-log, users. Pattern: page is `async` Server Component → RBAC check renders inline "Akses Ditolak" (no `/unauthorized` route) → `serverFetch` → pass data to a `'use client'` child for interactivity; mutations call `router.refresh()`.

**This is deliberately HYBRID, not "everything RSC".** POS (`(pos)/*`) stays Client Component on purpose (offline-first for the planned PWA — RSC can't render offline since it needs the server). Form/CRUD-heavy pages (products, outlets, billing, shift, admin/*) also stay client for now. **Do not convert `(pos)/*` to RSC.**

### Compat shims (kept on purpose, NOT dead code)
Because client pages remain, these shims survive — each is a thin layer over `useSession()`, not the old localStorage machinery:
- **`features/auth/store.ts`** — `useAuthStore((s) => s.user/.outlets/.accessToken)` reads from `useSession()`; mutators are no-ops (Auth.js owns state). `useAuthHydrated()` = `status !== 'loading'`. ~12 client consumers (pos, products, outlets, shift, billing, inventory, admin, Sidebar, OutletSwitcher).
- **`features/auth/useAuthGuard.ts`** — returns `{ ready, user, accessToken, hasRefresh }` from `useSession()`; used by the still-client `(dashboard)`/`(pos)` layouts.
- **`lib/api.ts`** (axios for Client Components): `setApiAccessToken()` (called by `AuthTokenSync` in `SessionProvider` when the session changes) feeds the Bearer interceptor; response interceptor unwraps `{success,data}` and redirects to `/login` on a non-`/auth/` 401. **No single-flight/rotation/localStorage** — Auth.js does refresh server-side. `proactiveRefresh()`/`getRefreshToken()` are no-op compat stubs still called by a few client loaders.
- `hooks/usePageFocus.ts` fires a debounced, fire-and-forget `proactiveRefresh()` (now a no-op) on focus — kept for its client consumers.

### Other conventions
- `features/<domain>/` holds `api.ts`, `hooks.ts`, `store.ts`, `types.ts`, `components/` per domain. For RSC-converted domains, server fetchers live in `features/<domain>/server.ts` (uses `serverFetch`) and **pure** mappers/types in `features/<domain>/shared.ts` — keep pure code out of `'use client'` modules (a value exported from a client module becomes a proxy reference when imported by a Server Component; the `FILTERS.find is not a function` bug).
- `components/ui/` is the design-system layer; `components/shared/` is app-specific (e.g. `Sidebar`).
- `.env` needs `AUTH_SECRET` (Auth.js JWT encryption) + `NEXT_PUBLIC_API_URL`; `trustHost: true` for dev. Only placeholders in `.env.example`.
- Data-loading callbacks in remaining client pages must `setIsLoading(false)` on the empty-`outletId` early-return and wrap the body in `try/catch {}` — otherwise an Owner with no outlet, or a fetch failure, leaves the page spinning.

### Known non-blocking noise
The ESLint rule `react-hooks/set-state-in-effect` fires across several pages (users/dashboard/inventory/shift). It is pre-existing, project-wide, and does **not** fail the build — treat it as known noise, not a regression.

`tsc --noEmit` is now **clean (0 errors)** and `npm run build` passes typecheck. The former baseline of 8 Decimal-typing errors in `shift/page.tsx` was fixed via a `toNum()` coercion helper (Prisma `Decimal` money fields serialize as `string`, so coerce before `IDR.format`/comparisons). If you reintroduce a money value typed `string | number`, wrap it in `toNum()`. New TS errors after a change are yours — the baseline is green.

## Reference docs
- `PRD.md` — product requirements / spec for the platform.
