'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { DocumentStatus } from '@/lib/types';
import { formatDateTime, formatBytes } from '@/lib/utils';
import { Search, Filter, X, ArrowRight, Download, Loader2 } from 'lucide-react';

interface DocumentRow {
  id: string;
  originalName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  extractedRecord: {
    workOrderNumber: string | null;
    machineNumber: string | null;
    shift: string | null;
    overallConfidence: number | null;
  } | null;
  _count: { validationIssues: number };
}

interface PaginatedData {
  items: DocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const STATUS_OPTIONS: DocumentStatus[] = ['uploaded','processing','extracted','needs_review','approved','rejected'];
const SHIFT_OPTIONS = ['A', 'B', 'C', 'Night'];

export function HistoryClient() {
  const [data, setData] = useState<PaginatedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [shift, setShift] = useState('');
  const [machine, setMachine] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (overridePage = page) => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (shift) params.set('shift', shift);
      if (machine) params.set('machineNumber', machine);
      params.set('page', String(overridePage));
      params.set('pageSize', '15');

      const res = await fetch(`/api/documents?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [search, status, shift, machine, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(1);
  };

  const clearFilters = () => {
    setSearch(''); setStatus(''); setShift(''); setMachine('');
    setPage(1); setData(null); setSearched(false);
  };

  const goPage = (p: number) => {
    setPage(p);
    fetchData(p);
  };

  const exportCSV = () => {
    if (!data?.items.length) return;
    const rows = [
      ['ID','Name','Status','Work Order','Machine','Shift','Confidence','Uploaded'],
      ...data.items.map((d) => [
        d.id, d.originalName, d.status,
        d.extractedRecord?.workOrderNumber ?? '',
        d.extractedRecord?.machineNumber ?? '',
        d.extractedRecord?.shift ?? '',
        d.extractedRecord?.overallConfidence != null ? String(Math.round(d.extractedRecord.overallConfidence * 100)) + '%' : '',
        new Date(d.uploadedAt).toLocaleString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `manufacturing_export_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Search & filter form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 xl:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by filename or work order…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
              />
            </div>

            {/* Status filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>

            {/* Shift filter */}
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            >
              <option value="">All Shifts</option>
              {SHIFT_OPTIONS.map((s) => <option key={s} value={s}>Shift {s}</option>)}
            </select>
          </div>

          {/* Machine filter */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              placeholder="Machine No. (e.g. MC-101)"
              className="w-56 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
            {searched && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
            {data && data.items.length > 0 && (
              <button
                type="button"
                onClick={exportCSV}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results */}
      {!searched && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Enter search criteria above to find documents</p>
        </div>
      )}

      {searched && !loading && data && data.items.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No documents match your search criteria</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total} documents
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Document', 'Work Order', 'Machine', 'Shift', 'Confidence', 'Status', 'Uploaded', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((doc) => (
                  <tr key={doc.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground max-w-[160px] truncate">{doc.originalName}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBytes(doc.fileSize)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-foreground">{doc.extractedRecord?.workOrderNumber ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-foreground">{doc.extractedRecord?.machineNumber ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground">{doc.extractedRecord?.shift ? `Shift ${doc.extractedRecord.shift}` : '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.extractedRecord?.overallConfidence != null ? (
                        <ConfidenceIndicator confidence={doc.extractedRecord.overallConfidence} showBar={false} showIcon={true} />
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status as DocumentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">{formatDateTime(doc.uploadedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => goPage(data.page - 1)}
                disabled={data.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => goPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    p === data.page
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => goPage(data.page + 1)}
                disabled={data.page >= data.totalPages}
                className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
