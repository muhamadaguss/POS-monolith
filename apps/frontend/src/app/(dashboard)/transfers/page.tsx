'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, RefreshCw, Plus, PackageOpen, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore, useAuthHydrated } from '@/features/auth/store';
import { listTransfers, type StockTransfer, type TransferStatus } from '@/features/inventory/transfers';
import { CreateTransferDialog } from './components/CreateTransferDialog';
import { ProcessTransferDialog } from './components/ProcessTransferDialog';

/** Aksi yang dipilih untuk diproses (terima/tolak/batalkan). */
type ProcessAction = 'APPROVED' | 'REJECTED' | 'CANCELLED';

const STATUS_META: Record<TransferStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Diterima', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Ditolak', cls: 'bg-red-100 text-red-600' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-500' },
};

function StatusBadge({ status }: { status: TransferStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${m.cls}`}>
      {m.label}
    </span>
  );
}

const DATE_FMT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
function fmtDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

export default function TransfersPage() {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);

  const role = user?.role;
  const permissions = user?.permissions ?? [];
  const canTransfer = permissions.includes('inventory.transfer');
  const isOwner = role === 'TENANT_OWNER';

  // outlet yang dapat saya proses (terima/tolak) = yang saya pegang. Owner: semua.
  const myOutletIds = outlets.map((o) => o.id);

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outletFilter, setOutletFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [processTarget, setProcessTarget] = useState<{
    transfer: StockTransfer;
    action: ProcessAction;
  } | null>(null);

  const load = useCallback(async () => {
    if (!canTransfer) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await listTransfers(outletFilter || undefined);
      setTransfers(data);
    } catch {
      setTransfers([]);
    } finally {
      setIsLoading(false);
    }
  }, [canTransfer, outletFilter]);

  useEffect(() => {
    if (!hydrated) return;
    load();
  }, [hydrated, load]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!canTransfer) {
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

  /** Aksi yang boleh ditampilkan untuk satu transfer sesuai status & peran. */
  function actionsFor(t: StockTransfer): ProcessAction[] {
    if (t.status !== 'PENDING') return [];
    const acts: ProcessAction[] = [];
    // Terima/Tolak: hanya bila saya pegang outlet TUJUAN (Owner: selalu).
    if (isOwner || myOutletIds.includes(t.toOutlet.id)) {
      acts.push('APPROVED', 'REJECTED');
    }
    // Batalkan: hanya pengaju.
    if (t.requestedBy?.id === user?.id) {
      acts.push('CANCELLED');
    }
    return acts;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Transfer Stok</h1>
            <p className="text-sm text-gray-500">Pindahkan stok antar cabang dengan persetujuan.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && outlets.length > 0 && (
            <select
              aria-label="Filter cabang"
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
            >
              <option value="">Semua Cabang</option>
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" size="icon-lg" onClick={load} title="Muat ulang">
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="size-4" />
            Ajukan Transfer
          </Button>
        </div>
      </div>

      {/* Daftar */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transfers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-gray-200 bg-white">
          <PackageOpen className="w-12 h-12 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-900">Belum ada transfer</p>
          <p className="text-sm text-gray-500 mt-1">
            Ajukan transfer untuk memindahkan stok antar cabang.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((t) => {
            const acts = actionsFor(t);
            const totalQty = t.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <div
                key={t.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{t.fromOutlet.name}</span>
                    <ArrowLeftRight className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-semibold text-gray-900">{t.toOutlet.name}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.items.length} produk · {totalQty} unit · diajukan {t.requestedBy?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(t.requestedAt)}
                    {t.processedAt && t.approvedBy
                      ? ` · diproses ${t.approvedBy.name}, ${fmtDate(t.processedAt)}`
                      : ''}
                  </p>
                  {t.note && <p className="text-xs text-gray-500 mt-1 italic">“{t.note}”</p>}
                </div>

                {acts.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
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
                        onClick={() => setProcessTarget({ transfer: t, action: 'CANCELLED' })}
                      >
                        Batalkan
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateTransferDialog
          outlets={outlets}
          defaultFromOutletId={user?.currentOutletId ?? ''}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
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
            load();
          }}
        />
      )}
    </div>
  );
}
