import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthGuard } from './useAuthGuard';
import { setMockSession, mockUseSession, resetMockSession } from '@/test/session';

// useAuthGuard kini SHIM di atas useSession — tak ada lagi hydration failsafe localStorage.
vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

describe('useAuthGuard (shim di atas session)', () => {
  beforeEach(() => resetMockSession());

  it('ready=false saat status loading', () => {
    setMockSession({ user: { id: 'u1' }, status: 'loading' });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.ready).toBe(false);
  });

  it('ready=true + user terisi saat authenticated', () => {
    setMockSession({
      user: { id: 'u1', name: 'Owner', role: 'TENANT_OWNER', currentOutletId: null, permissions: ['a'] },
      backendAccessToken: 'tok',
    });
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.ready).toBe(true);
    expect(result.current.user?.role).toBe('TENANT_OWNER');
    expect(result.current.accessToken).toBe('tok');
    expect(result.current.hasRefresh).toBe(true);
  });

  it('ready=true + user null saat unauthenticated', () => {
    setMockSession(null);
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.ready).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.hasRefresh).toBe(false);
  });
});
