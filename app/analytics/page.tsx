import { getAnalyticsSummary } from '@/lib/services/analytics';
import { WeeklyTrendChart } from '@/components/dashboard/WeeklyTrendChart';
import { ShiftChart } from '@/components/dashboard/ShiftChart';
import { MachineChart } from '@/components/dashboard/MachineChart';
import { confidenceToPercent, formatDate } from '@/lib/utils';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend,
} from 'recharts';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { stats, shiftProduction, machineProduction, validationSummary } = await getAnalyticsSummary();

  const statusData = [
    { name: 'Approved', value: stats.approved, color: 'hsl(142 71% 45%)' },
    { name: 'Needs Review', value: stats.needsReview, color: 'hsl(38 92% 50%)' },
    { name: 'Rejected', value: stats.rejected, color: 'hsl(0 84% 60%)' },
    { name: 'Uploaded', value: stats.totalDocuments - stats.processed, color: 'hsl(215 16% 55%)' },
  ].filter((d) => d.value > 0);

  const validationData = [
    { name: 'Errors', value: validationSummary.errors, color: 'hsl(0 84% 60%)' },
    { name: 'Warnings', value: validationSummary.warnings, color: 'hsl(38 92% 50%)' },
    { name: 'Overridden', value: validationSummary.overridden, color: 'hsl(280 80% 60%)' },
  ];

  const tooltipStyle = {
    background: 'hsl(222 47% 9%)',
    border: '1px solid hsl(222 30% 16%)',
    borderRadius: 8,
    fontSize: 12,
    color: 'hsl(213 31% 91%)',
  };

  return (
    <div>
      <div className="page-header px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Production metrics and extraction performance</p>
          </div>
        </div>
      </div>

      <div className="page-content space-y-6">

        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Total Processed', value: stats.processed, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
            { label: 'Approval Rate', value: stats.processed > 0 ? `${Math.round((stats.approved / stats.processed) * 100)}%` : '0%', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
            { label: 'Avg Confidence', value: confidenceToPercent(stats.averageConfidence), icon: BarChart3, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' },
            { label: 'Validation Issues', value: validationSummary.errors + validationSummary.warnings, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
          ].map((c) => (
            <div key={c.label} className="stat-card">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</p>
                <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <WeeklyTrendChart data={stats.weeklyTrend} />
          </div>

          {/* Document status pie */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-semibold text-foreground mb-5">Document Status Distribution</p>
            {statusData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} opacity={0.85} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _n, p) => [v, p.payload.name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'hsl(215 16% 55%)' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <MachineChart data={machineProduction} />
          </div>
          <ShiftChart data={shiftProduction} />
        </div>

        {/* Validation issues bar */}
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-semibold text-foreground mb-5">Validation Issue Breakdown</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={validationData} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(215 16% 55%)' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 55%)' }} axisLine={false} tickLine={false} width={75} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {validationData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Machine table */}
        {machineProduction.length > 0 && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Machine Production Detail</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {['Machine', 'Documents', 'Total Qty', 'Avg Confidence', 'Avg Qty/Doc'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {machineProduction.map((m) => (
                  <tr key={m.machineNumber} className="hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-2.5 text-xs font-mono font-semibold text-foreground">{m.machineNumber}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{m.documents}</td>
                    <td className="px-4 py-2.5 text-xs text-foreground">{m.quantity.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={m.avgConfidence >= 0.85 ? 'text-green-400' : m.avgConfidence >= 0.65 ? 'text-amber-400' : 'text-red-400'}>
                        {confidenceToPercent(m.avgConfidence)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">
                      {m.documents > 0 ? Math.round(m.quantity / m.documents).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
