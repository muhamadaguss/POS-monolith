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

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

function shortIDR(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

const MONTH_FMT = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' });

/** "2026-06" → "Jun 2026" (Bahasa Indonesia). */
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return MONTH_FMT.format(new Date(y, m - 1, 1));
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
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ fontSize: 12 }}
          stroke="#94a3b8"
        />
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

/** Distribusi tenant aktif per paket (donut + label tengah + legend list). */
export function PlanDistributionChart({ data }: { data: PlanDistributionItem[] }) {
  const nonEmpty = data.filter((d) => d.count > 0);
  if (nonEmpty.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Belum ada tenant aktif.
      </div>
    );
  }

  const totalCount = nonEmpty.reduce((sum, d) => sum + d.count, 0);
  // Paket dominan untuk label tengah donut.
  const top = nonEmpty.reduce((a, b) => (b.count > a.count ? b : a));
  const topPct = Math.round((top.count / totalCount) * 100);
  const colorFor = (i: number) => PIE_COLORS[i % PIE_COLORS.length];

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={nonEmpty}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {nonEmpty.map((_, i) => (
                <Cell key={i} fill={colorFor(i)} />
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
        {/* Label tengah donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-gray-900">{topPct}%</span>
          <span className="text-sm text-gray-500">{top.name}</span>
        </div>
      </div>

      {/* Legend list */}
      <ul className="mt-4 space-y-2">
        {nonEmpty.map((d, i) => (
          <li
            key={d.plan}
            className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm text-gray-700">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colorFor(i) }}
              />
              Paket {d.name}
            </span>
            <span className="text-sm font-semibold text-gray-900">{d.count} Tenant</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
