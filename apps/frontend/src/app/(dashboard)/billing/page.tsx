'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Check,
  Crown,
  ShieldAlert,
  Loader2,
  CreditCard,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store';
import { usePageFocus } from '@/hooks/usePageFocus';
import {
  getPlans,
  getSubscription,
  getInvoices,
  subscribePlan,
  payInvoice,
  apiErrorMessage,
} from '@/features/billing/api';
import { toastSuccess, successAlert, errorAlert } from '@/lib/swal';
import { IDR } from '@/lib/format';
import type { Plan, Subscription, Invoice, PlanCode } from '@/features/billing/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-700' },
  TRIAL: { label: 'Masa Coba', cls: 'bg-blue-100 text-blue-700' },
  SUSPENDED: { label: 'Ditangguhkan', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Dibatalkan', cls: 'bg-gray-100 text-gray-600' },
};

const PLAN_RANK: Record<PlanCode, number> = { FREE: 0, STARTER: 1, GROWTH: 2, ENTERPRISE: 3 };

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const unlimited = max >= 999;
  const pct = unlimited ? 0 : Math.min(100, (used / max) * 100);
  const danger = !unlimited && used / max >= 0.9;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">
          {used} / {unlimited ? '∞' : max}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${danger ? 'bg-red-500' : 'bg-emerald-500'}`}
          style={{ width: unlimited ? '8%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const isOwner = user?.role === 'TENANT_OWNER';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog konfirmasi pembayaran simulasi.
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // invoice/plan yang sedang diproses

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, s, inv] = await Promise.all([getPlans(), getSubscription(), getInvoices()]);
      setPlans(p);
      setSub(s);
      setInvoices(inv);
    } catch {
      // 401/refresh ditangani interceptor.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOwner) load();
    else setIsLoading(false);
  }, [isOwner, load]);
  usePageFocus(() => {
    if (isOwner) load();
  });

  async function handleChoose(plan: PlanCode) {
    setError(null);
    setBusyId(plan);
    try {
      const result = await subscribePlan(plan);
      // Paket gratis langsung lunas → tak perlu dialog bayar.
      if (result.isPaid) {
        await load();
        toastSuccess(`Paket ${result.planName} berhasil diaktifkan`);
      } else {
        await load();
        // Cari invoice belum lunas yang baru dibuat, buka dialog bayar.
        const inv = (await getInvoices()).find((i) => i.id === result.id);
        if (inv) setPayTarget(inv);
      }
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal memilih paket.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePay() {
    if (!payTarget) return;
    setError(null);
    setBusyId(payTarget.id);
    try {
      await payInvoice(payTarget.id);
      setPayTarget(null);
      await load();
      successAlert('Pembayaran (simulasi) berhasil. Paket Anda telah aktif.', 'Pembayaran Berhasil');
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal memproses pembayaran.'));
    } finally {
      setBusyId(null);
    }
  }

  // Guard: hanya Owner.
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
        <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
        <p className="text-sm text-gray-500 mt-1">
          Hanya pemilik bisnis (Owner) yang dapat mengelola langganan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Paket</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola langganan Kasirku Anda.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Paket saat ini */}
      {isLoading || !sub ? (
        <div className="h-36 rounded-2xl bg-gray-100 animate-pulse" />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Paket Saat Ini</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-gray-900">{sub.planName}</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    STATUS_LABEL[sub.status]?.cls ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_LABEL[sub.status]?.label ?? sub.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {sub.price > 0 ? `${IDR.format(sub.price)} / bulan` : 'Gratis'}
                {sub.trialEndsAt && ` · Trial s/d ${fmtDate(sub.trialEndsAt)}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <UsageBar label="Outlet terpakai" used={sub.usage.outlets} max={sub.limits.maxOutlets} />
            <UsageBar label="Staf terpakai" used={sub.usage.staff} max={sub.limits.maxStaff} />
          </div>
        </div>
      )}

      {/* Pilih paket */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Pilih Paket</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(isLoading ? [] : plans).map((p) => {
            const isCurrent = sub?.plan === p.plan;
            const isUpgrade = sub ? PLAN_RANK[p.plan] > PLAN_RANK[sub.plan] : false;
            const actionLabel = isCurrent ? 'Paket Anda' : isUpgrade ? 'Upgrade' : 'Pilih';
            return (
              <div
                key={p.plan}
                className={`relative rounded-2xl border p-5 flex flex-col ${
                  isCurrent ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'
                } bg-white`}
              >
                {p.plan === 'ENTERPRISE' && (
                  <Crown className="absolute top-4 right-4 w-5 h-5 text-amber-400" />
                )}
                <p className="text-sm font-bold text-gray-900">{p.name}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {p.price > 0 ? IDR.format(p.price) : 'Gratis'}
                  {p.price > 0 && <span className="text-xs font-normal text-gray-400">/bln</span>}
                </p>
                <ul className="mt-4 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || busyId === p.plan}
                  onClick={() => handleChoose(p.plan)}
                >
                  {busyId === p.plan ? <Loader2 className="size-4 animate-spin" /> : null}
                  {actionLabel}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riwayat tagihan */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <p className="text-sm font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">
          Riwayat Tagihan
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-5 py-3 font-medium">Tanggal</th>
                <th className="px-5 py-3 font-medium">Paket</th>
                <th className="px-5 py-3 font-medium text-right">Jumlah</th>
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    Memuat…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Belum ada tagihan.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-gray-600">{fmtDate(inv.createdAt)}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{inv.planName}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                      {IDR.format(inv.amount)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {inv.invoiceRef ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          inv.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {inv.isPaid ? 'Lunas' : 'Belum bayar'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!inv.isPaid && (
                        <Button size="sm" onClick={() => setPayTarget(inv)}>
                          <CreditCard className="size-4" />
                          Bayar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog pembayaran simulasi */}
      <Dialog open={!!payTarget} onOpenChange={(o) => { if (!o) setPayTarget(null); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4 mt-2">
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  Ini adalah <strong>simulasi pembayaran</strong>. Tidak ada transaksi uang sungguhan
                  yang diproses.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 px-4 py-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Paket</span>
                  <span className="font-medium text-gray-900">{payTarget.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Jumlah</span>
                  <span className="font-bold text-gray-900">{IDR.format(payTarget.amount)}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPayTarget(null)}
                  disabled={busyId === payTarget.id}
                >
                  Batal
                </Button>
                <Button onClick={handlePay} disabled={busyId === payTarget.id}>
                  {busyId === payTarget.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  Bayar Sekarang
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
