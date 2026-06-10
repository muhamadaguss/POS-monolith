import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './store';

const AUTH_KEY = 'kasirku-auth';

function readState() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw).state : null;
}

/**
 * Fokus: mergingStorage adapter. Inti perbaikan "token hilang padahal user &
 * outlets ada" — setUser/setOutlets TIDAK boleh menimpa token yang sudah ada,
 * dan setTokens(access, '') TIDAK boleh menghapus refresh token valid.
 */
describe('auth store — mergingStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    // reset state in-memory
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null, outlets: [] });
  });

  it('setTokens lalu setUser: token TETAP ada (tidak tertimpa)', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    useAuthStore.getState().setUser({
      id: 'u1',
      name: 'Andi',
      email: 'a@b.c',
      role: 'CASHIER',
      tenantId: 't1',
      currentOutletId: 'o1',
      permissions: ['shift.own'],
    });

    const state = readState();
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
    expect(state.user.name).toBe('Andi');
  });

  it('setTokens(access, "") TIDAK menghapus refresh token valid yang sudah ada', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    // Skenario select-outlet: backend hanya mengembalikan access baru, refresh ''.
    useAuthStore.getState().setTokens('access-2', '');

    const state = readState();
    expect(state.accessToken).toBe('access-2');
    expect(state.refreshToken).toBe('refresh-1'); // dipertahankan
  });

  it('setOutlets tidak menyentuh token', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    useAuthStore.getState().setOutlets([{ id: 'o1', name: 'Outlet 1' } as never]);

    const state = readState();
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
    expect(state.outlets).toHaveLength(1);
  });

  it('setCurrentOutlet memperbarui role & permissions pada user, token tetap', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    useAuthStore.getState().setUser({
      id: 'u1',
      name: 'Owner',
      email: 'o@b.c',
      role: 'TENANT_OWNER',
      tenantId: 't1',
      currentOutletId: null,
      permissions: [],
    });
    useAuthStore.getState().setCurrentOutlet('o9', 'STORE_MANAGER', ['staff.manage_local']);

    const state = readState();
    expect(state.user.currentOutletId).toBe('o9');
    expect(state.user.role).toBe('STORE_MANAGER');
    expect(state.user.permissions).toEqual(['staff.manage_local']);
    expect(state.refreshToken).toBe('refresh-1');
  });

  it('clear menghapus token & user (tidak ada kredensial tersisa)', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    useAuthStore.getState().clear();

    // Catatan: persist middleware menulis ulang key dengan state null setelah
    // clear(), jadi key bisa tetap ada — yang penting TIDAK ada token tersisa.
    const state = readState();
    expect(state?.accessToken ?? null).toBeNull();
    expect(state?.refreshToken ?? null).toBeNull();
    expect(state?.user ?? null).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
