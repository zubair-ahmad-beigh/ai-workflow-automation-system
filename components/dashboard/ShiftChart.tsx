'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ShiftProduction } from '@/lib/types';
import { Layers } from 'lucide-react';

const COLORS = ['hsl(210 100% 56%)', 'hsl(38 92% 50%)', 'hsl(142 71% 45%)', 'hsl(280 80% 60%)'];

interface Props { data: ShiftProduction[]; }

export function ShiftChart({ data }: Props) {
  const chartData = data.map((d) => ({ name: `Shift ${d.shift}`, value: d.quantity, docs: d.documents }));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Layers className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Production by Shift</h3>
      </div>
      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No shift data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={0.9} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(222 47% 9%)',
                border: '1px solid hsl(222 30% 16%)',
                borderRadius: 8,
                fontSize: 12,
                color: 'hsl(213 31% 91%)',
              }}
              formatter={(v: number, _name: string, props) => [
                `${v.toLocaleString()} units (${props.payload.docs} docs)`,
                props.payload.name,
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: 'hsl(215 16% 55%)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
