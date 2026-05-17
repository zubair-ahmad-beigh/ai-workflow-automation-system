'use client';

import { cn, confidenceColor, confidenceToPercent } from '@/lib/utils';
import { FieldConfidence } from '@/lib/types';
import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number;
  showBar?: boolean;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  showBar = true,
  showIcon = true,
  showLabel = true,
  size = 'sm',
  className,
}: ConfidenceIndicatorProps) {
  const isHigh = confidence >= 0.85;
  const isMedium = confidence >= 0.65;

  const Icon = isHigh ? CheckCircle2 : isMedium ? HelpCircle : AlertTriangle;
  const barClass = isHigh
    ? 'confidence-fill-high'
    : isMedium
    ? 'confidence-fill-medium'
    : 'confidence-fill-low';

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-1.5">
        {showIcon && (
          <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4', confidenceColor(confidence))} />
        )}
        {showLabel && (
          <span className={cn('font-mono font-semibold', size === 'sm' ? 'text-xs' : 'text-sm', confidenceColor(confidence))}>
            {confidenceToPercent(confidence)}
          </span>
        )}
      </div>
      {showBar && (
        <div className="confidence-bar">
          <div className={barClass} style={{ width: `${confidence * 100}%` }} />
        </div>
      )}
    </div>
  );
}

// ── Per-field confidence badge ─────────────────────────────────
interface FieldConfidenceBadgeProps {
  field: FieldConfidence | undefined;
  className?: string;
}

export function FieldConfidenceBadge({ field, className }: FieldConfidenceBadgeProps) {
  if (!field) return null;
  const isLow = field.confidence < 0.65;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border',
        isLow
          ? 'bg-red-500/10 text-red-400 border-red-500/20'
          : field.confidence < 0.85
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : 'bg-green-500/10 text-green-400 border-green-500/20',
        className
      )}
    >
      {isLow && <AlertTriangle className="w-2.5 h-2.5" />}
      {confidenceToPercent(field.confidence)}
    </span>
  );
}
