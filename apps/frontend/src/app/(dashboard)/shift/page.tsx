'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Clock, DollarSign, CheckCircle, AlertTriangle, RefreshCw, Printer, History } from 'lucide-react';
import { usePageFocus } from '@/hooks/usePageFocus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/features/auth/store';
import { proactiveRefresh } from '@/lib/api';
import { getActiveShift, openShift, closeShift } from '@/features/shifts/api';
import { toastSuccess, errorAlert } from '@/lib/swal';
import { IDR, toNum, formatTimeOnly, formatShiftDuration } from '@/lib/format';
import type { Shift, ShiftCloseSummary } from '@/features/shifts/types';

export default function ShiftPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const isOwner = user?.role === 'TENANT_OWNER';
  const isCashier = user?.role === 'CASHIER';
  const canManageShift = !!user?.permissions.includes('shift.manage');
  const isOwnShift = (shift: Shift | null) => !shift || shift.openedById === user?.id;

  // Owner tidak punya currentOutletId (akses lintas cabang), jadi ia memilih
  // outlet dulu. Non-Owner memakai outlet aktif dari sesi.
  // `selectedOutletId` kosong = "belum memilih" → fallback ke outlet pertama
  // dihitung turunan (derived), tanpa setState di effect.
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const ownerOutletId = selectedOutletId || outlets[0]?.id || '';
  const outletId = isOwner ? ownerOutletId : (user?.currentOutletId ?? '');

  const [shift, setShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form open shift
  const [openingCash, setOpeningCash] = useState('');
  const [openNotes, setOpenNotes] = useState('');

  // Form close shift
  const [closingCash, setClosingCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closedShift, setClosedShift] = useState<Shift | null>(null);

  const loadShift = useCallback(async () => {
    // Tidak ada outlet terpilih: tidak ada yang dimuat. "Loading" ditangani
    // turunan di render (lihat isLoadingView), jadi tak perlu setState sinkron.
    if (!outletId) return;
    setIsLoading(true);
    proactiveRefresh().catch(() => {});
    try {
      const data = await getActiveShift(outletId);
      setShift(data);
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => { loadShift(); }, [loadShift]);
  usePageFocus(loadShift);

  // Spinner hanya saat benar-benar memuat outlet yang valid. Bila Owner belum
  // punya outlet sama sekali, jangan spinner (akan tampil pesan di bawah).
  const isLoadingView = isLoading && !!outletId;

  async function handleOpen() {
    const cash = parseInt(openingCash.replace(/\D/g, ''), 10);
    if (!cash || cash < 0) { setError('Masukkan jumlah kas awal yang valid'); return; }
    setIsPending(true);
    setError(null);
    try {
      const data = await openShift({ outletId, openingCash: cash, notes: openNotes || undefined });
      setShift(data);
      setOpeningCash('');
      setOpenNotes('');
      toastSuccess('Shift berhasil dibuka');
    } catch (e: unknown) {
      errorAlert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal membuka shift');
    } finally {
      setIsPending(false);
    }
  }

  async function handleClose() {
    if (!shift) return;
    const cash = parseInt(closingCash.replace(/\D/g, ''), 10);
    if (cash === undefined || cash < 0 || isNaN(cash)) { setError('Masukkan jumlah kas fisik yang valid'); return; }
    setIsPending(true);
    setError(null);
    try {
      const data = await closeShift(shift.id, { closingCash: cash, notes: closeNotes || undefined });
      setClosedShift(data);
      setShift(null);
      setClosingCash('');
      setCloseNotes('');
      toastSuccess('Shift berhasil ditutup');
    } catch (e: unknown) {
      errorAlert((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menutup shift');
    } finally {
      setIsPending(false);
    }
  }

  if (isLoadingView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Tampilan hasil tutup shift
  if (closedShift) {
    // Penjualan tunai (totalCashIn) hanya ada di summary, bukan field top-level.
    const closeSummary = closedShift.summary as ShiftCloseSummary | undefined;
    const diff = toNum(closedShift.cashDifference);
    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6">
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-8 text-center space-y-3 print:hidden shadow-sm">
          <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Shift Ditutup</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Berikut rekap shift Anda hari ini</p>
        </div>

        {/* print-root + print-area: blok rekap ini yang tercetak (globals.css). */}
        <div className="print-root print-area bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 divide-y divide-gray-100/50 dark:divide-gray-700/30 shadow-sm">
          {/* Header hanya tampil saat cetak — beri konteks outlet & kasir di kertas. */}
          <div className="hidden print:block px-6 pt-5 pb-3 text-center">
            <p className="font-bold text-base">{closedShift.outlet?.name ?? 'Outlet'}</p>
            <p className="text-xs text-gray-500 mt-0.5">Rekap Tutup Shift</p>
          </div>
          {[
            ['Kasir', closedShift.openedBy?.name ?? '-'],
            ['Waktu Tutup', closedShift.closedAt ? formatTimeOnly(closedShift.closedAt) : '-'],
            ['Kas Awal', IDR.format(toNum(closedShift.openingCash))],
            ['Total Penjualan Tunai', IDR.format(toNum(closeSummary?.totalCashIn))],
            ['Kas Diharapkan', IDR.format(toNum(closedShift.expectedCash))],
            ['Kas Fisik (input)', IDR.format(toNum(closedShift.closingCash))],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between px-6 py-4 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{label}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{val}</span>
            </div>
          ))}
          <div className="flex justify-between px-6 py-4">
            <span className="font-bold text-gray-900 dark:text-gray-100">Selisih Kas</span>
            <span className={`text-lg font-black ${diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {diff > 0 ? '+' : ''}{IDR.format(diff)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 print:hidden">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex-1 h-12 rounded-xl gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak Rekap
          </Button>
          <Button onClick={() => { setClosedShift(null); loadShift(); }} className="flex-1 h-12 rounded-xl">
            Buka Shift Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Manajemen Shift
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-4">Buka dan tutup shift kasir dengan pencatatan kas</p>
        </div>
        {canManageShift && (
          <Link href="/shift/history">
            <Button variant="outline" className="rounded-xl gap-2 shrink-0">
              <History className="w-4 h-4" /> Riwayat
            </Button>
          </Link>
        )}
      </div>

      {/* Owner: pilih outlet karena tidak terikat satu cabang */}
      {isOwner && (
        outlets.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Belum ada outlet yang bisa dikelola. Tambahkan outlet terlebih dahulu.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="outlet-select">Outlet</Label>
            <select
              id="outlet-select"
              value={ownerOutletId}
              onChange={(e) => setSelectedOutletId(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-gray-100 transition-all"
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Tidak ada shift aktif — form buka shift */}
      {!shift && (
        <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-6 space-y-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shadow-sm">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Tidak Ada Shift Aktif</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Buka shift untuk mulai menerima transaksi</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="opening-cash">Kas Awal (Modal)</Label>
              <Input
                id="opening-cash"
                inputMode="numeric"
                placeholder="Contoh: 500000"
                value={openingCash ? IDR.format(parseInt(openingCash.replace(/\D/g, ''), 10) || 0) : ''}
                onChange={(e) => setOpeningCash(e.target.value.replace(/\D/g, ''))}
                className="h-12 text-lg font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="open-notes">Catatan (opsional)</Label>
              <Input
                id="open-notes"
                placeholder="Misal: Shift pagi, kasir Budi"
                value={openNotes}
                onChange={(e) => setOpenNotes(e.target.value)}
              />
            </div>
            <Button
              onClick={handleOpen}
              disabled={isPending || !openingCash}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Membuka Shift...
                </span>
              ) : 'Buka Shift Sekarang'}
            </Button>
          </div>
        </div>
      )}

      {/* Ada shift aktif — info shift */}
      {shift && (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-300">Shift Sedang Berjalan</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Dibuka {formatTimeOnly(shift.openedAt)} · {formatShiftDuration(shift.openedAt)} yang lalu</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={loadShift}
                title="Muat ulang"
                className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <Separator className="border-emerald-200" />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Dibuka oleh</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{shift.openedBy?.name ?? '-'}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40 shadow-sm">
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Kas Awal</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{IDR.format(toNum(shift.openingCash))}</p>
              </div>
            </div>
          </div>

          {/* Kasir hanya bisa tutup shift miliknya sendiri */}
          {isCashier && !isOwnShift(shift) ? (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-5 py-4 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Shift bukan milik Anda</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                  Shift ini dibuka oleh <span className="font-semibold">{shift.openedBy?.name ?? 'kasir lain'}</span>.
                  Hanya kasir yang membuka shift atau Manager yang dapat menutupnya.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shadow-sm">
                  <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Tutup Shift</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Hitung kas fisik di laci kasir</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="closing-cash">Kas Fisik (uang di laci)</Label>
                  <Input
                    id="closing-cash"
                    inputMode="numeric"
                    placeholder="Hitung uang di laci kasir"
                    value={closingCash ? IDR.format(parseInt(closingCash.replace(/\D/g, ''), 10) || 0) : ''}
                    onChange={(e) => setClosingCash(e.target.value.replace(/\D/g, ''))}
                    className="h-12 text-lg font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="close-notes">Catatan (opsional)</Label>
                  <Input
                    id="close-notes"
                    placeholder="Misal: Tidak ada selisih"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleClose}
                  disabled={isPending || !closingCash}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 font-bold"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      Menutup Shift...
                    </span>
                  ) : 'Tutup Shift & Hitung Selisih'}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
