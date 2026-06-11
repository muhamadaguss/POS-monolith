'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Clock,
  Menu,
  TrendingUp,
  X,
  Shield,
  Printer,
  AlertTriangle,
  CheckCircle,
  Info,
  PlayCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/features/auth/store';
import { PosSidebar } from '@/features/pos/components/PosSidebar';
import { getActiveShift, openShift, closeShift } from '@/features/shifts/api';
import { toastSuccess, errorAlert } from '@/lib/swal';
import { IDR, NUM, formatIDR, formatTimeOnly } from '@/lib/format';
import type { Shift, ShiftActiveSummary, ShiftCloseSummary } from '@/features/shifts/types';

// Format uang: pakai helper terpusat. `fmt` dipertahankan sebagai alias lokal
// karena dipanggil belasan kali di JSX.
const fmt = formatIDR;

// Jam dengan akhiran " WIB" — varian khusus halaman ini.
function formatTime(iso: string) {
  return `${formatTimeOnly(iso)} WIB`;
}

function useDuration(openedAt: string | null) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!openedAt) return;
    const tick = () => {
      const ms = Date.now() - new Date(openedAt).getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setLabel(h > 0 ? `${h}j ${m}m` : `${m}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [openedAt]);
  return label;
}

/* ── Modal Tutup Shift ─────────────────────────────────────────── */
function CloseShiftModal({
  onConfirm,
  onCancel,
  isPending,
  error,
}: {
  onConfirm: (closingCash: number, notes: string) => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const cashNum = parseInt(closingCash.replace(/\D/g, ''), 10) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Tutup Shift</h3>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCancel}
            title="Tutup"
            className="text-gray-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-700">Kas Fisik di Laci</Label>
            <input
              ref={inputRef}
              inputMode="numeric"
              placeholder="Hitung uang di laci kasir"
              value={cashNum > 0 ? IDR.format(cashNum) : ''}
              onChange={(e) => setClosingCash(e.target.value.replace(/\D/g, ''))}
              className="w-full h-12 px-4 text-lg font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-gray-700">Catatan <span className="text-gray-400 font-normal">(opsional)</span></Label>
            <input
              placeholder="Misal: Tidak ada selisih"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-10 px-4 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onConfirm(cashNum, notes)}
            disabled={isPending || !cashNum}
            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menutup...</>
            ) : 'Konfirmasi Tutup Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Cetak Ringkasan ─────────────────────────────────────── */
function PrintModal({
  shift,
  summary,
  onClose,
}: {
  shift: Shift;
  summary: ShiftActiveSummary;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Printer className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Ringkasan Shift</h3>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Tutup"
            className="text-gray-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* print-root + print-area: hanya blok ini yang tercetak (globals.css). */}
        <div className="print-root print-area px-6 py-4 space-y-1 font-mono text-sm">
          <p className="text-center font-bold text-base mb-3">{shift.outlet?.name ?? 'Outlet'}</p>
          <div className="border-t border-dashed border-gray-300 my-2" />
          {[
            ['Kasir', shift.openedBy?.name ?? '-'],
            ['Waktu Buka', formatTime(shift.openedAt)],
            ['Kas Awal', fmt(shift.openingCash)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-300 my-2" />
          {[
            ['Total Transaksi', `${summary.totalTransactions} trx`],
            ['Total Penjualan', fmt(summary.totalSales)],
            ['Penjualan Tunai', fmt(summary.totalCash)],
            ['Non-Tunai', fmt(summary.totalNonCash)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <p className="text-center text-gray-400 text-xs mt-2">Shift masih berjalan — cetak setelah tutup untuk hasil final</p>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => window.print()}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal Rekap Setelah Tutup ─────────────────────────────────── */
function CloseRekapModal({
  shift,
  onClose,
}: {
  shift: Shift & { summary?: ShiftCloseSummary };
  onClose: () => void;
}) {
  const summary = shift.summary as ShiftCloseSummary | undefined;
  const diff = Number(summary?.cashDifference ?? shift.cashDifference ?? 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Printer className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Rekap Shift</h3>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            title="Tutup"
            className="text-gray-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* print-root + print-area: hanya blok ini yang tercetak (globals.css). */}
        <div className="print-root print-area px-6 py-4 space-y-1 font-mono text-sm">
          <p className="text-center font-bold text-base mb-3">{shift.outlet?.name ?? 'Outlet'}</p>
          <div className="border-t border-dashed border-gray-300 my-2" />
          {[
            ['Kasir', shift.openedBy?.name ?? '-'],
            ['Total Transaksi', `${summary?.totalTransactions ?? 0} trx`],
            ['Total Penjualan', fmt(summary?.totalSales)],
            ['Kas Awal', fmt(summary?.openingCash ?? shift.openingCash)],
            ['Penjualan Tunai', fmt(summary?.totalCashIn)],
            ['Kas Diharapkan', fmt(summary?.expectedCash ?? shift.expectedCash)],
            ['Kas Fisik', fmt(summary?.closingCash ?? shift.closingCash)],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="flex justify-between font-bold">
            <span>Selisih Kas</span>
            <span className={diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}>
              {diff > 0 ? '+' : ''}{fmt(diff)}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Cetak
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Halaman Utama ─────────────────────────────────────────────── */
export default function PosShiftPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const outletId = user?.currentOutletId ?? '';
  const isCashier = user?.role === 'CASHIER';
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [shift, setShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Open shift form
  const [openingCash, setOpeningCash] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [isOpening, setIsOpening] = useState(false);

  // Modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [closeModalError, setCloseModalError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // After close
  const [closedShift, setClosedShift] = useState<Shift | null>(null);
  const [showRekapModal, setShowRekapModal] = useState(false);

  const duration = useDuration(shift?.openedAt ?? null);

  const loadShift = useCallback(async () => {
    if (!outletId) return;
    setIsLoading(true);
    try {
      const data = await getActiveShift(outletId);
      setShift(data);
    } finally {
      setIsLoading(false);
    }
  }, [outletId]);

  useEffect(() => { loadShift(); }, [loadShift]);

  async function handleOpen() {
    const cash = parseInt(openingCash.replace(/\D/g, ''), 10);
    if (!cash || cash < 0) { setError('Masukkan jumlah kas awal yang valid'); return; }
    setIsOpening(true);
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
      setIsOpening(false);
    }
  }

  async function handleClose(closingCash: number, notes: string) {
    if (!shift) return;
    setIsClosing(true);
    setCloseModalError(null);
    try {
      const data = await closeShift(shift.id, { closingCash, notes: notes || undefined });
      setClosedShift(data);
      setShift(null);
      setShowCloseModal(false);
      setShowRekapModal(true);
      toastSuccess('Shift berhasil ditutup');
    } catch (e: unknown) {
      setCloseModalError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Gagal menutup shift');
    } finally {
      setIsClosing(false);
    }
  }

  const activeSummary = shift?.summary as ShiftActiveSummary | undefined;

  // ── Sidebar ── (statis di desktop + drawer di mobile/tablet, konsisten
  // dengan halaman POS lainnya via PosSidebar)
  const Sidebar = (
    <>
      <aside className="hidden lg:flex w-72 shrink-0 h-full">
        <PosSidebar />
      </aside>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80%] shadow-xl animate-in slide-in-from-left duration-200">
            <PosSidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}
    </>
  );

  // Header mobile dengan hamburger — dipakai di tiap cabang tampilan (<lg).
  const MobileHeader = (
    <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200 shrink-0">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Buka menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <span className="font-bold text-gray-900">Manajemen Shift</span>
    </header>
  );

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
        {Sidebar}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Tidak Ada Shift (form buka shift) ──
  if (!shift) {
    return (
      <div className="flex h-screen bg-[#f7f9fb] overflow-hidden font-sans">
        {Sidebar}
        <div className="flex-1 flex flex-col min-w-0">
          {MobileHeader}
          <main className="flex-1 overflow-y-auto relative flex items-center justify-center p-6">
          {/* Decorative blurs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600 opacity-5 rounded-full blur-3xl" />
            <div className="absolute bottom-12 left-12 w-64 h-64 bg-slate-400 opacity-5 rounded-full blur-3xl" />
          </div>

          <div className="w-full max-w-2xl flex flex-col items-center relative z-10">
            {/* Page header */}
            <div className="text-center mb-8">
              <h1 className="text-[30px] leading-9.5 font-semibold tracking-tight text-gray-900 mb-2">Manajemen Shift</h1>
              <p className="text-sm text-gray-500">Buka atau tutup shift kerja Anda dengan mudah.</p>
            </div>

            {/* Main card */}
            <div className="w-full bg-white border border-gray-200 rounded-3xl shadow-sm p-8 flex flex-col gap-6">
              {/* Status header */}
              <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Tidak Ada Shift Aktif</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Silakan buka shift baru untuk mulai menerima transaksi hari ini.</p>
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Form */}
              <div className="space-y-5">
                {/* Kas Awal */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-500 ml-0.5">Kas Awal (Modal)</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-sm font-semibold text-gray-500">Rp</span>
                    </div>
                    <input
                      inputMode="numeric"
                      placeholder="Contoh: 500.000"
                      value={openingCash ? NUM.format(parseInt(openingCash.replace(/\D/g, ''), 10) || 0) : ''}
                      onChange={(e) => setOpeningCash(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-600 focus:outline-none text-base font-semibold transition-all placeholder:text-gray-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Catatan */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-500 ml-0.5">Catatan (opsional)</Label>
                  <textarea
                    rows={3}
                    placeholder="Misal: Shift pagi, kasir Budi"
                    value={openNotes}
                    onChange={(e) => setOpenNotes(e.target.value)}
                    className="block w-full px-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-600 focus:outline-none text-sm transition-all placeholder:text-gray-400 resize-none"
                  />
                </div>

                {/* CTA */}
                <div className="pt-1">
                  <button
                    onClick={handleOpen}
                    disabled={isOpening || !openingCash}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white py-5 rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-emerald-700/20 flex items-center justify-center gap-3 active:scale-95"
                  >
                    {isOpening ? (
                      <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Membuka...</>
                    ) : (
                      <><PlayCircle className="w-5 h-5" /> Buka Shift Sekarang</>
                    )}
                  </button>
                </div>
              </div>

              {/* Tip */}
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Info className="w-4 h-4 shrink-0" />
                <span className="text-xs italic">Memulai shift akan mencatat waktu masuk Anda secara otomatis.</span>
              </div>
            </div>
          </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Shift Aktif ──
  const canClose = !isCashier || shift.openedById === user?.id;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {Sidebar}

      <div className="flex-1 flex flex-col min-w-0">
        {MobileHeader}
        <main className="flex-1 overflow-y-auto">
        <div className="max-w-300 mx-auto px-8 pt-12 pb-20">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Manajemen Shift</h1>
            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Status: Aktif
            </span>
          </div>

          {/* 2-Column Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* ── Kolom Kiri — Info Shift ── */}
            <div className="xl:col-span-2 space-y-6">

              {/* Card utama */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                {/* dekor */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Kasir & waktu */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500">
                      <span className="text-2xl">👤</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Kasir Bertugas</p>
                      <h2 className="text-2xl font-bold text-gray-900">{shift.openedBy?.name ?? '-'}</h2>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center md:justify-end gap-1">
                      <Clock className="w-3.5 h-3.5" /> Waktu Mulai
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{formatTime(shift.openedAt)}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded">
                      Berjalan {duration}
                    </span>
                  </div>
                </div>

                {/* Total Penjualan */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Penjualan</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">Rp</span>
                      <span className="text-5xl font-extrabold text-emerald-600 tracking-tight">
                        {NUM.format(Number(activeSummary?.totalSales ?? 0))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      {activeSummary?.totalTransactions ?? 0} Transaksi Berhasil
                    </p>
                  </div>

                  {/* Circle chart dekoratif */}
                  <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#e5e7eb" strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#059669" strokeWidth="3"
                        strokeDasharray="75, 100" strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-emerald-600" />
                    </div>
                  </div>
                </div>

                {/* 4 sub-card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                  {[
                    { label: 'Saldo Awal', value: fmt(shift.openingCash), color: 'text-gray-900' },
                    { label: 'Penjualan Tunai', value: fmt(activeSummary?.totalCash), color: 'text-gray-900' },
                    { label: 'Non-Tunai', value: fmt(activeSummary?.totalNonCash), color: 'text-gray-900' },
                    { label: 'Selisih Kas', value: '—', color: 'text-gray-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                      <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
                      <p className={`text-base font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning jika shift bukan milik kasir */}
              {!canClose && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Shift bukan milik Anda</p>
                    <p className="text-sm text-amber-700 mt-0.5">
                      Shift ini dibuka oleh <span className="font-semibold">{shift.openedBy?.name ?? 'kasir lain'}</span>.
                      Hanya kasir yang membuka atau Manager yang dapat menutupnya.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Kolom Kanan — Panel Tutup Shift ── */}
            <div className="xl:col-span-1">
              <div className="bg-linear-to-b from-emerald-50 to-white rounded-2xl p-8 shadow-sm border border-emerald-100 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-100 rounded-bl-full pointer-events-none opacity-60" />

                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center mb-6 relative z-10">
                  <Shield className="w-8 h-8 text-emerald-600" />
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-3 relative z-10">Tutup Shift Kasir</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-8 relative z-10">
                  Pastikan semua transaksi telah selesai. Hitung kembali uang fisik di laci kasir sebelum melakukan penutupan shift dan pencetakan laporan akhir.
                </p>

                <div className="mt-auto space-y-3 relative z-10">
                  <button
                    onClick={() => { setCloseModalError(null); setShowCloseModal(true); }}
                    disabled={!canClose}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-sm transition-all shadow-[0_4px_12px_rgba(5,150,105,0.25)] hover:shadow-[0_6px_16px_rgba(5,150,105,0.35)] hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Tutup Shift Sekarang
                  </button>
                  <button
                    onClick={() => setShowPrintModal(true)}
                    className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-emerald-700 py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Ringkasan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>

      {/* Modals */}
      {showCloseModal && (
        <CloseShiftModal
          onConfirm={handleClose}
          onCancel={() => setShowCloseModal(false)}
          isPending={isClosing}
          error={closeModalError}
        />
      )}

      {showPrintModal && activeSummary && (
        <PrintModal
          shift={shift}
          summary={activeSummary}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {showRekapModal && closedShift && (
        <CloseRekapModal
          shift={closedShift as Shift & { summary?: ShiftCloseSummary }}
          onClose={() => {
            setShowRekapModal(false);
            router.push('/pos');
          }}
        />
      )}
    </div>
  );
}
