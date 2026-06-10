'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Eye,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Ban,
  Package,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { usePageFocus } from '@/hooks/usePageFocus';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { proactiveRefresh } from '@/lib/api';
import { getAuditLogs } from '@/features/audit-logs/api';
import type { AuditLog, AuditLogResult } from '@/features/audit-logs/api';
import {
  actionMeta,
  toneClass,
  resourceLabel,
  fieldLabel,
  displayValue,
  type ActionMeta,
} from '@/features/audit-logs/format';
import { formatDateTimeLong } from '@/lib/format';

const ICON_MAP: Record<ActionMeta['icon'], React.ElementType> = {
  login: LogIn,
  logout: LogOut,
  alert: AlertTriangle,
  plus: Plus,
  edit: Pencil,
  trash: Trash2,
  void: Ban,
  box: Package,
  activity: Activity,
};

// Filter ramah → daftar action mentah yang dicocokkan (backend pakai "contains").
const FILTERS: { label: string; match?: string }[] = [
  { label: 'Semua' },
  { label: 'Login', match: 'LOGIN' },
  { label: 'Login gagal', match: 'LOGIN_FAILED' },
  { label: 'Pembatalan', match: 'VOID' },
  { label: 'Penghapusan', match: 'DELETE' },
  { label: 'Penyesuaian stok', match: 'STOCK' },
];

const PAGE_SIZE = 50;

function ActionBadge({ action, resource }: { action: string; resource?: string | null }) {
  const meta = actionMeta(action, resource);
  const Icon = ICON_MAP[meta.icon];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${toneClass(
        meta.tone,
      )}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

/** Tabel perubahan "Sebelum → Sesudah" yang dibaca manusia. */
function ChangeTable({
  oldValue,
  newValue,
}: {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const keys = Array.from(
    new Set([...Object.keys(oldValue ?? {}), ...Object.keys(newValue ?? {})]),
  );
  if (keys.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">Tidak ada rincian perubahan untuk aktivitas ini.</p>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <th className="px-4 py-2 font-medium">Detail</th>
            <th className="px-4 py-2 font-medium">Sebelum</th>
            <th className="px-4 py-2 font-medium"></th>
            <th className="px-4 py-2 font-medium">Sesudah</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const before = oldValue?.[k];
            const after = newValue?.[k];
            const changed = JSON.stringify(before) !== JSON.stringify(after);
            return (
              <tr key={k} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-700">{fieldLabel(k)}</td>
                <td className="px-4 py-2 text-gray-500">{displayValue(before)}</td>
                <td className="px-4 py-2 text-gray-300">
                  {changed && <ArrowRight className="w-4 h-4" />}
                </td>
                <td
                  className={`px-4 py-2 ${changed ? 'font-semibold text-emerald-700' : 'text-gray-500'}`}
                >
                  {displayValue(after)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditLogResult['meta'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterLabel, setFilterLabel] = useState('Semua');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const load = useCallback(async (label: string, pageArg: number) => {
    await proactiveRefresh().catch(() => {});
    setIsLoading(true);
    try {
      const match = FILTERS.find((f) => f.label === label)?.match;
      const result = await getAuditLogs({ action: match, page: pageArg, limit: PAGE_SIZE });
      setLogs(result.items);
      setMeta(result.meta);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filterLabel, page);
  }, [load, filterLabel, page]);
  usePageFocus(() => load(filterLabel, page));

  function handleFilter(label: string) {
    setFilterLabel(label);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Aktivitas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Catatan siapa melakukan apa, kapan, dan dari mana.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(filterLabel, page)}
          disabled={isLoading}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter ramah */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => handleFilter(f.label)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterLabel === f.label
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Waktu</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Pengguna</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Aktivitas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">Objek</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400">IP</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <ShieldAlert className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Belum ada aktivitas tercatat</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTimeLong(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {log.userName ?? 'Sistem'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionBadge action={log.action} resource={log.resource} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{resourceLabel(log.resource)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelected(log)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Lihat detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && meta && meta.total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500 bg-gray-50">
            <span>
              Menampilkan {(meta.page - 1) * meta.limit + 1}–
              {Math.min(meta.page * meta.limit, meta.total)} dari{' '}
              {meta.total.toLocaleString('id-ID')} entri
            </span>
            {meta.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="tabular-nums">
                  Hal {meta.page} / {meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Dialog — ramah, bukan JSON mentah */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && <ActionBadge action={selected.action} resource={selected.resource} />}
              Detail Aktivitas
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Waktu', formatDateTimeLong(selected.createdAt)],
                  ['Pengguna', selected.userName ?? 'Sistem'],
                  ['Objek', resourceLabel(selected.resource)],
                  ['Alamat IP', selected.ipAddress ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                    <p className="font-medium text-gray-900 break-all">{v}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Perubahan</p>
                <ChangeTable oldValue={selected.oldValue} newValue={selected.newValue} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
