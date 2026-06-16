import { ShieldAlert } from 'lucide-react';
import { verifySession } from '@/lib/session';
import { fetchTransfers } from '@/features/inventory/server';
import type { TransferStatus } from '@/features/inventory/transfers';
import { TransfersView } from './TransfersView';

const VALID_STATUS: TransferStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const PAGE_SIZE = 10;

interface SearchParams {
  outlet?: string;
  status?: string;
  search?: string;
  page?: string;
}

/**
 * Transfer Stok antar-outlet — Server Component. Daftar di-fetch via
 * `serverFetch`; filter (cabang/status/cari) & paginasi lewat URL searchParams.
 * Interaktivitas (filter, dialog ajukan/proses) di TransfersView (client) yang
 * memanggil Server Actions. Akses: permission `inventory.transfer`.
 */
export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const user = session.user;

  if (!user.permissions?.includes('inventory.transfer')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          Anda tidak memiliki izin untuk mengelola transfer stok.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const isOwner = user.role === 'TENANT_OWNER';
  const status = VALID_STATUS.includes(sp.status as TransferStatus)
    ? (sp.status as TransferStatus)
    : undefined;
  const search = sp.search?.trim() || undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  // Hanya Owner yang boleh memfilter per-cabang lewat URL; Manajer dibatasi backend.
  const outlet = isOwner ? sp.outlet || undefined : undefined;

  const result = await fetchTransfers({ outletId: outlet, status, search, page, limit: PAGE_SIZE });

  return (
    <TransfersView
      data={result}
      isOwner={isOwner}
      currentUserId={user.id}
      currentOutletId={user.currentOutletId ?? null}
      outlets={session.outlets.map((o) => ({ id: o.id, name: o.name }))}
      filters={{ outlet: outlet ?? '', status: status ?? '', search: search ?? '' }}
    />
  );
}
