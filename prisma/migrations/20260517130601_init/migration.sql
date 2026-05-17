-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" DATETIME,
    "reviewedAt" DATETIME,
    "approvedAt" DATETIME,
    "rawOcrText" TEXT,
    "ocrConfidence" REAL,
    "pageCount" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "ExtractedRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "date" TEXT,
    "shift" TEXT,
    "employeeNumber" TEXT,
    "operationCode" TEXT,
    "machineNumber" TEXT,
    "workOrderNumber" TEXT,
    "quantityProduced" REAL,
    "timeTaken" REAL,
    "batchNumber" TEXT,
    "productCode" TEXT,
    "supervisorId" TEXT,
    "qualityGrade" TEXT,
    "remarks" TEXT,
    "confidenceScores" TEXT NOT NULL DEFAULT '{}',
    "extractionModel" TEXT,
    "extractionPromptVersion" TEXT NOT NULL DEFAULT 'v1',
    "extractionDurationMs" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "rawLlmResponse" TEXT,
    "overallConfidence" REAL,
    "isManuallyReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExtractedRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideNote" TEXT,
    "overriddenBy" TEXT,
    "overriddenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationIssue_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_uploadedAt_idx" ON "Document"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractedRecord_documentId_key" ON "ExtractedRecord"("documentId");

-- CreateIndex
CREATE INDEX "ExtractedRecord_workOrderNumber_idx" ON "ExtractedRecord"("workOrderNumber");

-- CreateIndex
CREATE INDEX "ExtractedRecord_machineNumber_idx" ON "ExtractedRecord"("machineNumber");

-- CreateIndex
CREATE INDEX "ExtractedRecord_shift_idx" ON "ExtractedRecord"("shift");

-- CreateIndex
CREATE INDEX "ExtractedRecord_date_idx" ON "ExtractedRecord"("date");

-- CreateIndex
CREATE INDEX "ValidationIssue_documentId_idx" ON "ValidationIssue"("documentId");

-- CreateIndex
CREATE INDEX "ValidationIssue_severity_idx" ON "ValidationIssue"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_documentId_idx" ON "AuditLog"("documentId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
