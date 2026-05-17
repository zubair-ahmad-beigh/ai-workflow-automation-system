import { FileUploader } from '@/components/upload/FileUploader';
import { prisma } from '@/lib/prisma';
import { formatBytes, formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { DocumentStatus } from '@/lib/types';
import Link from 'next/link';
import { Upload, Clock, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getRecentUploads() {
  return prisma.document.findMany({
    orderBy: { uploadedAt: 'desc' },
    take: 8,
    select: {
      id: true, originalName: true, fileSize: true,
      mimeType: true, status: true, uploadedAt: true,
    },
  });
}

export default async function UploadPage() {
  const recent = await getRecentUploads();

  return (
    <div>
      <div className="page-header px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Upload className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Upload Documents</h1>
            <p className="text-sm text-muted-foreground">
              Upload manufacturing work order images or PDFs for AI extraction
            </p>
          </div>
        </div>
      </div>

      <div className="page-content grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Uploader */}
        <div className="xl:col-span-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Select Files</h2>
            <FileUploader />
          </div>

          {/* Tips */}
          <div className="mt-4 rounded-xl border border-border bg-card p-5 space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tips for best results</p>
            {[
              'Ensure document is well-lit and not blurry',
              'Keep the document flat — avoid curved or folded pages',
              'Include the entire form in frame with minimal background',
              'For PDFs with multiple pages, each page is processed separately',
              'Handwritten text is supported — print is more accurate',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent uploads */}
        <div className="xl:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recent Uploads
              </h2>
            </div>
            {recent.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No uploads yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recent.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatBytes(doc.fileSize)}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(doc.uploadedAt)}</span>
                      </div>
                    </div>
                    <StatusBadge status={doc.status as DocumentStatus} showIcon={false} />
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
