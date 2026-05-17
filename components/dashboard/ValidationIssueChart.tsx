'use client';

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface ValidationData {
  name: string;
  value: number;
  color: string;
}

export function ValidationIssueChart({ data }: { data: ValidationData[] }) {
  const tooltipStyle = {
    background: 'hsl(222 47% 9%)',
    border: '1px solid hsl(222 30% 16%)',
    borderRadius: 8,
    fontSize: 12,
    color: 'hsl(213 31% 91%)',
  };

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215 16% 55%)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 55%)' }} axisLine={false} tickLine={false} width={75} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} opacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
