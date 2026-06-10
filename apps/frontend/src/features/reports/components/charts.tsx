'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  payload?: { value: number; payload: { transactions: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{label}</p>
      <p className="mt-1 text-emerald-600 font-bold">{IDR.format(p.value)}</p>
      <p className="text-gray-400">{p.payload.transactions} transaksi</p>
    </div>
  );
}

export function SalesTrendChart({
  data,
}: {
  data: { date: string; revenue: number; transactions: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-gray-400">
        Belum ada data penjualan pada periode ini.
      </div>
    );
  }
  const chartData = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
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
        <Area
          type="monotone"
          dataKey="revenue"
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
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{p.name}</p>
      <p className="mt-1 text-emerald-600 font-bold">{IDR.format(p.value)}</p>
      <p className="text-gray-400">{p.count} transaksi</p>
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
          <span className="text-sm font-bold text-gray-900">{shortIDR(total)}</span>
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
              <span className="text-gray-400">{p.count}x</span>
              <span className="w-10 text-right font-semibold text-gray-900">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
