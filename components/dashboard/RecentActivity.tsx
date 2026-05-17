'use client';

import { formatDateTime, truncate } from '@/lib/utils';
import {
  Upload, CheckCircle2, XCircle, FileCheck, AlertTriangle,
  Cpu, Eye, Activity,
} from 'lucide-react';

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  uploaded:              { icon: Upload,       color: 'text-blue-400',   label: 'Uploaded' },
  ocr_started:           { icon: Cpu,          color: 'text-indigo-400', label: 'OCR Started' },
  ocr_completed:         { icon: FileCheck,    color: 'text-indigo-400', label: 'OCR Done' },
  extraction_started:    { icon: Cpu,          color: 'text-purple-400', label: 'Extracting' },
  extraction_completed:  { icon: FileCheck,    color: 'text-purple-400', label: 'Extracted' },
  review_saved:          { icon: Eye,          color: 'text-amber-400',  label: 'Review Saved' },
  approved:              { icon: CheckCircle2, color: 'text-green-400',  label: 'Approved' },
  rejected:              { icon: XCircle,      color: 'text-red-400',    label: 'Rejected' },
  validation_overridden: { icon: AlertTriangle,color: 'text-orange-400', label: 'Override' },
  reprocessed:           { icon: Cpu,          color: 'text-sky-400',    label: 'Reprocessed' },
};

interface Log {
  id: string;
  documentId: string;
  action: string;
  actor: string;
  createdAt: Date;
  document?: { originalName: string; status: string } | null;
}

interface Props { logs: Log[]; }

export function RecentActivity({ logs }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
      </div>

      {logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No activity yet
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-64">
          {logs.map((log) => {
            const cfg = ACTION_CONFIG[log.action] ?? { icon: Activity, color: 'text-muted-foreground', label: log.action };
            const Icon = cfg.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 group">
                <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center bg-muted shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-snug">
                    {cfg.label}
                    {' · '}
                    <span className="text-muted-foreground font-normal">
                      {log.document ? truncate(log.document.originalName, 24) : log.documentId.slice(0, 8)}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDateTime(log.createdAt)} · {log.actor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
