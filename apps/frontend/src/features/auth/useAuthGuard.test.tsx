import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthGuard } from './useAuthGuard';
import { useAuthStore } from './store';

/**
 * Fokus: jaminan useAuthGuard "TIDAK PERNAH stuck di spinner".
 * - ready menjadi true via failsafe timeout walau hydration tak pernah selesai.
 * - ready dipaksa true saat tab kembali aktif (visibilitychange).
 * Ini akar perbaikan "loading abadi setelah sleep / pindah tab lama".
 */
describe('useAuthGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, outlets: [] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ready menjadi true segera bila store sudah ter-hydrate', () => {
    vi.spyOn(useAuthStore.persist, 'hasHydrated').mockReturnValue(true);
    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.ready).toBe(true);
  });

  it('FAILSAFE: ready menjadi true setelah timeout walau hydration tak selesai', () => {
    vi.useFakeTimers();
    vi.spyOn(useAuthStore.persist, 'hasHydrated').mockReturnValue(false);
    // onFinishHydration tak pernah memanggil callback (simulasi hydration macet).
    vi.spyOn(useAuthStore.persist, 'onFinishHydration').mockReturnValue(() => {});

    const { result } = renderHook(() => useAuthGuard(3000));
    expect(result.current.ready).toBe(false); // masih menunggu

    act(() => { vi.advanceTimersByTime(3000); }); // lewati failsafe
    expect(result.current.ready).toBe(true); // tidak stuck
  });

  it('tab kembali aktif (visibilitychange) memaksa ready=true & rehydrate', () => {
    vi.spyOn(useAuthStore.persist, 'hasHydrated').mockReturnValue(false);
    vi.spyOn(useAuthStore.persist, 'onFinishHydration').mockReturnValue(() => {});
    const rehydrate = vi.spyOn(useAuthStore.persist, 'rehydrate').mockResolvedValue();
    // visibilityState 'visible' agar handler tidak early-return.
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });

    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.ready).toBe(false);

    act(() => { document.dispatchEvent(new Event('visibilitychange')); });

    expect(rehydrate).toHaveBeenCalled();
    expect(result.current.ready).toBe(true);
  });

  it('mengembalikan user & accessToken terkini dari store', () => {
    vi.spyOn(useAuthStore.persist, 'hasHydrated').mockReturnValue(true);
    act(() => {
      useAuthStore.setState({
        accessToken: 'acc-1',
        user: {
          id: 'u1', name: 'Andi', email: 'a@b.c', role: 'CASHIER',
          tenantId: 't1', currentOutletId: 'o1', permissions: ['shift.own'],
        },
      });
    });

    const { result } = renderHook(() => useAuthGuard());
    expect(result.current.accessToken).toBe('acc-1');
    expect(result.current.user?.name).toBe('Andi');
  });
});
