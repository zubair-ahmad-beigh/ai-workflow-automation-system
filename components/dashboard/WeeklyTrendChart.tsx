'use client';

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { DailyCount } from '@/lib/types';
import { TrendingUp } from 'lucide-react';

interface Props { data: DailyCount[]; }

export function WeeklyTrendChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Upload Trend — Last 7 Days</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="uploadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(210 100% 56%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(210 100% 56%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(215 16% 55%)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(215 16% 55%)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(222 47% 9%)',
              border: '1px solid hsl(222 30% 16%)',
              borderRadius: 8,
              fontSize: 12,
              color: 'hsl(213 31% 91%)',
            }}
            formatter={(v: number) => [v, 'Documents']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="hsl(210 100% 56%)"
            strokeWidth={2}
            fill="url(#uploadGrad)"
            dot={{ fill: 'hsl(210 100% 56%)', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
