import { describe, it, expect, beforeEach } from 'vitest';
import { api, setApiAccessToken, getRefreshToken, proactiveRefresh } from './api';

/**
 * lib/api kini MINIMAL: token disuntik dari session Auth.js (lewat setApiAccessToken),
 * envelope di-unwrap, 401 → redirect. Mesin refresh manual (single-flight, cross-tab,
 * localStorage) sudah DIHAPUS — refresh ditangani Auth.js di server.
 */
describe('lib/api', () => {
  beforeEach(() => setApiAccessToken(null));

  it('request interceptor menyuntik Bearer dari token yang di-set', async () => {
    setApiAccessToken('tok-123');
    const handlers = (api.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (c: { headers: Record<string, string> }) => { headers: Record<string, string> } }>;
    }).handlers;
    const cfg = handlers[0].fulfilled({ headers: {} });
    expect(cfg.headers['Authorization']).toBe('Bearer tok-123');
  });

  it('tanpa token: tidak menyuntik Authorization', () => {
    setApiAccessToken(null);
    const handlers = (api.interceptors.request as unknown as {
      handlers: Array<{ fulfilled: (c: { headers: Record<string, string> }) => { headers: Record<string, string> } }>;
    }).handlers;
    const cfg = handlers[0].fulfilled({ headers: {} });
    expect(cfg.headers['Authorization']).toBeUndefined();
  });

  it('response interceptor meng-unwrap envelope { success, data }', () => {
    const handlers = (api.interceptors.response as unknown as {
      handlers: Array<{ fulfilled: (r: { data: unknown }) => { data: unknown } }>;
    }).handlers;
    const res = handlers[0].fulfilled({ data: { success: true, data: { foo: 'bar' } } });
    expect(res.data).toEqual({ foo: 'bar' });
  });

  describe('compat shims (dipensiunkan)', () => {
    it('getRefreshToken selalu null (refresh token server-only)', () => {
      expect(getRefreshToken()).toBeNull();
    });

    it('proactiveRefresh no-op (tidak melempar)', async () => {
      await expect(proactiveRefresh()).resolves.toBeUndefined();
    });
  });
});
