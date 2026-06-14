import {
  ShieldAlert,
  Building2,
  CheckCircle2,
  Hourglass,
  Ban,
  Wallet,
  MoreVertical,
  Sparkles,
  Megaphone,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { verifySession } from '@/lib/session';
import { fetchPlatformStats, fetchTenants } from '@/features/admin/server';
import { IDR } from '@/lib/format';
import { TenantsView } from './TenantsView';
import { AdminConsoleHeader } from '../_components/AdminConsoleHeader';

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconColor,
  active,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext: string;
  iconColor: string;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        active
          ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-white'
          : accent
            ? 'border-emerald-100 bg-emerald-50/40'
            : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <MoreVertical className="w-4 h-4 text-gray-300" aria-hidden />
      </div>
      <p className="text-sm text-gray-500 mt-3">{label}</p>
      <p
        className={`font-bold tabular-nums ${accent ? 'text-2xl text-emerald-700' : 'text-3xl text-gray-900'}`}
      >
        {value}
      </p>
      <p className={`text-xs mt-1 ${accent ? 'text-emerald-600' : 'text-gray-400'}`}>{subtext}</p>
    </div>
  );
}

/** Panel placeholder (fitur belum tersedia) — dirender sesuai mockup, non-fungsional. */
function GrowthPlaceholder() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <Sparkles className="w-6 h-6 text-emerald-500" />
      </div>
      <p className="font-semibold text-gray-900">Statistik Pertumbuhan</p>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">
        Grafik pertumbuhan tenant akan muncul di sini setelah Anda memiliki lebih dari 5 tenant
        aktif dalam platform Anda.
      </p>
      <span className="mt-3 text-sm font-medium text-emerald-400 cursor-not-allowed select-none">
        Pelajari Analitik Lanjut
      </span>
    </div>
  );
}

function BroadcastPlaceholder() {
  const items = [
    {
      icon: Megaphone,
      title: 'Umumkan Pemeliharaan Sistem',
      desc: 'Terjadwal untuk hari Minggu, 2:00 WIB',
    },
    {
      icon: Mail,
      title: 'Broadcast Email Marketing',
      desc: 'Promosi upgrade paket untuk STARTER',
    },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <p className="font-semibold text-gray-900">Promo &amp; Broadcast</p>
      <p className="text-sm text-gray-500 mt-1">
        Kirim notifikasi sistem atau email penagihan otomatis ke seluruh tenant dengan satu klik.
      </p>
      <span className="mt-3 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
        Segera hadir
      </span>
      <div className="mt-3 space-y-2" aria-disabled>
        {items.map((it) => (
          <div
            key={it.title}
            className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 opacity-60 cursor-not-allowed select-none"
          >
            <it.icon className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 truncate">{it.title}</p>
              <p className="text-xs text-gray-400 truncate">{it.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;
const VALID_STATUS = ['ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED'];
const VALID_PLAN = ['FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'];

interface SearchParams {
  search?: string;
  status?: string;
  plan?: string;
  page?: string;
}

/**
 * Manajemen Tenant lintas-tenant — Server Component (khusus Super Admin).
 * KPI + daftar di-fetch di server (serverFetch) sesuai searchParams; interaktivitas
 * (filter/pagination/navigasi baris/aksi) di TenantsView (Client Component).
 */
export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await verifySession();
  const adminName = session.user.name ?? 'Super Admin';

  // RBAC: hanya Super Admin (selaras backend @Roles(SUPER_ADMIN) & proxy).
  if (session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminConsoleHeader
          title="Manajemen Tenant"
          adminName={adminName}
          backHref="/admin"
          loginAt={session.loginAt}
        />
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-200 mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Akses Ditolak</h1>
          <p className="text-sm text-gray-500 mt-1">
            Hanya Super Admin yang dapat mengelola tenant platform.
          </p>
        </div>
      </div>
    );
  }

  const sp = await searchParams;
  const search = sp.search?.trim() ?? '';
  const status = VALID_STATUS.includes(sp.status ?? '') ? sp.status! : '';
  const plan = VALID_PLAN.includes(sp.plan ?? '') ? sp.plan! : '';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const [stats, data] = await Promise.all([
    fetchPlatformStats(),
    fetchTenants({
      search: search || undefined,
      status: (status || undefined) as never,
      plan: (plan || undefined) as never,
      page,
      limit: PAGE_SIZE,
    }),
  ]);

  const pct = (n: number) =>
    stats.total > 0 ? `${Math.round((n / stats.total) * 100)}% dari total` : '0% dari total';

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminConsoleHeader
          title="Manajemen Tenant"
          adminName={adminName}
          backHref="/admin"
          loginAt={session.loginAt}
        />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Building2}
            label="Total Tenant"
            value={String(stats.total)}
            subtext="Baru didaftarkan"
            iconColor="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Aktif"
            value={String(stats.active)}
            subtext={pct(stats.active)}
            iconColor="bg-emerald-50 text-emerald-600"
            active
          />
          <StatCard
            icon={Hourglass}
            label="Free Trial"
            value={String(stats.trial)}
            subtext="Menunggu aktivasi"
            iconColor="bg-orange-50 text-orange-500"
          />
          <StatCard
            icon={Ban}
            label="Suspended"
            value={String(stats.suspended)}
            subtext="Pelanggaran/Tunggakan"
            iconColor="bg-red-50 text-red-500"
          />
          <StatCard
            icon={Wallet}
            label="Estimated MRR"
            value={IDR.format(stats.mrr)}
            subtext="Bulan berjalan"
            iconColor="bg-emerald-100 text-emerald-600"
            accent
          />
        </div>

        <TenantsView data={data} search={search} status={status} plan={plan} page={page} />

        {/* Panel bawah (placeholder fitur mendatang). */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GrowthPlaceholder />
          <BroadcastPlaceholder />
        </div>
      </main>
    </div>
  );
}
