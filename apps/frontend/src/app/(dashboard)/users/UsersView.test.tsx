import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UsersView } from './UsersView';
import type { StaffMember } from '@/features/users/api';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
// Mock dialog agar test fokus ke tabel/filter (bukan internal dialog).
vi.mock('@/features/users/components', () => ({
  RoleBadge: ({ role }: { role: string }) => <span>{role}</span>,
  StatusDot: ({ status }: { status: string }) => <span>{status}</span>,
  CreateDialog: () => null,
  EditDialog: () => null,
  AssignRoleDialog: () => null,
  DeactivateDialog: () => null,
}));

function member(over: Partial<StaffMember>): StaffMember {
  return {
    id: 'u1',
    name: 'Andi',
    email: 'andi@demo.com',
    phone: null,
    role: 'CASHIER',
    status: 'ACTIVE',
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    outletRoles: [],
    ...over,
  };
}

const STAFF: StaffMember[] = [
  member({ id: 'u1', name: 'Andi Kasir', email: 'andi@demo.com', role: 'CASHIER' }),
  member({ id: 'u2', name: 'Siti Manajer', email: 'siti@demo.com', role: 'STORE_MANAGER' }),
  member({ id: 'u3', name: 'Budi Owner', email: 'budi@demo.com', role: 'TENANT_OWNER' }),
];

function renderView(over?: Partial<Parameters<typeof UsersView>[0]>) {
  return render(
    <UsersView
      staff={STAFF}
      canManageGlobal
      canManageLocal={false}
      outlets={[{ id: 'o1', name: 'Cabang A' }]}
      {...over}
    />,
  );
}

describe('UsersView', () => {
  beforeEach(() => refresh.mockClear());
  afterEach(() => cleanup());

  it('menampilkan daftar staf', () => {
    renderView();
    expect(screen.getByText('Andi Kasir')).toBeInTheDocument();
    expect(screen.getByText('Siti Manajer')).toBeInTheDocument();
  });

  it('filter Kasir hanya menampilkan kasir', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Kasir' }));
    expect(screen.getByText('Andi Kasir')).toBeInTheDocument();
    expect(screen.queryByText('Siti Manajer')).not.toBeInTheDocument();
  });

  it('pencarian memfilter berdasarkan nama/email', () => {
    renderView();
    fireEvent.change(screen.getByPlaceholderText('Cari nama atau email staf...'), {
      target: { value: 'siti' },
    });
    expect(screen.getByText('Siti Manajer')).toBeInTheDocument();
    expect(screen.queryByText('Andi Kasir')).not.toBeInTheDocument();
  });

  it('tanpa manage_global: Owner disembunyikan & tombol Tambah tidak muncul', () => {
    renderView({ canManageGlobal: false, canManageLocal: true });
    expect(screen.queryByText('Budi Owner')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tambah Karyawan/ })).not.toBeInTheDocument();
  });

  it('tombol refresh memanggil router.refresh', () => {
    renderView();
    fireEvent.click(screen.getByTitle('Refresh'));
    expect(refresh).toHaveBeenCalled();
  });
});
