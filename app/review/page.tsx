import { prisma } from '@/lib/prisma';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { DocumentStatus } from '@/lib/types';
import { formatDateTime, formatBytes } from '@/lib/utils';
import Link from 'next/link';
import { ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getReviewQueue() {
  return prisma.document.findMany({
    where: { status: { in: ['needs_review', 'extracted'] } },
    orderBy: { uploadedAt: 'desc' },
    include: {
      extractedRecord: {
        select: {
          machineNumber: true, shift: true,
          workOrderNumber: true, overallConfidence: true,
        },
      },
      validationIssues: {
        where: { isOverridden: false },
        select: { severity: true },
      },
    },
  });
}

export default async function ReviewPage() {
  const queue = await getReviewQueue();

  const errorCounts = queue.map((d) => d.validationIssues.filter((i) => i.severity === 'error').length);
  const warningCounts = queue.map((d) => d.validationIssues.filter((i) => i.severity === 'warning').length);

  return (
    <div>
      <div className="page-header px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Review Queue</h1>
              <p className="text-sm text-muted-foreground">
                {queue.length} document{queue.length !== 1 ? 's' : ''} awaiting review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                {queue.length} pending
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {queue.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-16 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground">Queue is clear</p>
            <p className="text-xs text-muted-foreground mt-1">All documents have been reviewed</p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              Upload more documents
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Document', 'Work Order', 'Machine', 'Shift', 'Confidence', 'Issues', 'Status', 'Uploaded', ''].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {queue.map((doc, i) => (
                  <tr key={doc.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground max-w-[160px] truncate">
                        {doc.originalName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatBytes(doc.fileSize)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-foreground">
                        {doc.extractedRecord?.workOrderNumber ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-foreground">
                        {doc.extractedRecord?.machineNumber ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-foreground">
                        {doc.extractedRecord?.shift ? `Shift ${doc.extractedRecord.shift}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {doc.extractedRecord?.overallConfidence != null ? (
                        <ConfidenceIndicator
                          confidence={doc.extractedRecord.overallConfidence}
                          showBar={true}
                          showIcon={false}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {errorCounts[i] > 0 && (
                          <span className="badge-error">{errorCounts[i]} err</span>
                        )}
                        {warningCounts[i] > 0 && (
                          <span className="badge-warning">{warningCounts[i]} warn</span>
                        )}
                        {errorCounts[i] === 0 && warningCounts[i] === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status as DocumentStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(doc.uploadedAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Review
                        <ArrowRight className="w-3 h-3" />
                      </Link>
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
