'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Pencil,
  Store,
  MapPin,
  Loader2,
  CheckCircle2,
  Receipt,
  ListFilter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Power,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/store';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePageFocus } from '@/hooks/usePageFocus';
import { listOutlets, createOutlet, updateOutlet, apiErrorMessage } from '@/features/outlets/api';
import { toastSuccess, errorAlert, confirmDialog } from '@/lib/swal';
import type { Outlet } from '@/features/outlets/types';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
const PAGE_SIZE = 10;

// Warna avatar inisial berdasarkan nama outlet — deterministik agar tetap konsisten.
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function OutletsPageInner() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.permissions?.includes('outlet.manage') ?? false;

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setOutlets(await listOutlets());
    } catch {
      // 401 ditangani interceptor.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  usePageFocus(load);

  // Statistik ringkas dari seluruh data (tidak terpengaruh filter/pagination).
  const stats = useMemo(() => {
    const total = outlets.length;
    const active = outlets.filter((o) => o.isActive).length;
    const avgTax =
      total === 0 ? 0 : outlets.reduce((s, o) => s + o.taxRate, 0) / total;
    return { total, active, avgTax: avgTax * 100 };
  }, [outlets]);

  const filtered = useMemo(() => {
    if (statusFilter === 'ACTIVE') return outlets.filter((o) => o.isActive);
    if (statusFilter === 'INACTIVE') return outlets.filter((o) => !o.isActive);
    return outlets;
  }, [outlets, statusFilter]);

  // Ganti filter sekaligus reset ke halaman 1 (hindari setState dalam effect).
  function changeFilter(next: StatusFilter) {
    setStatusFilter(next);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  async function toggleActive(o: Outlet) {
    const goActive = !o.isActive;
    const ok = await confirmDialog({
      title: goActive ? 'Aktifkan outlet?' : 'Nonaktifkan outlet?',
      text: goActive
        ? `Outlet "${o.name}" akan diaktifkan kembali.`
        : `Outlet "${o.name}" akan dinonaktifkan dan tidak dapat dipakai bertransaksi.`,
      confirmText: goActive ? 'Ya, aktifkan' : 'Ya, nonaktifkan',
      danger: !goActive,
    });
    if (!ok) return;
    try {
      await updateOutlet(o.id, { isActive: goActive });
      toastSuccess(goActive ? 'Outlet diaktifkan' : 'Outlet dinonaktifkan');
      load();
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal mengubah status outlet.'));
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Outlet</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola cabang/outlet bisnis Anda secara terpusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" onClick={load} title="Muat ulang">
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {canManage && (
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Tambah Outlet
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Store className="w-5 h-5" />}
          tone="neutral"
          tag="Global"
          label="Total Outlet"
          value={String(stats.total)}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="success"
          tag="Running"
          label="Outlet Aktif"
          value={String(stats.active)}
        />
        <StatCard
          icon={<Receipt className="w-5 h-5" />}
          tone="neutral"
          tag="Standard"
          label="Rata-rata Pajak"
          value={`${stats.avgTax.toFixed(1)}%`}
        />
      </div>

      {/* Panel Daftar Cabang */}
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Daftar Cabang</h2>
          <DropdownMenu>
            <DropdownMenuTrigger
              title="Filter status"
              className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                statusFilter !== 'ALL'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ListFilter className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(v) => changeFilter(v as StatusFilter)}
              >
                <DropdownMenuLabel>Filter status</DropdownMenuLabel>
                <DropdownMenuRadioItem value="ALL">Semua</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="ACTIVE">Aktif</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="INACTIVE">Nonaktif</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabel */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/60 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-semibold">Nama Outlet</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Alamat</th>
                <th className="px-5 py-3 font-semibold">Pajak</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && outlets.length === 0 ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-5 py-4" colSpan={5}>
                      <div className="h-8 rounded-lg bg-gray-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">
                      {statusFilter === 'ALL'
                        ? 'Belum ada outlet.'
                        : 'Tidak ada outlet pada filter ini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pageItems.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Nama + avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-semibold ${avatarColor(
                            o.name,
                          )}`}
                        >
                          {initials(o.name) || <Store className="w-5 h-5" />}
                        </div>
                        <span className="font-semibold text-gray-900 truncate">{o.name}</span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          o.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            o.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                        {o.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {/* Alamat */}
                    <td className="px-5 py-4 max-w-xs">
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-300" />
                        <span className="line-clamp-2">
                          {[o.address, o.city].filter(Boolean).join(', ') || 'Alamat belum diisi'}
                        </span>
                      </div>
                    </td>
                    {/* Pajak */}
                    <td className="px-5 py-4 whitespace-nowrap text-gray-600">
                      Pajak {(o.taxRate * 100).toFixed(0)}%
                    </td>
                    {/* Aksi */}
                    <td className="px-5 py-4">
                      {canManage && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => {
                              setEditing(o);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              title="Aksi lain"
                              className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(o);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="size-4" />
                                Edit outlet
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant={o.isActive ? 'destructive' : 'default'}
                                onClick={() => toggleActive(o)}
                              >
                                <Power className="size-4" />
                                {o.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: range + pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Menampilkan {rangeStart}
            {rangeEnd > rangeStart ? `–${rangeEnd}` : ''} dari {filtered.length} outlet
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`flex items-center justify-center min-w-9 h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                    n === safePage
                      ? 'bg-emerald-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {formOpen && (
        <OutletFormDialog
          outlet={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  tone,
  tag,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: 'neutral' | 'success';
  tag: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            tone === 'success'
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {icon}
        </div>
        <span
          className={`text-xs font-medium ${
            tone === 'success' ? 'text-emerald-600' : 'text-gray-400'
          }`}
        >
          {tag}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function OutletFormDialog({
  outlet,
  onClose,
  onSaved,
}: {
  outlet: Outlet | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!outlet;
  const [name, setName] = useState(outlet?.name ?? '');
  const [address, setAddress] = useState(outlet?.address ?? '');
  const [city, setCity] = useState(outlet?.city ?? '');
  const [phone, setPhone] = useState(outlet?.phone ?? '');
  // taxRate disimpan desimal (0.11) tapi diinput sebagai persen (11).
  const [taxPercent, setTaxPercent] = useState(
    outlet ? String(Math.round(outlet.taxRate * 100)) : '11',
  );
  const [receiptNote, setReceiptNote] = useState(outlet?.receiptNote ?? '');
  const [isActive, setIsActive] = useState(outlet?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) return setError('Nama outlet wajib diisi.');
    const taxNum = Number(taxPercent);
    if (!Number.isFinite(taxNum) || taxNum < 0 || taxNum > 100)
      return setError('Pajak harus antara 0 dan 100 persen.');

    setSaving(true);
    try {
      const base = {
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        phone: phone.trim() || undefined,
        taxRate: taxNum / 100,
        receiptNote: receiptNote.trim() || undefined,
      };
      if (isEdit) {
        await updateOutlet(outlet!.id, { ...base, isActive });
        toastSuccess('Outlet berhasil diperbarui');
      } else {
        await createOutlet(base);
        toastSuccess('Outlet berhasil ditambahkan');
      }
      onSaved();
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal menyimpan outlet.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="border-b border-gray-100 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Store className="size-5 text-emerald-600" />
            {isEdit ? 'Edit Outlet' : 'Tambah Outlet'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label htmlFor="o-name" className="mb-2">
              Nama outlet
            </Label>
            <Input id="o-name" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="o-address" className="mb-2">
              Alamat
            </Label>
            <Input
              id="o-address"
              className="h-10"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="o-city" className="mb-2">
                Kota
              </Label>
              <Input id="o-city" className="h-10" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="o-phone" className="mb-2">
                Telepon
              </Label>
              <Input
                id="o-phone"
                className="h-10"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="o-tax" className="mb-2">
                Pajak (%)
              </Label>
              <Input
                id="o-tax"
                type="number"
                min={0}
                max={100}
                className="h-10"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
              />
            </div>
            {isEdit && (
              <div>
                <Label htmlFor="o-active" className="mb-2">
                  Status
                </Label>
                <select
                  id="o-active"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="o-note" className="mb-2">
              Catatan struk (opsional)
            </Label>
            <Input
              id="o-note"
              className="h-10"
              placeholder="Mis. Terima kasih telah berbelanja"
              value={receiptNote}
              onChange={(e) => setReceiptNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button size="lg" onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OutletsPage() {
  return (
    <RequirePermission
      anyOf={['outlet.manage']}
      message="Hanya Owner/Super Admin yang dapat mengelola outlet."
    >
      <OutletsPageInner />
    </RequirePermission>
  );
}
