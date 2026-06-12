import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore, useAuthHydrated } from './store';
import { setMockSession, mockUseSession, resetMockSession } from '@/test/session';

// store.ts kini SHIM di atas useSession (Auth.js), bukan Zustand/localStorage.
vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

describe('useAuthStore (shim di atas session)', () => {
  beforeEach(() => resetMockSession());

  it('selector mengambil user dari session', () => {
    setMockSession({
      user: { id: 'u1', name: 'Andi', role: 'CASHIER', currentOutletId: 'o1', permissions: ['shift.own'] },
    });
    const { result } = renderHook(() => useAuthStore((s) => s.user));
    expect(result.current?.name).toBe('Andi');
    expect(result.current?.currentOutletId).toBe('o1');
    expect(result.current?.permissions).toEqual(['shift.own']);
  });

  it('selector outlets mengambil dari session', () => {
    setMockSession({
      user: { id: 'u1' },
      outlets: [{ id: 'o1', name: 'Outlet 1' }],
    });
    const { result } = renderHook(() => useAuthStore((s) => s.outlets));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Outlet 1');
  });

  it('tanpa selector mengembalikan state penuh (accessToken + user)', () => {
    setMockSession({ user: { id: 'u1', name: 'Owner' }, backendAccessToken: 'tok-123' });
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.accessToken).toBe('tok-123');
    expect(result.current.user?.name).toBe('Owner');
  });

  it('refreshToken TIDAK pernah diekspos ke klien (selalu null)', () => {
    setMockSession({ user: { id: 'u1' }, backendAccessToken: 'tok' });
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.refreshToken).toBeNull();
  });

  it('tanpa sesi: user null', () => {
    setMockSession(null);
    const { result } = renderHook(() => useAuthStore((s) => s.user));
    expect(result.current).toBeNull();
  });

  it('method mutasi adalah no-op (tidak melempar)', () => {
    setMockSession({ user: { id: 'u1' } });
    const { result } = renderHook(() => useAuthStore());
    expect(() => {
      result.current.setTokens('a', 'b');
      result.current.setUser({ id: 'x' } as never);
      result.current.clear();
    }).not.toThrow();
  });
});

describe('useAuthHydrated (shim)', () => {
  beforeEach(() => resetMockSession());

  it('false saat status loading', () => {
    setMockSession({ user: { id: 'u1' }, status: 'loading' });
    const { result } = renderHook(() => useAuthHydrated());
    expect(result.current).toBe(false);
  });

  it('true saat authenticated', () => {
    setMockSession({ user: { id: 'u1' }, status: 'authenticated' });
    const { result } = renderHook(() => useAuthHydrated());
    expect(result.current).toBe(true);
  });
});
