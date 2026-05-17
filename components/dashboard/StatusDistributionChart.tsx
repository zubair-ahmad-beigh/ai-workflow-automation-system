'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StatusData {
  name: string;
  value: number;
  color: string;
}

export function StatusDistributionChart({ data }: { data: StatusData[] }) {
  const tooltipStyle = {
    background: 'hsl(222 47% 9%)',
    border: '1px solid hsl(222 30% 16%)',
    borderRadius: 8,
    fontSize: 12,
    color: 'hsl(213 31% 91%)',
  };

  if (data.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n: string, p: any) => [v, p.payload.name]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'hsl(215 16% 55%)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
