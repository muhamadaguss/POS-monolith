import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Store, Users, Package, Receipt } from 'lucide-react';
import { verifySession, ServerFetchError } from '@/lib/session';
import { fetchTenant } from '@/features/admin/server';
import { IDR } from '@/lib/format';
import { TenantDetailControls } from './TenantDetailControls';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
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

function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
      <Link
        href="/admin/tenants"
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Kembali"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>
      <span className="font-bold text-gray-900">Detail Tenant</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
        Super Admin
      </span>
    </header>
  );
}

/**
 * Detail Tenant — Server Component (khusus Super Admin). Profil, statistik, &
 * riwayat langganan dirender server-side; kontrol status & paket (mutasi via
 * Server Actions) di TenantDetailControls (Client Component).
 */
export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();

  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hanya Super Admin yang dapat melihat detail tenant.
          </p>
        </div>
      </div>
    );
  }

  const { id } = await params;

  let tenant;
  try {
    tenant = await fetchTenant(id);
  } catch (err) {
    if (err instanceof ServerFetchError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
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

        {/* Kontrol status & paket (interaktif) */}
        <TenantDetailControls
          id={tenant.id}
          status={tenant.status}
          plan={tenant.plan}
          limits={tenant.limits}
        />

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
      </main>
    </div>
  );
}
