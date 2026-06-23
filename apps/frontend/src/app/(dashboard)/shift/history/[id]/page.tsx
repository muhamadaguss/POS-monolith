'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Printer, Receipt, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { getShiftDetail } from '@/features/shifts/api';
import { IDR, toNum, formatDateTimeLong, formatTimeOnly } from '@/lib/format';
import type { ShiftDetail, ShiftCloseSummary } from '@/features/shifts/types';

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  CARD: 'Kartu',
  TRANSFER: 'Transfer',
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Selesai',
  VOIDED: 'Dibatalkan',
  REFUNDED: 'Refund',
  PARTIAL_REFUND: 'Refund Sebagian',
};

function ShiftDetailInner() {
  const params = useParams<{ id: string }>();
  const shiftId = params.id;

  const [shift, setShift] = useState<ShiftDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shiftId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShiftDetail(shiftId);
      setShift(data);
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Gagal memuat detail shift',
      );
    } finally {
      setIsLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="max-w-lg mx-auto mt-12 space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-5 py-4 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">{error ?? 'Shift tidak ditemukan'}</p>
        </div>
        <Link href="/shift/history">
          <Button variant="outline" className="rounded-xl gap-2">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
          </Button>
        </Link>
      </div>
    );
  }

  const closeSummary = shift.summary as ShiftCloseSummary | undefined;
  const diff = toNum(shift.cashDifference);
  const isClosed = shift.status === 'CLOSED';

  // Baris rekap kas — hanya bermakna penuh bila shift sudah ditutup.
  const recapRows: [string, string][] = [
    ['Outlet', shift.outlet?.name ?? '-'],
    ['Dibuka oleh', shift.openedBy?.name ?? '-'],
    ['Waktu Buka', formatDateTimeLong(shift.openedAt)],
    ['Waktu Tutup', shift.closedAt ? formatDateTimeLong(shift.closedAt) : 'Masih berjalan'],
    ['Kas Awal', IDR.format(toNum(shift.openingCash))],
    ...(isClosed
      ? ([
          ['Total Penjualan Tunai', IDR.format(toNum(closeSummary?.totalCashIn))],
          ['Kas Diharapkan', IDR.format(toNum(shift.expectedCash))],
          ['Kas Fisik', IDR.format(toNum(shift.closingCash))],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Link href="/shift/history">
          <Button variant="ghost" className="rounded-xl gap-2 -ml-2">
            <ArrowLeft className="w-4 h-4" /> Riwayat
          </Button>
        </Link>
        {isClosed && (
          <Button variant="outline" onClick={() => window.print()} className="rounded-xl gap-2">
            <Printer className="w-4 h-4" /> Cetak Rekap
          </Button>
        )}
      </div>

      {/* Rekap kas — blok ini yang tercetak (print-root/print-area di globals.css). */}
      <div className="print-root print-area bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 divide-y divide-gray-100/50 dark:divide-gray-700/30 shadow-sm">
        {/* Header hanya saat cetak — beri konteks pada kertas. */}
        <div className="hidden print:block px-6 pt-5 pb-3 text-center">
          <p className="font-bold text-base text-gray-900 dark:text-gray-100">{shift.outlet?.name ?? 'Outlet'}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rekap Shift</p>
        </div>
        {recapRows.map(([label, val]) => (
          <div key={label} className="flex justify-between px-6 py-3.5 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">{val}</span>
          </div>
        ))}
        {isClosed && (
          <div className="flex justify-between px-6 py-4">
            <span className="font-bold text-gray-900 dark:text-gray-100">Selisih Kas</span>
            <span
              className={`text-lg font-black ${
                diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {diff > 0 ? '+' : ''}
              {IDR.format(diff)}
            </span>
          </div>
        )}
      </div>

      {/* Daftar transaksi shift — tidak ikut tercetak (di luar print-root). */}
      <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-gray-700/50 overflow-hidden print:hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100/50 dark:border-gray-700/30">
          <Receipt className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Transaksi ({shift._count?.transactions ?? shift.transactions.length})
          </p>
        </div>
        {shift.transactions.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            Tidak ada transaksi pada shift ini
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shift.transactions.map((trx) => {
              const voided = trx.status === 'VOIDED';
              return (
                <li key={trx.id} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${voided ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                      {trx.receiptNumber}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {PAYMENT_LABEL[trx.paymentMethod] ?? trx.paymentMethod} ·{' '}
                      {formatTimeOnly(trx.createdAt)}
                      {trx.status !== 'COMPLETED'
                        ? ` · ${STATUS_LABEL[trx.status] ?? trx.status}`
                        : ''}
                    </p>
                  </div>
                  <span className={`font-semibold ${voided ? 'text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {IDR.format(toNum(trx.totalAmount))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function ShiftDetailPage() {
  return (
    <RequirePermission
      anyOf={['shift.manage']}
      message="Hanya Manager atau Owner yang dapat melihat detail shift."
    >
      <ShiftDetailInner />
    </RequirePermission>
  );
}
