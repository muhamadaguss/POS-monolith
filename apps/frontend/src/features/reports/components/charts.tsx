'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { IDR } from '@/lib/format';

export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Tunai',
  QRIS: 'QRIS',
  DEBIT_CARD: 'Debit',
  CREDIT_CARD: 'Kredit',
  TRANSFER: 'Transfer',
  OTHER: 'Lainnya',
};

export const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];

/** Format singkat untuk sumbu Y: 1.2jt, 850rb, 0. */
export function shortIDR(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

// ── Tren Penjualan (area chart) ──────────────────────────────────────────────

function SalesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; payload: { transactions: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.name === 'revenue') ?? payload[0];
  const previous = payload.find((p) => p.name === 'previous');
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
      <p className="mt-1 text-emerald-600 font-bold">{IDR.format(current.value)}</p>
      {previous && (
        <p className="text-gray-400 dark:text-gray-500">Sebelumnya {IDR.format(previous.value)}</p>
      )}
      {!previous && <p className="text-gray-400 dark:text-gray-500">{current.payload.transactions} transaksi</p>}
    </div>
  );
}

export function SalesTrendChart({
  data,
  previousData,
}: {
  data: { date: string; revenue: number; transactions: number }[];
  /** Tren periode sebelumnya untuk overlay (opsional). Disejajarkan per indeks hari. */
  previousData?: { date: string; revenue: number; transactions: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Belum ada data penjualan pada periode ini.
      </div>
    );
  }
  const showCompare = !!previousData && previousData.length > 0;
  // Overlay disejajarkan per indeks hari ke-N (bukan tanggal absolut), karena
  // rentang sebelumnya bergeser. Label sumbu tetap dari periode saat ini.
  const chartData = data.map((d, i) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    previous: showCompare ? (previousData![i]?.revenue ?? 0) : undefined,
  }));
  return (
    <ResponsiveContainer width="100%" height={224}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          interval="preserveStartEnd"
          minTickGap={20}
        />
        <YAxis
          tickFormatter={shortIDR}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          content={<SalesTooltip />}
          cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        {showCompare && (
          <Area
            type="monotone"
            dataKey="previous"
            name="previous"
            stroke="#cbd5e1"
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
            dot={false}
            activeDot={{ r: 4, fill: '#cbd5e1' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="revenue"
          name="revenue"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#revFill)"
          dot={chartData.length <= 14 ? { r: 3, fill: '#10b981' } : false}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Metode Pembayaran (donut) ────────────────────────────────────────────────

function PaymentTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; value: number; count: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
      <p className="mt-1 text-emerald-600 font-bold">{IDR.format(p.value)}</p>
      <p className="text-gray-400 dark:text-gray-500">{p.count} transaksi</p>
    </div>
  );
}

export function PaymentBreakdown({
  data,
}: {
  data: { method: string; count: number; total: number }[];
}) {
  const total = data.reduce((s, p) => s + p.total, 0);
  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Belum ada pembayaran.
      </div>
    );
  }
  const chartData = data.map((p) => ({
    name: METHOD_LABEL[p.method] ?? p.method,
    value: p.total,
    count: p.count,
  }));
  return (
    <div className="space-y-4">
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<PaymentTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Label tengah donut */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Total</span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{shortIDR(total)}</span>
        </div>
      </div>
      <div className="space-y-2">
        {chartData.map((p, i) => {
          const pct = (p.value / total) * 100;
          return (
            <div key={p.name} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="flex-1 font-medium text-gray-700">{p.name}</span>
              <span className="text-gray-400 dark:text-gray-500">{p.count}x</span>
              <span className="w-10 text-right font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Penjualan per Jam (bar chart) ────────────────────────────────────────────

function HourlyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: { count: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900 dark:text-gray-100">Jam {label}</p>
      <p className="mt-1 text-emerald-600 font-bold">{IDR.format(p.value)}</p>
      <p className="text-gray-400 dark:text-gray-500">{p.payload.count} transaksi</p>
    </div>
  );
}

/** Distribusi omzet per jam (0–23). Jam puncak disorot warna pekat. */
export function HourlyBarChart({
  data,
}: {
  data: { hour: number; count: number; revenue: number }[];
}) {
  const totalRevenue = data.reduce((s, h) => s + h.revenue, 0);
  if (data.length === 0 || totalRevenue === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Belum ada penjualan pada periode ini.
      </div>
    );
  }
  const peak = data.reduce((m, h) => (h.revenue > m ? h.revenue : m), 0);
  const chartData = data.map((h) => ({
    label: String(h.hour).padStart(2, '0'),
    revenue: h.revenue,
    count: h.count,
    isPeak: h.revenue === peak && peak > 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={224}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={{ stroke: '#e2e8f0' }}
          interval={1}
        />
        <YAxis
          tickFormatter={shortIDR}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<HourlyTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.isPeak ? '#10b981' : '#a7f3d0'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Penjualan per Kategori (donut + legend) ──────────────────────────────────

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; value: number; quantity: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
      <p className="mt-1 text-emerald-600 font-bold">{IDR.format(p.value)}</p>
      <p className="text-gray-400 dark:text-gray-500">{p.quantity} item terjual</p>
    </div>
  );
}

export function CategoryBreakdown({
  data,
}: {
  data: { categoryName: string; quantity: number; revenue: number }[];
}) {
  const total = data.reduce((s, c) => s + c.revenue, 0);
  if (data.length === 0 || total === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Belum ada penjualan per kategori.
      </div>
    );
  }
  const chartData = data.map((c) => ({
    name: c.categoryName,
    value: c.revenue,
    quantity: c.quantity,
  }));
  return (
    <div className="space-y-4">
      <div className="relative h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={68}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CategoryTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Total</span>
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{shortIDR(total)}</span>
        </div>
      </div>
      <div className="space-y-2">
        {chartData.map((c, i) => {
          const pct = (c.value / total) * 100;
          return (
            <div key={c.name} className="flex items-center gap-2 text-xs">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="flex-1 font-medium text-gray-700 dark:text-gray-300 truncate">{c.name}</span>
              <span className="text-gray-400 dark:text-gray-500">{c.quantity}x</span>
              <span className="w-10 text-right font-semibold text-gray-900 dark:text-gray-100 dark:text-gray-100">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Perbandingan antar Outlet (bar omzet vs profit) ──────────────────────────

function OutletTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; dataKey?: string; payload: { transactions: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rev = payload.find((p) => p.dataKey === 'revenue');
  const profit = payload.find((p) => p.dataKey === 'profit');
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
      {rev && <p className="mt-1 text-emerald-600 font-bold">Omzet {IDR.format(rev.value)}</p>}
      {profit && <p className="text-blue-600 font-semibold">Profit {IDR.format(profit.value)}</p>}
      <p className="text-gray-400 dark:text-gray-500">{payload[0].payload.transactions} transaksi</p>
    </div>
  );
}

export function OutletComparisonChart({
  data,
}: {
  data: { outletName: string; revenue: number; transactions: number; profit: number }[];
}) {
  const totalRevenue = data.reduce((s, o) => s + o.revenue, 0);
  if (data.length === 0 || totalRevenue === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Belum ada penjualan untuk dibandingkan.
      </div>
    );
  }
  const chartData = data.map((o) => ({
    name: o.outletName,
    revenue: o.revenue,
    profit: o.profit,
    transactions: o.transactions,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 64)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        barCategoryGap={16}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={shortIDR}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: '#475569' }}
          tickLine={false}
          axisLine={false}
          width={96}
        />
        <Tooltip content={<OutletTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="revenue" name="Omzet" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
        <Bar dataKey="profit" name="Profit" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
