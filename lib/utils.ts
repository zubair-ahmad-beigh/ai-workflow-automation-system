import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DocumentStatus, ValidationSeverity } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: Date | string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    ...opts,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date)).toUpperCase();
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export function confidenceToPercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.85) return 'text-green-600';
  if (confidence >= 0.65) return 'text-amber-500';
  return 'text-red-500';
}

export function confidenceBg(confidence: number): string {
  if (confidence >= 0.85) return 'bg-green-50 border-green-200';
  if (confidence >= 0.65) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

export function statusColor(status: DocumentStatus): string {
  const map: Record<DocumentStatus, string> = {
    uploaded: 'bg-slate-100 text-slate-700 border-slate-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    extracted: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    needs_review: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-green-100 text-green-700 border-green-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

export function statusLabel(status: DocumentStatus): string {
  const map: Record<DocumentStatus, string> = {
    uploaded: 'Uploaded',
    processing: 'Processing',
    extracted: 'Extracted',
    needs_review: 'Needs Review',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] ?? status;
}

export function severityColor(severity: ValidationSeverity): string {
  const map: Record<ValidationSeverity, string> = {
    error: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200',
  };
  return map[severity];
}

export function generateCuid(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export function safeParseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return `${str.slice(0, max)}…`;
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}
