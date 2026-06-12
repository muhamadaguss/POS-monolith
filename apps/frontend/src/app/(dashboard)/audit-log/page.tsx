import { ShieldAlert } from 'lucide-react';
import { verifySession, serverFetch } from '@/lib/session';
import type { AuditLogResult } from '@/features/audit-logs/api';
import { FILTERS } from '@/features/audit-logs/format';
import { AuditLogView } from './AuditLogView';

const PAGE_SIZE = 50;

interface SearchParams {
  filter?: string;
  page?: string;
}

/**
 * Riwayat Aktivitas (audit log) — Server Component.
 *
 * Data di-fetch di server via DAL (serverFetch). Filter (pill) & halaman = URL
 * searchParams. Bagian interaktif (pill, pagination, dialog detail) di AuditLogView
 * (Client Component) yang menerima data sebagai props.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  // RBAC (selaras backend: report.view atau staff.manage_global — Owner/Super Admin).
  // Tampilkan "Akses Ditolak" inline alih-alih error boundary 403.
  const perms = session.user.permissions ?? [];
  if (!perms.includes('report.view') && !perms.includes('staff.manage_global')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hanya Owner atau Super Admin yang dapat melihat riwayat aktivitas.
        </p>
      </div>
    );
  }

  const sp = await searchParams;

  const filterLabel = sp.filter && FILTERS.some((f) => f.label === sp.filter) ? sp.filter : 'Semua';
  const match = FILTERS.find((f) => f.label === filterLabel)?.match;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const params = new URLSearchParams();
  if (match) params.set('action', match);
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));

  const result = await serverFetch<AuditLogResult>(`/audit-logs?${params.toString()}`);

  return (
    <AuditLogView
      logs={result.items}
      meta={result.meta}
      activeFilter={filterLabel}
      page={page}
    />
  );
}
