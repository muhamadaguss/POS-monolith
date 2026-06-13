'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Store,
  Users,
  Package,
  Receipt,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/store';
import {
  getTenant,
  updateTenantStatus,
  updateTenantPlan,
  apiErrorMessage,
} from '@/features/admin/api';
import { toastSuccess, successAlert, errorAlert, confirmDialog } from '@/lib/swal';
import { IDR } from '@/lib/format';
import type { TenantDetail, TenantStatus, PlanCode } from '@/features/admin/types';

const STATUSES: { value: TenantStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Aktif' },
  { value: 'TRIAL', label: 'Masa Coba' },
  { value: 'SUSPENDED', label: 'Ditangguhkan' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
];

const PLANS: { value: PlanCode; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'STARTER', label: 'Starter' },
  { value: 'GROWTH', label: 'Growth' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function AdminTenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  // Primitif stabil — bukan objek user (shim membangun objek baru tiap render →
  // loop fetch tak terbatas jika dipakai di dependency useEffect).
  const userRole = useAuthStore((s) => s.user?.role ?? null);
  const isLoggedIn = useAuthStore((s) => s.user != null);
  const [hydrated, setHydrated] = useState(false);

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<TenantStatus>('ACTIVE');
  const [plan, setPlan] = useState<PlanCode>('FREE');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace('/login');
    else if (userRole !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [hydrated, isLoggedIn, userRole, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const t = await getTenant(id);
      setTenant(t);
      setStatus(t.status);
      setPlan(t.plan);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal memuat tenant.'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (hydrated && userRole === 'SUPER_ADMIN') load();
  }, [hydrated, userRole, load]);

  async function handleSaveStatus() {
    const ok = await confirmDialog({
      title: 'Ubah status tenant?',
      text: `Status akan diubah menjadi "${status}".`,
      confirmText: 'Ya, ubah',
    });
    if (!ok) return;
    setSavingStatus(true);
    try {
      await updateTenantStatus(id, status);
      await load();
      toastSuccess('Status tenant berhasil diperbarui');
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal mengubah status.'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleSavePlan() {
    const ok = await confirmDialog({
      title: 'Ubah paket tenant?',
      text: `Paket akan diubah menjadi "${plan}".`,
      confirmText: 'Ya, ubah',
    });
    if (!ok) return;
    setSavingPlan(true);
    try {
      const res = await updateTenantPlan(id, plan);
      await load();
      if (res.warnings.length > 0) {
        successAlert(
          `Paket diubah ke ${res.planName}.\n\nPeringatan: ${res.warnings.join(' ')}`,
          'Paket Diperbarui',
        );
      } else {
        toastSuccess(`Paket berhasil diubah ke ${res.planName}`);
      }
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal mengubah paket.'));
    } finally {
      setSavingPlan(false);
    }
  }

  if (!hydrated || !isLoggedIn || userRole !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/admin/tenants')}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-gray-900">Detail Tenant</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          Super Admin
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {isLoading || !tenant ? (
          <div className="h-40 rounded-2xl bg-gray-100 animate-pulse" />
        ) : (
          <>
            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Profil */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-400 font-mono mt-0.5">{tenant.slug}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                <div className="flex justify-between border-b border-gray-50 py-1">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{tenant.email}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 py-1">
                  <span className="text-gray-500">Telepon</span>
                  <span className="text-gray-900">{tenant.phone ?? '—'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 py-1">
                  <span className="text-gray-500">Email Billing</span>
                  <span className="text-gray-900">{tenant.billingEmail ?? '—'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 py-1">
                  <span className="text-gray-500">Terdaftar</span>
                  <span className="text-gray-900">{fmtDate(tenant.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Statistik */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatBox icon={Store} label="Outlet" value={tenant.stats.outlets} />
              <StatBox icon={Users} label="Staf" value={tenant.stats.staff} />
              <StatBox icon={Package} label="Produk" value={tenant.stats.products} />
              <StatBox icon={Receipt} label="Transaksi" value={tenant.stats.transactions} />
            </div>

            {/* Kontrol status & paket */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-900 mb-3">Status Langganan</p>
                <div className="flex items-center gap-2">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TenantStatus)}
                    className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleSaveStatus} disabled={savingStatus || status === tenant.status}>
                    {savingStatus && <Loader2 className="size-4 animate-spin" />}
                    Simpan
                  </Button>
                </div>
                {status === 'SUSPENDED' && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                    <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Tenant yang ditangguhkan tidak dapat login.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-semibold text-gray-900 mb-3">Paket Langganan</p>
                <div className="flex items-center gap-2">
                  <select
                    value={plan}
                    onChange={(e) => setPlan(e.target.value as PlanCode)}
                    className="h-9 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    {PLANS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleSavePlan} disabled={savingPlan || plan === tenant.plan}>
                    {savingPlan && <Loader2 className="size-4 animate-spin" />}
                    Terapkan
                  </Button>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Batas saat ini: {tenant.limits.maxOutlets >= 999 ? '∞' : tenant.limits.maxOutlets}{' '}
                  outlet · {tenant.limits.maxStaff >= 999 ? '∞' : tenant.limits.maxStaff} staf
                </p>
              </div>
            </div>

            {/* Riwayat langganan */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">
                Riwayat Langganan
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
                    </tr>
                  </thead>
                  <tbody>
                    {tenant.subscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                          Belum ada riwayat langganan.
                        </td>
                      </tr>
                    ) : (
                      tenant.subscriptions.map((s) => (
                        <tr key={s.id} className="border-b border-gray-50">
                          <td className="px-5 py-3 text-gray-600">{fmtDate(s.createdAt)}</td>
                          <td className="px-5 py-3 font-medium text-gray-900">{s.planName}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                            {IDR.format(s.amount)}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs text-gray-400">
                            {s.invoiceRef ?? '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                s.isPaid
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {s.isPaid ? 'Lunas' : 'Belum bayar'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
