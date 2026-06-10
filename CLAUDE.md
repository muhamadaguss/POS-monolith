# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Kasirku** — a cloud-based, multi-tenant SaaS POS platform for SMB retail/F&B. Monorepo with three packages, but **not** a configured workspace (no root `workspaces` field). The root `package.json` only pins Prisma so the generated client hoists to the root `node_modules`. Each app is installed and run independently.

- `apps/frontend` — Next.js 16 (App Router, Turbopack dev), React 19, Zustand, Tailwind v4
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
- **Auth is default-on.** `JwtAuthGuard` is a global `APP_GUARD` — every route requires a valid access token *unless* decorated `@Public()` (`common/decorators/public.decorator.ts`).
- **RBAC layered on top.** `RolesGuard` activates only when `@Roles()` is present; `PermissionsGuard` only when `@RequirePermissions()` is present. Roles/permissions are defined in `common/rbac/` — see RBAC model below.
- **Response envelope.** `ResponseInterceptor` wraps every success response as `{ success, data, timestamp }`. The frontend axios layer unwraps `data`, so backend handlers should return the bare payload.
- **Errors.** `GlobalExceptionFilter` normalizes all thrown errors.
- **Audit logging is automatic.** `AuditLogInterceptor` records every mutating request (POST/PATCH/PUT/DELETE) into the `AuditLog` table. Opt a route out with `@SkipAuditLog()`.
- **Rate limiting** via `ThrottlerGuard` (default 100 req / 60s per IP, env-overridable).
- **Validation** is global via `createValidationPipe()` (`common/pipes/zod-validation.pipe.ts`).
- **Prisma** exposed through `PrismaModule` / `PrismaService` (connect/disconnect on lifecycle hooks). Inject `PrismaService`, don't `new PrismaClient()`.

Feature modules under `src/modules/`: `auth, users, outlets, products, inventory, shifts, transactions, reports, audit-logs`. Each follows controller / service / `dto/` convention.

### RBAC model (`common/rbac/`)
Four roles: `SUPER_ADMIN`, `TENANT_OWNER`, `STORE_MANAGER`, `CASHIER`. Permissions are string constants in `PERMISSIONS`; defaults per role in `ROLE_DEFAULT_PERMISSIONS`. Key distinctions to keep in mind when touching auth:
- `TENANT_OWNER` has `staff.manage_global` (cross-outlet) but **not** `staff.manage_local`. The Owner operates across all outlets and has **no `currentOutletId`** (it's `null`) — code that gates on `currentOutletId` must special-case the Owner.
- `STORE_MANAGER` has `staff.manage_local` and is scoped to one outlet.
- `CASHIER` has `shift.own` + `pos.transaction` only; `pos.void`/`pos.refund` require a manager PIN and are intentionally excluded from cashier defaults.
- A `UserOutletRole` row can override the default permission set for a user at a specific outlet.

### Auth flow & token rotation
JWT access token (15m) + refresh token (7d), configured in `config/jwt.config.ts`. The `auth` module implements **refresh-token rotation with reuse-detection and a 30s grace window** (`RefreshToken.replacedByTokenId` links a rotated token to its successor). Rotating the same token twice in parallel triggers reuse-detection and revokes the whole session — this was the root cause of the recurring "always 401 after desktop sleep" bug, which is why the frontend enforces single-flight refresh (see below). `selectOutlet` for an Owner keeps the `TENANT_OWNER` role + global permissions and only verifies the outlet belongs to the tenant.

## Frontend architecture

**This is Next.js 16, not the Next.js in your training data.** `apps/frontend/CLAUDE.md` imports `AGENTS.md`, which mandates: read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code, and heed deprecation notices. APIs/conventions may differ.

### Routing & auth guards
App Router with route groups: `(auth)` (login, select-outlet), `(dashboard)`, `(pos)`, plus `admin`. **There is no middleware** — all auth gating is client-side in the layout files. Each protected layout (`(dashboard)/layout.tsx`, `(pos)/layout.tsx`) calls `useAuthGuard()` and routes by role:
- Owner → `/dashboard` (skips the `currentOutletId` check)
- Cashier → `/pos`
- Manager → `/dashboard` if it has `currentOutletId`, else `/select-outlet`
- `app/page.tsx` is the role-based entry redirector.

`useAuthGuard` (`features/auth/useAuthGuard.ts`) is the **single source of truth for "is the session ready to render"** and is deliberately failsafe-heavy because the app was repeatedly getting stuck on an infinite spinner after sleep / long tab-idle. It guarantees `ready` always becomes `true` via three mechanisms: hydration listener, a timeout failsafe (default 3s), and forcing `persist.rehydrate()` + `setReady(true)` on `visibilitychange`/`pageshow`/`focus`. **Do not gate render solely on `persist.hasHydrated()` / `onFinishHydration` — that is what caused the permanent-spinner bugs.**

### State, persistence, and the auth store
Zustand with `persist`, single localStorage key **`kasirku-auth`** (`features/auth/store.ts`). The store uses a custom `mergingStorage` adapter — this is load-bearing, do not simplify it away:
- On `setItem`, it merges the incoming payload with what's already in storage and **preserves existing tokens when the incoming token is empty/null** (treats `''` the same as `null`). This prevents a stray `setUser`/`setOutlets` from re-serializing the whole state and clobbering tokens — the cause of "tokens vanish from localStorage while user/outlets remain".
- `partialize` was tried and made things worse; the store intentionally persists full state through the merging adapter instead.

### Axios layer (`lib/api.ts`)
- Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api/v1`).
- Request interceptor injects `Bearer` from the raw `kasirku-auth` localStorage entry.
- Response interceptor unwraps the `{ success, data }` envelope and, on 401, triggers refresh — **except for `/auth/` URLs** (refreshing on a login 401 caused `no_refresh_token` errors).
- **Single-flight refresh** (`refreshOnce` / `refreshPromise`): only one refresh request is in flight at a time; all callers await the same promise. The promise is reset *inside* its own `try/finally` to avoid floating-promise `unhandledRejection`. This is required because of backend rotation/reuse-detection (above).
- `persistTokens` writes **only** to raw localStorage (never via the store) to avoid the clobber described above.
- Redirect-to-login only happens on genuine auth failure (401/403 or `no_refresh_token`), never on network errors.

### Other conventions
- `features/<domain>/` holds `api.ts`, `hooks.ts`, `store.ts`, `types.ts`, `components/` per domain (`auth, pos, inventory, users, shifts, reports, outlets, audit-logs`).
- `components/ui/` is the design-system layer; `components/shared/` is app-specific (e.g. `Sidebar`).
- `hooks/usePageFocus.ts` fires a debounced (150ms), fire-and-forget `proactiveRefresh()` on focus — refresh is **not** awaited before the page's own load callback.
- Data-loading callbacks (`features/pos/hooks.ts` `loadInitial`, dashboard `load`, etc.) must `setIsLoading(false)` on the empty-`outletId` early-return and wrap the body in `try/catch {}` — otherwise an Owner with no outlet, or a refresh failure, leaves the page spinning or throws `unhandledRejection`.

### Known non-blocking noise
The ESLint rule `react-hooks/set-state-in-effect` fires across several pages (users/dashboard/inventory/shift). It is pre-existing, project-wide, and does **not** fail the build — treat it as known noise, not a regression.

`tsc --noEmit` is now **clean (0 errors)** and `npm run build` passes typecheck. The former baseline of 8 Decimal-typing errors in `shift/page.tsx` was fixed via a `toNum()` coercion helper (Prisma `Decimal` money fields serialize as `string`, so coerce before `IDR.format`/comparisons). If you reintroduce a money value typed `string | number`, wrap it in `toNum()`. New TS errors after a change are yours — the baseline is green.

## Reference docs
- `PRD.md` — product requirements / spec for the platform.
