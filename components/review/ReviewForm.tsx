'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfidenceMap, DocumentStatus, ManufacturingRecord, ValidationIssueRecord } from '@/lib/types';
import { FieldConfidenceBadge } from '@/components/shared/ConfidenceIndicator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Save, CheckCircle2, XCircle, AlertTriangle, Info,
  Loader2, RotateCcw, Eye, EyeOff, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  documentId: string;
  initialRecord: ManufacturingRecord & { reviewNotes?: string | null };
  confidenceScores: ConfidenceMap;
  validationIssues: ValidationIssueRecord[];
  status: DocumentStatus;
}

const FIELD_CONFIG = [
  { key: 'date',            label: 'Date',             type: 'date',   required: true },
  { key: 'shift',           label: 'Shift',            type: 'select', options: ['A','B','C','Night'], required: true },
  { key: 'employeeNumber',  label: 'Employee No.',     type: 'text',   required: false },
  { key: 'operationCode',   label: 'Operation Code',   type: 'text',   required: false },
  { key: 'machineNumber',   label: 'Machine No.',      type: 'text',   required: true },
  { key: 'workOrderNumber', label: 'Work Order No.',   type: 'text',   required: true },
  { key: 'quantityProduced',label: 'Qty Produced',     type: 'number', required: true },
  { key: 'timeTaken',       label: 'Time Taken (hrs)', type: 'number', required: true },
  { key: 'batchNumber',     label: 'Batch No.',        type: 'text',   required: false },
  { key: 'productCode',     label: 'Product Code',     type: 'text',   required: false },
  { key: 'remarks',         label: 'Remarks',          type: 'textarea', required: false },
] as const;

export function ReviewForm({ documentId, initialRecord, confidenceScores, validationIssues, status }: Props) {
  const router = useRouter();
  const [record, setRecord] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    for (const f of FIELD_CONFIG) {
      const v = initialRecord[f.key as keyof ManufacturingRecord];
      r[f.key] = v !== null && v !== undefined ? String(v) : '';
    }
    return r;
  });
  const [reviewNotes, setReviewNotes] = useState(initialRecord.reviewNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [overrideStates, setOverrideStates] = useState<Record<string, string>>({});

  const fieldIssues = (field: string) => validationIssues.filter((i) => i.field === field && !i.isOverridden);
  const hasError = (field: string) => fieldIssues(field).some((i) => i.severity === 'error');
  const hasWarning = (field: string) => fieldIssues(field).some((i) => i.severity === 'warning');

  const setField = (key: string, val: string) => setRecord((prev) => ({ ...prev, [key]: val }));

  const doAction = async (action: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, record, reviewNotes }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(data.message ?? 'Done');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const overrideIssue = async (issueId: string) => {
    const note = overrideStates[issueId];
    if (!note?.trim()) { toast.error('Please enter an override note'); return; }
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'override_issue', overrideIssueId: issueId, overrideNote: note }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Issue overridden');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Override failed');
    }
  };

  const isReadOnly = status === 'approved' || status === 'rejected';
  const totalErrors = validationIssues.filter((i) => i.severity === 'error' && !i.isOverridden).length;
  const totalWarnings = validationIssues.filter((i) => i.severity === 'warning' && !i.isOverridden).length;

  return (
    <div className="space-y-5">
      {/* Validation summary */}
      {(totalErrors > 0 || totalWarnings > 0) && (
        <div className={cn(
          'rounded-lg border p-4 flex items-start gap-3',
          totalErrors > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'
        )}>
          <AlertTriangle className={cn('w-4 h-4 mt-0.5 shrink-0', totalErrors > 0 ? 'text-red-400' : 'text-amber-400')} />
          <div>
            <p className={cn('text-xs font-semibold', totalErrors > 0 ? 'text-red-400' : 'text-amber-400')}>
              Validation Issues Detected
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalErrors > 0 && `${totalErrors} error${totalErrors !== 1 ? 's' : ''} · `}
              {totalWarnings > 0 && `${totalWarnings} warning${totalWarnings !== 1 ? 's' : ''}`}
              {' — Review and correct or override below.'}
            </p>
          </div>
        </div>
      )}

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELD_CONFIG.map(({ key, label, type, required, ...rest }) => {
          const conf = confidenceScores[key];
          const isLow = conf && conf.confidence < 0.65;
          const issues = fieldIssues(key);
          const errField = hasError(key);
          const warnField = hasWarning(key);

          const inputClass = cn(
            'w-full rounded-lg border px-3 py-2 text-sm bg-background text-foreground transition-colors outline-none',
            'focus:ring-2 focus:ring-primary/30 focus:border-primary',
            errField ? 'border-red-500/50 bg-red-500/5' :
            warnField ? 'border-amber-500/50 bg-amber-500/5' :
            isLow ? 'border-amber-500/30' : 'border-border',
            isReadOnly && 'opacity-60 cursor-not-allowed'
          );

          return (
            <div key={key} className={cn('space-y-1', key === 'remarks' && 'sm:col-span-2')}>
              <div className="flex items-center justify-between">
                <label className="field-label">
                  {label}
                  {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                {conf && <FieldConfidenceBadge field={conf} />}
              </div>

              {type === 'select' ? (
                <select
                  value={record[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  disabled={isReadOnly}
                  className={inputClass}
                >
                  <option value="">— Select —</option>
                  {(rest as { options?: string[] }).options?.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : type === 'textarea' ? (
                <textarea
                  value={record[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  disabled={isReadOnly}
                  rows={2}
                  className={cn(inputClass, 'resize-none')}
                  placeholder="Optional remarks…"
                />
              ) : (
                <input
                  type={type}
                  value={record[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  disabled={isReadOnly}
                  className={inputClass}
                  step={type === 'number' ? 'any' : undefined}
                />
              )}

              {/* Inline validation issues */}
              {issues.map((issue) => (
                <div key={issue.id} className="rounded-md border border-border bg-muted/30 p-2.5 space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    {issue.severity === 'error' ? (
                      <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                    ) : (
                      <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                    )}
                    <p className="text-[10px] text-foreground leading-tight">{issue.message}</p>
                  </div>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1.5 pl-4">
                      <input
                        type="text"
                        placeholder="Override reason…"
                        value={overrideStates[issue.id] ?? ''}
                        onChange={(e) => setOverrideStates((prev) => ({ ...prev, [issue.id]: e.target.value }))}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-[10px] text-foreground"
                      />
                      <button
                        onClick={() => overrideIssue(issue.id)}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-colors"
                      >
                        Override
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Review notes */}
      {!isReadOnly && (
        <div className="space-y-1">
          <label className="field-label">Review Notes</label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            placeholder="Add notes about this document (optional)…"
          />
        </div>
      )}

      {/* Action buttons */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <button
            onClick={() => doAction('save_review')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-muted border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => doAction('approve')}
            disabled={saving || totalErrors > 0}
            title={totalErrors > 0 ? 'Fix all errors before approving' : ''}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm font-semibold text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve
          </button>
          <button
            onClick={() => doAction('reject')}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Reject
          </button>
        </div>
      )}

      {isReadOnly && (
        <div className="pt-2 border-t border-border flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">This document has been {status}.</span>
        </div>
      )}
    </div>
  );
}
