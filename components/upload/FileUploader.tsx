'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Upload, FileImage, FileText, X, CheckCircle2,
  Loader2, AlertCircle, UploadCloud,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  preview: string | null;
  status: 'pending' | 'uploading' | 'done' | 'error';
  documentId?: string;
  error?: string;
}

export function FileUploader() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadedFile[] = accepted.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/tiff': ['.tiff', '.tif'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    onDropRejected: (rejections) => {
      rejections.forEach((r) => {
        toast.error(`${r.file.name}: ${r.errors[0]?.message ?? 'Rejected'}`);
      });
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const f = prev[index];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' } : f))
      );

      try {
        const formData = new FormData();
        formData.append('file', files[i].file);

        const res = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? 'Upload failed');
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'done', documentId: data.data.id } : f
          )
        );

        toast.success(`${files[i].file.name} uploaded successfully`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: 'error', error: msg } : f))
        );
        toast.error(`${files[i].file.name}: ${msg}`);
      }
    }

    setIsUploading(false);
  };

  const extractDocument = async (documentId: string, filename: string) => {
    toast.promise(
      fetch(`/api/extract/${documentId}`, { method: 'POST' }).then(async (res) => {
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data;
      }),
      {
        loading: `Running OCR + AI extraction on ${filename}…`,
        success: (data) => {
          router.push(`/documents/${documentId}`);
          return `Extracted! Confidence: ${Math.round(data.data.extraction.confidence * 100)}%`;
        },
        error: (err) => `Extraction failed: ${err.message}`,
      }
    );
  };

  const doneFiles = files.filter((f) => f.status === 'done');
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 cursor-pointer text-center',
          isDragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-accent/30'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive ? 'bg-primary/20' : 'bg-muted'
          )}>
            <UploadCloud className={cn('w-7 h-7', isDragActive ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isDragActive ? 'Drop files here' : 'Drag & drop manufacturing documents'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WEBP, TIFF, PDF · Max 10MB per file
            </p>
          </div>
          <button
            type="button"
            className="px-4 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
          >
            Browse files
          </button>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
              </button>
            )}
          </div>

          {files.map((f, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                f.status === 'done' ? 'border-green-500/20 bg-green-500/5' :
                f.status === 'error' ? 'border-red-500/20 bg-red-500/5' :
                f.status === 'uploading' ? 'border-primary/20 bg-primary/5' :
                'border-border bg-card'
              )}
            >
              {/* Preview / icon */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{f.file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(f.file.size)}</p>
                {f.error && (
                  <p className="text-[10px] text-red-400 mt-0.5">{f.error}</p>
                )}
              </div>

              {/* Status / actions */}
              <div className="flex items-center gap-2 shrink-0">
                {f.status === 'pending' && (
                  <button
                    onClick={() => removeFile(i)}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {f.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {f.status === 'done' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <button
                      onClick={() => extractDocument(f.documentId!, f.file.name)}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/30 text-primary text-[10px] font-semibold hover:bg-primary/20 transition-colors"
                    >
                      <FileImage className="w-3 h-3" />
                      Extract
                    </button>
                  </>
                )}
                {f.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Done state — quick extract all */}
      {doneFiles.length > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
          <p className="text-xs font-semibold text-green-400">
            {doneFiles.length} document{doneFiles.length !== 1 ? 's' : ''} uploaded.
            Click <strong>Extract</strong> on each file to run OCR + AI extraction.
          </p>
        </div>
      )}
    </div>
  );
}
