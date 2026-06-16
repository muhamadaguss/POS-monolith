'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, ArrowRight, PackageOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  TRANSFER_STATUS_META,
  displayTransferNo,
  roleLabel,
  type StockTransfer,
  type TransferListResult,
  type TransferStatus,
} from '@/features/inventory/transfers';
import { CreateTransferDialog } from './components/CreateTransferDialog';
import { ProcessTransferDialog } from './components/ProcessTransferDialog';

type ProcessAction = 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface OutletOpt {
  id: string;
  name: string;
}

const STATUS_OPTIONS: { value: '' | TransferStatus; label: string }[] = [
  { value: '', label: 'Semua Status' },
  { value: 'PENDING', label: 'Diproses' },
  { value: 'APPROVED', label: 'Diterima' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

const DATE_FMT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function StatusBadge({ status }: { status: TransferStatus }) {
  const m = TRANSFER_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${m.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function TransfersView({
  data,
  isOwner,
  currentUserId,
  currentOutletId,
  outlets,
  filters,
}: {
  data: TransferListResult;
  isOwner: boolean;
  currentUserId: string;
  currentOutletId: string | null;
  outlets: OutletOpt[];
  filters: { outlet: string; status: string; search: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(filters.search);
  const [showCreate, setShowCreate] = useState(false);
  const [processTarget, setProcessTarget] = useState<{
    transfer: StockTransfer;
    action: ProcessAction;
  } | null>(null);

  const { items, meta } = data;
  const myOutletIds = outlets.map((o) => o.id);

  /** Tulis filter ke URL → Server Component refetch (reset ke page 1). */
  function setParam(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (!('page' in patch)) params.delete('page');
    startTransition(() => router.push(`/transfers?${params}`));
  }

  function goPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    startTransition(() => router.push(`/transfers?${params}`));
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setParam({ search: searchInput.trim() });
  }

  /** Aksi yang boleh untuk satu transfer sesuai status & peran. */
  function actionsFor(t: StockTransfer): ProcessAction[] {
    if (t.status !== 'PENDING') return [];
    const acts: ProcessAction[] = [];
    if (isOwner || myOutletIds.includes(t.toOutlet.id)) acts.push('APPROVED', 'REJECTED');
    if (t.requestedBy?.id === currentUserId) acts.push('CANCELLED');
    return acts;
  }

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transfer Stok</h1>
          <p className="text-sm text-gray-500">Pindahkan stok antar cabang dengan persetujuan.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4" />
          Ajukan Transfer
        </Button>
      </div>

      {/* Toolbar: cari + filter status (+ cabang utk Owner) */}
      <div className="flex items-center gap-2 flex-wrap">
        <form onSubmit={submitSearch} className="relative flex-1 min-w-[16rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari produk atau ID Transfer…"
            className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-700"
          />
        </form>
        <select
          aria-label="Filter status"
          value={filters.status}
          onChange={(e) => setParam({ status: e.target.value })}
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {isOwner && outlets.length > 0 && (
          <select
            aria-label="Filter cabang"
            value={filters.outlet}
            onChange={(e) => setParam({ outlet: e.target.value })}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            <option value="">Semua Cabang</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tabel */}
      <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden ${isPending ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">ID Transfer &amp; Tanggal</th>
                <th className="px-5 py-3 font-medium">Rute Cabang</th>
                <th className="px-5 py-3 font-medium">Ringkasan Produk</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Pemohon</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <PackageOpen className="w-10 h-10 text-gray-200 mb-2" />
                      <p className="font-semibold text-gray-900">Belum ada transfer</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Ajukan transfer untuk memindahkan stok antar cabang.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((t) => {
                  const acts = actionsFor(t);
                  const totalUnit = t.items.reduce((s, i) => s + i.quantity, 0);
                  return (
                    <tr key={t.id} className="border-b border-gray-50 last:border-0 align-top">
                      <td className="px-5 py-4">
                        <p className="font-mono font-semibold text-emerald-600">
                          {displayTransferNo(t)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {DATE_FMT.format(new Date(t.requestedAt))}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{t.fromOutlet.name}</p>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">Asal</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                          <div>
                            <p className="font-medium text-gray-900">{t.toOutlet.name}</p>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">
                              Tujuan
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">{t.items.length} Items</p>
                        <p className="text-xs text-gray-400">Total: {totalUnit} unit</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">{t.requestedBy?.name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{roleLabel(t.requestedBy?.role)}</p>
                      </td>
                      <td className="px-5 py-4">
                        {acts.length > 0 ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {acts.includes('APPROVED') && (
                              <Button
                                size="sm"
                                onClick={() => setProcessTarget({ transfer: t, action: 'APPROVED' })}
                              >
                                Terima
                              </Button>
                            )}
                            {acts.includes('REJECTED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setProcessTarget({ transfer: t, action: 'REJECTED' })}
                              >
                                Tolak
                              </Button>
                            )}
                            {acts.includes('CANCELLED') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setProcessTarget({ transfer: t, action: 'CANCELLED' })
                                }
                              >
                                Batalkan
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-right text-xs text-gray-300">—</p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer paginasi */}
        {meta.total > 0 && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 flex-wrap">
            <p className="text-xs text-gray-500">
              Menampilkan {from}-{to} dari {meta.total} rekaman transfer.
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={meta.page <= 1}
                onClick={() => goPage(meta.page - 1)}
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-sm text-gray-600 tabular-nums">
                {meta.page} / {meta.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={meta.page >= meta.totalPages}
                onClick={() => goPage(meta.page + 1)}
                aria-label="Berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTransferDialog
          outlets={outlets}
          defaultFromOutletId={currentOutletId ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            startTransition(() => router.refresh());
          }}
        />
      )}

      {processTarget && (
        <ProcessTransferDialog
          transfer={processTarget.transfer}
          action={processTarget.action}
          onClose={() => setProcessTarget(null)}
          onProcessed={() => {
            setProcessTarget(null);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </div>
  );
}
