// ─────────────────────────────────────────────────────────────
// CORE TYPES for Manufacturing Workflow System
// ─────────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'needs_review'
  | 'approved'
  | 'rejected';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type AuditAction =
  | 'uploaded'
  | 'ocr_started'
  | 'ocr_completed'
  | 'extraction_started'
  | 'extraction_completed'
  | 'review_saved'
  | 'approved'
  | 'rejected'
  | 'validation_overridden'
  | 'reprocessed';

// ── Confidence Score per field ────────────────────────────────
export interface FieldConfidence {
  value: string | number | null;
  confidence: number; // 0.0 – 1.0
  source: 'ocr' | 'llm' | 'manual' | 'inferred';
}

export type ConfidenceMap = Record<string, FieldConfidence>;

// ── Extracted Manufacturing Record ────────────────────────────
export interface ManufacturingRecord {
  date: string | null;
  shift: string | null;
  employeeNumber: string | null;
  operationCode: string | null;
  machineNumber: string | null;
  workOrderNumber: string | null;
  quantityProduced: number | null;
  timeTaken: number | null;
  batchNumber?: string | null;
  productCode?: string | null;
  supervisorId?: string | null;
  qualityGrade?: string | null;
  remarks?: string | null;
}

// ── LLM Extraction Result ─────────────────────────────────────
export interface ExtractionResult {
  record: ManufacturingRecord;
  confidenceScores: ConfidenceMap;
  overallConfidence: number;
  rawLlmResponse: string;
  extractionModel: string;
  durationMs: number;
  retryCount: number;
}

// ── Validation Issue ──────────────────────────────────────────
export interface ValidationIssueData {
  field: string;
  rule: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssueData[];
  errorCount: number;
  warningCount: number;
}

// ── Document with relations ───────────────────────────────────
export interface DocumentWithRelations {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  uploadedAt: Date;
  processedAt: Date | null;
  reviewedAt: Date | null;
  approvedAt: Date | null;
  rawOcrText: string | null;
  ocrConfidence: number | null;
  extractedRecord: ExtractedRecordData | null;
  validationIssues: ValidationIssueRecord[];
  auditLogs: AuditLogRecord[];
}

export interface ExtractedRecordData extends ManufacturingRecord {
  id: string;
  documentId: string;
  confidenceScores: ConfidenceMap;
  extractionModel: string | null;
  overallConfidence: number | null;
  isManuallyReviewed: boolean;
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationIssueRecord {
  id: string;
  documentId: string;
  field: string;
  rule: string;
  message: string;
  severity: ValidationSeverity;
  isOverridden: boolean;
  overrideNote: string | null;
  createdAt: Date;
}

export interface AuditLogRecord {
  id: string;
  documentId: string;
  action: string;
  actor: string;
  details: string | null;
  createdAt: Date;
}

// ── Analytics Types ───────────────────────────────────────────
export interface DashboardStats {
  totalDocuments: number;
  processed: number;
  approved: number;
  needsReview: number;
  rejected: number;
  averageConfidence: number;
  todayUploads: number;
  weeklyTrend: DailyCount[];
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface ShiftProduction {
  shift: string;
  quantity: number;
  documents: number;
}

export interface MachineProduction {
  machineNumber: string;
  quantity: number;
  documents: number;
  avgConfidence: number;
}

export interface AnalyticsSummary {
  stats: DashboardStats;
  shiftProduction: ShiftProduction[];
  machineProduction: MachineProduction[];
  recentActivity: AuditLogRecord[];
  validationSummary: { errors: number; warnings: number; overridden: number };
}

// ── API Response types ────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Filter / Search ───────────────────────────────────────────
export interface DocumentFilters {
  status?: DocumentStatus;
  shift?: string;
  machineNumber?: string;
  workOrderNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
