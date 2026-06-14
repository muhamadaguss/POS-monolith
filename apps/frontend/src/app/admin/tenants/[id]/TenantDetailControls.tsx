'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toastSuccess, successAlert, errorAlert, confirmDialog } from '@/lib/swal';
import { setTenantStatusAction, setTenantPlanAction } from '@/features/admin/actions';
import type { TenantStatus, PlanCode } from '@/features/admin/types';

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

/**
 * Kontrol status & paket tenant (interaktif). Mutasi lewat Server Actions; setelah
 * sukses `router.refresh()` me-refetch Server Component agar profil/statistik sinkron.
 * `current*` props = nilai terkini dari server → tombol Simpan disabled bila tak berubah.
 */
export function TenantDetailControls({
  id,
  status: currentStatus,
  plan: currentPlan,
  limits,
}: {
  id: string;
  status: TenantStatus;
  plan: PlanCode;
  limits: { maxOutlets: number; maxStaff: number };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<TenantStatus>(currentStatus);
  const [plan, setPlan] = useState<PlanCode>(currentPlan);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  async function handleSaveStatus() {
    const ok = await confirmDialog({
      title: 'Ubah status tenant?',
      text: `Status akan diubah menjadi "${status}".`,
      confirmText: 'Ya, ubah',
    });
    if (!ok) return;
    setSavingStatus(true);
    try {
      await setTenantStatusAction(id, status);
      toastSuccess('Status tenant berhasil diperbarui');
      startTransition(() => router.refresh());
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal mengubah status.');
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
      const res = await setTenantPlanAction(id, plan);
      if (res.warnings.length > 0) {
        successAlert(
          `Paket diubah ke ${res.planName}.\n\nPeringatan: ${res.warnings.join(' ')}`,
          'Paket Diperbarui',
        );
      } else {
        toastSuccess(`Paket berhasil diubah ke ${res.planName}`);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal mengubah paket.');
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Status Langganan</p>
        <div className="flex items-center gap-2">
          <select
            aria-label="Status langganan"
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
          <Button onClick={handleSaveStatus} disabled={savingStatus || status === currentStatus}>
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
            aria-label="Paket langganan"
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
          <Button onClick={handleSavePlan} disabled={savingPlan || plan === currentPlan}>
            {savingPlan && <Loader2 className="size-4 animate-spin" />}
            Terapkan
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Batas saat ini: {limits.maxOutlets >= 999 ? '∞' : limits.maxOutlets} outlet ·{' '}
          {limits.maxStaff >= 999 ? '∞' : limits.maxStaff} staf
        </p>
      </div>
    </div>
  );
}
