'use client';

import { DashboardStats as StatsType } from '@/lib/types';
import {
  FileText, CheckCircle2, AlertTriangle, XCircle,
  TrendingUp, Upload, Cpu, BarChart2,
} from 'lucide-react';
import { confidenceToPercent } from '@/lib/utils';

interface Props { stats: StatsType; }

export function DashboardStats({ stats }: Props) {
  const cards = [
    {
      label: 'Total Documents',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      border: 'border-blue-400/20',
      sub: `${stats.todayUploads} uploaded today`,
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      border: 'border-green-400/20',
      sub: `${stats.processed > 0 ? Math.round((stats.approved / stats.processed) * 100) : 0}% approval rate`,
    },
    {
      label: 'Needs Review',
      value: stats.needsReview,
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/20',
      sub: 'Awaiting human review',
    },
    {
      label: 'Rejected',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/20',
      sub: 'Failed validation',
    },
    {
      label: 'Processed',
      value: stats.processed,
      icon: Cpu,
      color: 'text-indigo-400',
      bg: 'bg-indigo-400/10',
      border: 'border-indigo-400/20',
      sub: 'OCR + AI extracted',
    },
    {
      label: 'Avg. Confidence',
      value: confidenceToPercent(stats.averageConfidence),
      icon: BarChart2,
      color: stats.averageConfidence >= 0.8 ? 'text-green-400' : stats.averageConfidence >= 0.6 ? 'text-amber-400' : 'text-red-400',
      bg: stats.averageConfidence >= 0.8 ? 'bg-green-400/10' : 'bg-amber-400/10',
      border: stats.averageConfidence >= 0.8 ? 'border-green-400/20' : 'border-amber-400/20',
      sub: 'Extraction accuracy',
    },
    {
      label: "Today's Uploads",
      value: stats.todayUploads,
      icon: Upload,
      color: 'text-sky-400',
      bg: 'bg-sky-400/10',
      border: 'border-sky-400/20',
      sub: 'Documents uploaded today',
    },
    {
      label: 'Pending Review',
      value: stats.needsReview,
      icon: TrendingUp,
      color: 'text-orange-400',
      bg: 'bg-orange-400/10',
      border: 'border-orange-400/20',
      sub: `${stats.totalDocuments > 0 ? Math.round((stats.needsReview / stats.totalDocuments) * 100) : 0}% of total`,
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="stat-card animate-fade-in">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {card.label}
            </p>
            <div className={`w-8 h-8 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tabular-nums">{card.value}</p>
          <p className="text-xs text-muted-foreground mt-1.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
