import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractTextFromImage, preprocessOcrText } from '@/lib/services/ocr';
import { extractFromOcr, extractFromOcrDemo } from '@/lib/services/extraction';
import { validateRecord } from '@/lib/services/validation';
import { getMachineAverageQty } from '@/lib/services/analytics';
import { safeParseJson } from '@/lib/utils';
import { ConfidenceMap } from '@/lib/types';

// ── POST /api/extract/[id] — run full OCR + AI extraction ──────
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (document.status === 'processing') {
      return NextResponse.json({ success: false, error: 'Already processing' }, { status: 409 });
    }

    // Mark as processing
    await prisma.document.update({
      where: { id },
      data: { status: 'processing' },
    });

    await prisma.auditLog.create({
      data: { documentId: id, action: 'ocr_started', actor: 'system' },
    });

    // ── Step 1: OCR ──────────────────────────────────────────
    let rawOcrText = '';
    let ocrConfidence = 0;

    try {
      const ocrResult = await extractTextFromImage(document.filePath);
      rawOcrText = preprocessOcrText(ocrResult.text);
      ocrConfidence = ocrResult.confidence;

      await prisma.document.update({
        where: { id },
        data: { rawOcrText, ocrConfidence },
      });

      await prisma.auditLog.create({
        data: {
          documentId: id,
          action: 'ocr_completed',
          actor: 'system',
          details: JSON.stringify({
            confidence: ocrConfidence,
            wordCount: ocrResult.wordCount,
            durationMs: ocrResult.durationMs,
          }),
        },
      });
    } catch (ocrError) {
      console.error('[Extract] OCR failed:', ocrError);
      // Use existing text or empty string if OCR fails
      rawOcrText = document.rawOcrText ?? '';
    }

    // ── Step 2: AI Extraction ───────────────────────────────
    await prisma.auditLog.create({
      data: { documentId: id, action: 'extraction_started', actor: 'system' },
    });

    // Use demo mode if no API key configured
    const apiKey = process.env.OPENAI_API_KEY ?? process.env.GROQ_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '';
    const isDemoMode = !apiKey || apiKey.includes('your-') || apiKey === '';

    const extractionResult = isDemoMode
      ? await extractFromOcrDemo(rawOcrText || 'Sample manufacturing document')
      : await extractFromOcr(rawOcrText);

    // ── Step 3: Validation ───────────────────────────────────
    const machineAvgQty = await getMachineAverageQty();
    const existingWorkOrders = await prisma.extractedRecord.findMany({
      where: { workOrderNumber: { not: null }, documentId: { not: id } },
      select: { workOrderNumber: true },
    });

    const validationResult = validateRecord(extractionResult.record, {
      machineAverageQty: machineAvgQty,
      existingWorkOrders: existingWorkOrders.map((r) => r.workOrderNumber!),
    });

    // ── Step 4: Save results ─────────────────────────────────
    // Upsert extracted record
    await prisma.extractedRecord.upsert({
      where: { documentId: id },
      create: {
        documentId: id,
        date: extractionResult.record.date,
        shift: extractionResult.record.shift,
        employeeNumber: extractionResult.record.employeeNumber,
        operationCode: extractionResult.record.operationCode,
        machineNumber: extractionResult.record.machineNumber,
        workOrderNumber: extractionResult.record.workOrderNumber,
        quantityProduced: extractionResult.record.quantityProduced,
        timeTaken: extractionResult.record.timeTaken,
        batchNumber: extractionResult.record.batchNumber,
        productCode: extractionResult.record.productCode,
        remarks: extractionResult.record.remarks,
        confidenceScores: JSON.stringify(extractionResult.confidenceScores),
        extractionModel: extractionResult.extractionModel,
        overallConfidence: extractionResult.overallConfidence,
        rawLlmResponse: extractionResult.rawLlmResponse,
        extractionDurationMs: extractionResult.durationMs,
        retryCount: extractionResult.retryCount,
      },
      update: {
        date: extractionResult.record.date,
        shift: extractionResult.record.shift,
        employeeNumber: extractionResult.record.employeeNumber,
        operationCode: extractionResult.record.operationCode,
        machineNumber: extractionResult.record.machineNumber,
        workOrderNumber: extractionResult.record.workOrderNumber,
        quantityProduced: extractionResult.record.quantityProduced,
        timeTaken: extractionResult.record.timeTaken,
        batchNumber: extractionResult.record.batchNumber,
        productCode: extractionResult.record.productCode,
        remarks: extractionResult.record.remarks,
        confidenceScores: JSON.stringify(extractionResult.confidenceScores),
        extractionModel: extractionResult.extractionModel,
        overallConfidence: extractionResult.overallConfidence,
        rawLlmResponse: extractionResult.rawLlmResponse,
        extractionDurationMs: extractionResult.durationMs,
        retryCount: extractionResult.retryCount,
        updatedAt: new Date(),
      },
    });

    // Clear old validation issues and save new ones
    await prisma.validationIssue.deleteMany({ where: { documentId: id } });
    if (validationResult.issues.length > 0) {
      await prisma.validationIssue.createMany({
        data: validationResult.issues.map((issue) => ({
          documentId: id,
          field: issue.field,
          rule: issue.rule,
          message: issue.message,
          severity: issue.severity,
        })),
      });
    }

    // Determine final status
    const hasErrors = validationResult.errorCount > 0;
    const hasWarnings = validationResult.warningCount > 0;
    const newStatus = hasErrors || hasWarnings ? 'needs_review' : 'extracted';

    await prisma.document.update({
      where: { id },
      data: { status: newStatus, processedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        documentId: id,
        action: 'extraction_completed',
        actor: 'system',
        details: JSON.stringify({
          model: extractionResult.extractionModel,
          confidence: extractionResult.overallConfidence,
          durationMs: extractionResult.durationMs,
          validationErrors: validationResult.errorCount,
          validationWarnings: validationResult.warningCount,
          isDemoMode,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId: id,
        status: newStatus,
        extraction: {
          model: extractionResult.extractionModel,
          confidence: extractionResult.overallConfidence,
          durationMs: extractionResult.durationMs,
          isDemoMode,
        },
        validation: {
          isValid: validationResult.isValid,
          errorCount: validationResult.errorCount,
          warningCount: validationResult.warningCount,
        },
      },
    });
  } catch (error) {
    console.error('[POST /api/extract/[id]]', error);

    // Mark as needing review on failure
    await prisma.document.update({
      where: { id },
      data: { status: 'needs_review' },
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
