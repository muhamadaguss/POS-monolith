import type React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PosSidebar } from './PosSidebar';
import { setMockSession, mockUseSession } from '@/test/session';

vi.mock('next-auth/react', () => ({ useSession: () => mockUseSession() }));

// next/navigation: usePathname menentukan link mana yang "active".
const pathname = { current: '/pos' };
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

// next/link → <a> biasa yang menahan default klik, agar tidak memicu jsdom
// "Not implemented: navigation" namun onClick (onNavigate) tetap berjalan.
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  ),
}));

// useLogout: cukup spy fungsi logout-nya.
const logoutSpy = vi.fn();
vi.mock('@/features/auth/hooks', () => ({
  useLogout: () => ({ logout: logoutSpy }),
}));

function seedCashier() {
  setMockSession({
    user: {
      id: 'u1',
      name: 'Andi Kasir',
      email: 'andi@toko.id',
      role: 'CASHIER',
      tenantId: 't1',
      currentOutletId: 'o1',
      permissions: ['shift.own'],
    },
    outlets: [{ id: 'o1', name: 'Cabang Senayan', role: 'CASHIER', permissions: ['shift.own'] }],
  });
}

describe('PosSidebar', () => {
  beforeEach(() => {
    pathname.current = '/pos';
    logoutSpy.mockReset();
    seedCashier();
  });

  it('menampilkan ketiga menu kasir + nama outlet + identitas user', () => {
    render(<PosSidebar />);

    expect(screen.getByText('Cashier')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Shift')).toBeInTheDocument();
    expect(screen.getByText('Cabang Senayan')).toBeInTheDocument();
    expect(screen.getByText('Andi Kasir')).toBeInTheDocument();
    expect(screen.getByText('andi@toko.id')).toBeInTheDocument();
    // Inisial dari getInitials('Andi Kasir')
    expect(screen.getByText('AK')).toBeInTheDocument();
  });

  it('menandai link aktif sesuai pathname (exact untuk /pos)', () => {
    pathname.current = '/pos/transactions';
    render(<PosSidebar />);

    // History aktif → punya kelas emerald aktif; Cashier (exact) tidak.
    const history = screen.getByText('History').closest('a')!;
    const cashier = screen.getByText('Cashier').closest('a')!;
    expect(history.className).toContain('emerald');
    expect(cashier.className).not.toContain('bg-emerald-100');
  });

  it('klik Logout memanggil useLogout().logout', async () => {
    render(<PosSidebar />);
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(logoutSpy).toHaveBeenCalledTimes(1);
  });

  it('onNavigate dipanggil saat link ditekan (untuk menutup drawer mobile)', async () => {
    const onNavigate = vi.fn();
    render(<PosSidebar onNavigate={onNavigate} />);
    await userEvent.click(screen.getByText('History'));
    expect(onNavigate).toHaveBeenCalled();
  });
});
