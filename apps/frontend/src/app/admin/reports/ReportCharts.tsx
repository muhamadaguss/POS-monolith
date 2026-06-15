'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { IDR } from '@/lib/format';
import type { RevenueTrendPoint, PlanDistributionItem } from '@/features/admin/types';

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];

function shortIDR(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

/** Tren pendapatan lunas (bar) + tenant baru (line) per bulan. */
export function RevenueTrendChart({ data }: { data: RevenueTrendPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Belum ada data pada periode ini.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
        <YAxis
          yAxisId="left"
          tickFormatter={shortIDR}
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          allowDecimals={false}
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
        />
        <Tooltip
          formatter={(value, name) =>
            name === 'Pendapatan Lunas' ? IDR.format(Number(value)) : String(value)
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="left"
          dataKey="paidRevenue"
          name="Pendapatan Lunas"
          fill="#f59e0b"
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="newTenants"
          name="Tenant Baru"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Distribusi tenant aktif per paket (pie). */
export function PlanDistributionChart({ data }: { data: PlanDistributionItem[] }) {
  const nonEmpty = data.filter((d) => d.count > 0);
  if (nonEmpty.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Belum ada tenant aktif.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={nonEmpty}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={(entry: { name?: string; value?: number }) =>
            `${entry.name} (${entry.value})`
          }
          labelLine={false}
        >
          {nonEmpty.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, _n, item) => {
            const mrr = (item?.payload as PlanDistributionItem | undefined)?.mrr ?? 0;
            return `${Number(value)} tenant · ${IDR.format(mrr)}/bln`;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
