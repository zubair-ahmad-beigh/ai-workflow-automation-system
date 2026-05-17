'use client';

import { DocumentStatus } from '@/lib/types';
import { statusColor, statusLabel } from '@/lib/utils';
import {
  Upload, Loader2, FileCheck, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ICONS: Record<DocumentStatus, React.ReactNode> = {
  uploaded: <Upload className="w-3 h-3" />,
  processing: <Loader2 className="w-3 h-3 animate-spin" />,
  extracted: <FileCheck className="w-3 h-3" />,
  needs_review: <AlertTriangle className="w-3 h-3" />,
  approved: <CheckCircle2 className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

interface StatusBadgeProps {
  status: DocumentStatus;
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, showIcon = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border',
        statusColor(status),
        className
      )}
    >
      {showIcon && STATUS_ICONS[status]}
      {statusLabel(status)}
    </span>
  );
}
