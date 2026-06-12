import { vi } from 'vitest';

/**
 * Helper test: mock `useSession` (next-auth/react) untuk komponen yang membaca
 * auth lewat shim `useAuthStore`/`useAuthGuard` (yang kini dilapis di atas session).
 *
 * Pakai di test:
 *   vi.mock('next-auth/react');           // di atas file
 *   setMockSession({ user: {...}, outlets: [...] });
 */

export interface MockUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string | null;
  currentOutletId?: string | null;
  permissions?: string[];
}

export interface MockSessionInput {
  user?: MockUser | null;
  outlets?: Array<{ id: string; name: string; role?: string; permissions?: string[] }>;
  backendAccessToken?: string;
  status?: 'loading' | 'authenticated' | 'unauthenticated';
}

let current: {
  data: unknown;
  status: 'loading' | 'authenticated' | 'unauthenticated';
} = { data: null, status: 'unauthenticated' };

/** Set sesi yang dikembalikan useSession() pada test berikutnya. */
export function setMockSession(input: MockSessionInput | null): void {
  if (!input || input.user === null) {
    current = { data: null, status: input?.status ?? 'unauthenticated' };
    return;
  }
  const user: MockUser = {
    id: 'u1',
    name: 'Test User',
    email: 'test@demo.com',
    role: 'TENANT_OWNER',
    tenantId: 't1',
    currentOutletId: null,
    permissions: [],
    ...input.user,
  };
  current = {
    status: input.status ?? 'authenticated',
    data: {
      user,
      outlets: input.outlets ?? [],
      backendAccessToken: input.backendAccessToken ?? 'access-token',
      expires: '2099-01-01T00:00:00.000Z',
    },
  };
}

/** Implementasi useSession yang dipakai mock. */
export function mockUseSession() {
  return {
    data: current.data,
    status: current.status,
    update: vi.fn(async () => current.data),
  };
}

/** Reset ke unauthenticated (panggil di beforeEach/afterEach). */
export function resetMockSession(): void {
  current = { data: null, status: 'unauthenticated' };
}
