'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  RefreshCw,
  Menu,
  Banknote,
  CreditCard,
  QrCode,
  ArrowRightLeft,
  Wallet,
  Receipt,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  Undo2,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store';
import { PosSidebar } from '@/features/pos/components/PosSidebar';
import { api } from '@/lib/api';
import { IDR, formatDateTime } from '@/lib/format';
import {
  voidTransactionPrompt,
  refundTransactionPrompt,
  toastSuccess,
  errorAlert,
} from '@/lib/swal';

type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS' | 'TRANSFER' | 'OTHER';
type TransactionStatus = 'COMPLETED' | 'VOIDED' | 'PENDING' | 'REFUNDED' | 'PARTIAL_REFUND';

interface TransactionItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Transaction {
  id: string;
  receiptNumber: string;
  totalAmount: number;
  amountPaid: number;
  changeAmount: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  createdAt: string;
  voidReason?: string | null;
  refundReason?: string | null;
  items: TransactionItem[];
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const LIMIT = 20;

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  DEBIT_CARD: 'Debit',
  CREDIT_CARD: 'Kredit',
  QRIS: 'QRIS',
  TRANSFER: 'Transfer',
  OTHER: 'Lainnya',
};

const PAYMENT_ICON: Record<PaymentMethod, React.ElementType> = {
  CASH: Banknote,
  DEBIT_CARD: CreditCard,
  CREDIT_CARD: CreditCard,
  QRIS: QrCode,
  TRANSFER: ArrowRightLeft,
  OTHER: Wallet,
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  COMPLETED: 'Selesai',
  VOIDED: 'Dibatalkan',
  PENDING: 'Pending',
  REFUNDED: 'Dikembalikan',
  PARTIAL_REFUND: 'Partial Refund',
};

const STATUS_FILTER_OPTIONS: { value: TransactionStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Semua Status' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'VOIDED', label: 'Dibatalkan' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REFUNDED', label: 'Dikembalikan' },
];

export default function PosTransactionsPage() {
  const user = useAuthStore((s) => s.user);
  const outletId = user?.currentOutletId ?? '';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: LIMIT, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async (targetPage = 1, status: TransactionStatus | 'ALL' = 'ALL') => {
    if (!outletId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        outletId,
        startDate: today,
        endDate: today,
        limit: String(LIMIT),
        page: String(targetPage),
      });
      if (status !== 'ALL') params.set('status', status);

      const { data } = await api.get<{ items: Transaction[]; meta: Meta }>(`/transactions?${params}`);
      setTransactions(data.items);
      setMeta(data.meta);
    } finally {
      setIsLoading(false);
    }
  }, [outletId, today]);

  useEffect(() => {
    load(page, statusFilter);
  }, [load, page, statusFilter]);

  function handleStatusChange(value: TransactionStatus | 'ALL') {
    setStatusFilter(value);
    setPage(1);
    setShowStatusDropdown(false);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    setExpandedId(null);
  }

  // Void transaksi: minta alasan + PIN manager, lalu panggil backend.
  // Stok dikembalikan & status jadi VOIDED di server; cukup reload daftar.
  async function handleVoid(trx: Transaction) {
    const input = await voidTransactionPrompt(trx.receiptNumber);
    if (!input) return;
    setVoidingId(trx.id);
    try {
      await api.post(`/transactions/${trx.id}/void`, input);
      toastSuccess('Transaksi dibatalkan');
      await load(page, statusFilter);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal membatalkan transaksi';
      errorAlert(message);
    } finally {
      setVoidingId(null);
    }
  }

  // Refund transaksi: pola sama dengan void — alasan + PIN manager.
  // Stok dikembalikan & status jadi REFUNDED di server.
  async function handleRefund(trx: Transaction) {
    const input = await refundTransactionPrompt(trx.receiptNumber);
    if (!input) return;
    setRefundingId(trx.id);
    try {
      await api.post(`/transactions/${trx.id}/refund`, input);
      toastSuccess('Transaksi di-refund');
      await load(page, statusFilter);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Gagal melakukan refund';
      errorAlert(message);
    } finally {
      setRefundingId(null);
    }
  }

  const completedTrx = transactions.filter((t) => t.status === 'COMPLETED');
  const totalSales = completedTrx.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalCompleted = meta.total;
  const avgValue = completedTrx.length > 0 ? totalSales / completedTrx.length : 0;

  const startRow = (meta.page - 1) * meta.limit + 1;
  const endRow = Math.min(meta.page * meta.limit, meta.total);

  const pageNumbers: number[] = [];
  const totalPages = meta.totalPages;
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar statis — desktop ≥lg */}
      <aside className="hidden lg:flex w-55 shrink-0 h-full">
        <PosSidebar />
      </aside>

      {/* Drawer + overlay — mobile/tablet (<lg) */}
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

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile — hamburger (lg: disembunyikan) */}
        <header className="lg:hidden flex items-center gap-3 h-14 px-4 bg-white border-b border-gray-200 shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Buka menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-gray-900">Riwayat Transaksi</span>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-350 mx-auto w-full p-4 md:p-6 space-y-6">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Riwayat Transaksi</h2>
                <p className="text-sm text-gray-500 mt-1">Pantau transaksi penjualan hari ini</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Hari Ini — static */}
                <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-gray-400" />
                  Hari Ini
                </div>

                {/* Status dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowStatusDropdown((v) => !v)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-sm flex items-center gap-2 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
                    </svg>
                    {STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label}
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showStatusDropdown && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                      {STATUS_FILTER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleStatusChange(opt.value)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors
                            ${statusFilter === opt.value
                              ? 'bg-emerald-50 text-emerald-700 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => load(page, statusFilter)}
                  className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 shadow-sm"
                  title="Muat ulang"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1 bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-600 text-xs font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Hari ini
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Penjualan</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{IDR.format(totalSales)}</p>
                </div>
              </div>

              <div className="md:col-span-1 bg-white border border-gray-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <span className="text-emerald-600 text-xs font-bold flex items-center gap-0.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Hari ini
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Transaksi Selesai</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{totalCompleted.toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-emerald-700 text-white p-5 rounded-xl shadow-md relative overflow-hidden flex items-center">
                <div className="relative z-10 w-full">
                  <p className="text-sm font-semibold opacity-90 mb-1">Rata-rata Nilai Transaksi</p>
                  <p className="text-3xl font-bold leading-tight">{IDR.format(avgValue)}</p>
                </div>
                <TrendingUp className="absolute right-6 opacity-10 w-24 h-24" />
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Daftar Transaksi Terbaru</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Transaksi</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Metode</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {isLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} className="px-6 py-4">
                              <div className="h-4 bg-gray-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-400">Belum ada transaksi hari ini</p>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((trx) => {
                        const isVoided = trx.status === 'VOIDED';
                        const isRefunded = trx.status === 'REFUNDED';
                        const isReversed = isVoided || isRefunded;
                        const PayIcon = PAYMENT_ICON[trx.paymentMethod];
                        const isExpanded = expandedId === trx.id;
                        return (
                          <Fragment key={trx.id}>
                            <tr
                              className={`transition-colors group ${
                                isVoided
                                  ? 'bg-red-50/40'
                                  : isRefunded
                                    ? 'bg-amber-50/40'
                                    : 'hover:bg-gray-50'
                              }`}
                            >
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{trx.receiptNumber}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{formatDateTime(trx.createdAt)}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                                  <PayIcon className="w-3.5 h-3.5" />
                                  {PAYMENT_LABEL[trx.paymentMethod]}
                                </span>
                              </td>
                              <td className={`px-6 py-4 text-sm font-bold text-right ${isReversed ? 'line-through text-gray-400' : 'text-emerald-700'}`}>
                                {IDR.format(Number(trx.totalAmount))}
                              </td>
                              <td className="px-6 py-4 text-center">
                                {trx.status === 'COMPLETED' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Selesai
                                  </span>
                                )}
                                {trx.status === 'VOIDED' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    Dibatalkan
                                  </span>
                                )}
                                {trx.status === 'PENDING' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    Pending
                                  </span>
                                )}
                                {(trx.status === 'REFUNDED' || trx.status === 'PARTIAL_REFUND') && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wide">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    {STATUS_LABEL[trx.status]}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedId(isExpanded ? null : trx.id)}
                                    title="Lihat detail"
                                    className="p-2 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {trx.status === 'COMPLETED' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleRefund(trx)}
                                        disabled={refundingId === trx.id}
                                        title="Refund transaksi"
                                        className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {refundingId === trx.id ? (
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Undo2 className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleVoid(trx)}
                                        disabled={voidingId === trx.id}
                                        title="Batalkan transaksi (void)"
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {voidingId === trx.id ? (
                                          <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Ban className="w-4 h-4" />
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${trx.id}-detail`} className="bg-gray-50">
                                <td colSpan={6} className="px-8 py-4">
                                  <div className="space-y-1.5 max-w-md">
                                    {isVoided && trx.voidReason && (
                                      <div className="mb-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                        <Ban className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span><b>Dibatalkan:</b> {trx.voidReason}</span>
                                      </div>
                                    )}
                                    {isRefunded && trx.refundReason && (
                                      <div className="mb-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        <Undo2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                        <span><b>Refund:</b> {trx.refundReason}</span>
                                      </div>
                                    )}
                                    {trx.items?.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-xs text-gray-600">
                                        <span>{item.productName} × {item.quantity}</span>
                                        <span className="font-semibold">{IDR.format(Number(item.unitPrice) * item.quantity)}</span>
                                      </div>
                                    ))}
                                    {trx.paymentMethod === 'CASH' && (
                                      <div className="pt-2 mt-1 border-t border-gray-200 space-y-1">
                                        <div className="flex justify-between text-xs text-gray-500">
                                          <span>Dibayar</span>
                                          <span>{IDR.format(Number(trx.amountPaid))}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-500">
                                          <span>Kembalian</span>
                                          <span>{IDR.format(Number(trx.changeAmount))}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {!isLoading && meta.total > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Menampilkan {startRow}–{endRow} dari {meta.total.toLocaleString('id-ID')} transaksi
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => handlePageChange(page - 1)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Sebelumnya
                    </button>
                    {pageNumbers.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded text-xs font-semibold transition-colors
                          ${p === page
                            ? 'bg-emerald-700 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                          }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => handlePageChange(page + 1)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      Berikutnya
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
