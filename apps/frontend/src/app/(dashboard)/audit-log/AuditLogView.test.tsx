import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AuditLogView } from './AuditLogView';
import type { AuditLog, AuditLogResult } from '@/features/audit-logs/api';

// View mengubah URL (router.push/refresh) — bukan fetch.
const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }) }));

const META: AuditLogResult['meta'] = { total: 1, page: 1, limit: 50, totalPages: 1 };

const LOG: AuditLog = {
  id: 'a1',
  tenantId: 't1',
  userId: 'u1',
  userName: 'Budi',
  action: 'LOGIN',
  resource: 'auth',
  ipAddress: '127.0.0.1',
  oldValue: null,
  newValue: null,
  createdAt: '2026-06-11T03:00:00.000Z',
};

function renderView(overrides?: Partial<Parameters<typeof AuditLogView>[0]>) {
  return render(
    <AuditLogView logs={[LOG]} meta={META} activeFilter="Semua" page={1} {...overrides} />,
  );
}

describe('AuditLogView (mengubah URL searchParams)', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });
  afterEach(() => cleanup());

  it('menampilkan baris log (pengguna, aktivitas, IP)', () => {
    renderView();
    expect(screen.getByText('Budi')).toBeInTheDocument();
    expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
  });

  it('klik filter pill mendorong ?filter= ke URL', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Login gagal' }));
    expect(push).toHaveBeenCalledWith(expect.stringContaining('filter=Login+gagal'));
  });

  it('filter Semua tidak menambah param filter', () => {
    renderView({ activeFilter: 'Login' });
    fireEvent.click(screen.getByRole('button', { name: 'Semua' }));
    expect(push).toHaveBeenCalledWith('/audit-log');
  });

  it('klik detail membuka dialog dengan rincian', () => {
    renderView();
    fireEvent.click(screen.getByTitle('Lihat detail'));
    expect(screen.getByText('Detail Aktivitas')).toBeInTheDocument();
  });

  it('tombol refresh memanggil router.refresh', () => {
    const { container } = renderView();
    const refreshBtn = container.querySelector('button');
    fireEvent.click(refreshBtn!);
    // tombol pertama = refresh (di header)
    expect(refresh).toHaveBeenCalled();
  });
});
