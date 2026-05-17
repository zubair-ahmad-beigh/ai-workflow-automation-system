import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ReviewForm } from '@/components/review/ReviewForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { DocumentStatus, ConfidenceMap, ValidationIssueRecord } from '@/lib/types';
import { safeParseJson, formatBytes, formatDateTime, formatDate, truncate } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft, FileText, Calendar, Clock, Cpu,
  AlertTriangle, CheckCircle2, FileSearch, RefreshCw,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getDocument(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      extractedRecord: true,
      validationIssues: { orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }] },
      auditLogs: { orderBy: { createdAt: 'desc' } },
    },
  });
}

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const confidenceScores = safeParseJson<ConfidenceMap>(
    doc.extractedRecord?.confidenceScores ?? null,
    {}
  );

  const hasExtraction = !!doc.extractedRecord;
  const status = doc.status as DocumentStatus;

  return (
    <div>
      {/* Header */}
      <div className="page-header px-6 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/review"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Review Queue
          </Link>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <FileText className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{doc.originalName}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <StatusBadge status={status} />
                <span className="text-xs text-muted-foreground">{formatBytes(doc.fileSize)}</span>
                <span className="text-xs text-muted-foreground">Uploaded {formatDateTime(doc.uploadedAt)}</span>
                {doc.extractedRecord?.overallConfidence != null && (
                  <ConfidenceIndicator
                    confidence={doc.extractedRecord.overallConfidence}
                    showBar={false}
                    size="sm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Re-extract button */}
          {(status === 'uploaded' || status === 'needs_review' || status === 'extracted') && (
            <form action={`/api/extract/${id}`} method="POST">
              <button
                formAction={`/api/extract/${id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {hasExtraction ? 'Re-extract' : 'Extract'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="page-content grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: image + OCR text */}
        <div className="xl:col-span-1 space-y-4">
          {/* Document preview */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Preview</p>
            </div>
            <div className="p-3">
              {doc.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doc.filePath}
                  alt={doc.originalName}
                  className="w-full rounded-lg object-contain max-h-80 bg-muted"
                />
              ) : (
                <div className="h-40 rounded-lg bg-muted flex flex-col items-center justify-center gap-2">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">PDF Preview</p>
                  <a
                    href={doc.filePath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Open PDF
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* OCR text */}
          {doc.rawOcrText && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">OCR Text</p>
                </div>
                {doc.ocrConfidence != null && (
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(doc.ocrConfidence * 100)}% confidence
                  </span>
                )}
              </div>
              <div className="p-3 max-h-56 overflow-y-auto">
                <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                  {doc.rawOcrText}
                </pre>
              </div>
            </div>
          )}

          {/* Extraction metadata */}
          {doc.extractedRecord && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Extraction Info</p>
              <div className="space-y-2">
                {[
                  { label: 'Model', value: doc.extractedRecord.extractionModel ?? '—' },
                  { label: 'Duration', value: doc.extractedRecord.extractionDurationMs ? `${doc.extractedRecord.extractionDurationMs}ms` : '—' },
                  { label: 'Retries', value: String(doc.extractedRecord.retryCount) },
                  { label: 'Processed', value: doc.processedAt ? formatDateTime(doc.processedAt) : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <span className="text-[10px] font-mono text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit log */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit Trail</p>
            </div>
            <div className="p-3 space-y-2 max-h-52 overflow-y-auto">
              {doc.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-foreground capitalize">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(log.createdAt)} · {log.actor}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Review form */}
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-foreground">Extracted Data — Review &amp; Edit</h2>
              {doc.extractedRecord?.overallConfidence != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Overall confidence</span>
                  <ConfidenceIndicator
                    confidence={doc.extractedRecord.overallConfidence}
                    showBar={true}
                    showIcon={true}
                    size="sm"
                  />
                </div>
              )}
            </div>

            {!hasExtraction ? (
              <div className="py-16 text-center space-y-3">
                <Cpu className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm font-semibold text-foreground">Not yet extracted</p>
                <p className="text-xs text-muted-foreground">
                  Click the Extract button to run OCR + AI extraction on this document.
                </p>
              </div>
            ) : (
              <ReviewForm
                documentId={id}
                initialRecord={{
                  date: doc.extractedRecord!.date,
                  shift: doc.extractedRecord!.shift,
                  employeeNumber: doc.extractedRecord!.employeeNumber,
                  operationCode: doc.extractedRecord!.operationCode,
                  machineNumber: doc.extractedRecord!.machineNumber,
                  workOrderNumber: doc.extractedRecord!.workOrderNumber,
                  quantityProduced: doc.extractedRecord!.quantityProduced,
                  timeTaken: doc.extractedRecord!.timeTaken,
                  batchNumber: doc.extractedRecord!.batchNumber,
                  productCode: doc.extractedRecord!.productCode,
                  remarks: doc.extractedRecord!.remarks,
                  reviewNotes: doc.extractedRecord!.reviewNotes,
                }}
                confidenceScores={confidenceScores}
                validationIssues={doc.validationIssues as ValidationIssueRecord[]}
                status={status}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
