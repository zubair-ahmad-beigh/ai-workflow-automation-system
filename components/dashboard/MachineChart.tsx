'use client';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { MachineProduction } from '@/lib/types';
import { Cpu } from 'lucide-react';

interface Props { data: MachineProduction[]; }

export function MachineChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Cpu className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Production by Machine (Top 10)</h3>
      </div>
      {data.length === 0 ? (
        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
          No machine data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" vertical={false} />
            <XAxis
              dataKey="machineNumber"
              tick={{ fontSize: 10, fill: 'hsl(215 16% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(215 16% 55%)' }}
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
              formatter={(v: number, _name: string, props) => [
                `${v.toLocaleString()} units · ${props.payload.documents} docs · ${Math.round(props.payload.avgConfidence * 100)}% conf`,
                props.payload.machineNumber,
              ]}
            />
            <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(${210 + index * 15} 80% ${50 + index * 2}%)`}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
