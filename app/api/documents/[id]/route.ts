import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeParseJson } from '@/lib/utils';
import { ConfidenceMap } from '@/lib/types';

// ── GET /api/documents/[id] ────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        extractedRecord: true,
        validationIssues: { orderBy: { severity: 'asc' } },
        auditLogs: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    // Parse confidence scores JSON
    const doc = {
      ...document,
      extractedRecord: document.extractedRecord
        ? {
            ...document.extractedRecord,
            confidenceScores: safeParseJson<ConfidenceMap>(
              document.extractedRecord.confidenceScores,
              {}
            ),
          }
        : null,
    };

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('[GET /api/documents/[id]]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch document' }, { status: 500 });
  }
}

// ── PUT /api/documents/[id] — update review ────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, record, reviewNotes, overrideIssueId, overrideNote } = body;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (action === 'save_review' && record) {
      // Update extracted record
      await prisma.extractedRecord.update({
        where: { documentId: id },
        data: {
          date: record.date,
          shift: record.shift,
          employeeNumber: record.employeeNumber,
          operationCode: record.operationCode,
          machineNumber: record.machineNumber,
          workOrderNumber: record.workOrderNumber,
          quantityProduced: record.quantityProduced ? parseFloat(record.quantityProduced) : null,
          timeTaken: record.timeTaken ? parseFloat(record.timeTaken) : null,
          batchNumber: record.batchNumber,
          productCode: record.productCode,
          remarks: record.remarks,
          isManuallyReviewed: true,
          reviewNotes,
          updatedAt: new Date(),
        },
      });

      await prisma.document.update({
        where: { id },
        data: { status: 'needs_review', reviewedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          documentId: id,
          action: 'review_saved',
          actor: 'reviewer',
          details: JSON.stringify({ reviewNotes }),
        },
      });

      return NextResponse.json({ success: true, message: 'Review saved' });
    }

    if (action === 'approve') {
      await prisma.document.update({
        where: { id },
        data: { status: 'approved', approvedAt: new Date(), reviewedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: { documentId: id, action: 'approved', actor: 'reviewer' },
      });

      return NextResponse.json({ success: true, message: 'Document approved' });
    }

    if (action === 'reject') {
      await prisma.document.update({
        where: { id },
        data: { status: 'rejected', reviewedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          documentId: id,
          action: 'rejected',
          actor: 'reviewer',
          details: JSON.stringify({ reason: reviewNotes }),
        },
      });

      return NextResponse.json({ success: true, message: 'Document rejected' });
    }

    if (action === 'override_issue' && overrideIssueId) {
      await prisma.validationIssue.update({
        where: { id: overrideIssueId },
        data: {
          isOverridden: true,
          overrideNote,
          overriddenAt: new Date(),
          overriddenBy: 'reviewer',
        },
      });

      await prisma.auditLog.create({
        data: {
          documentId: id,
          action: 'validation_overridden',
          actor: 'reviewer',
          details: JSON.stringify({ issueId: overrideIssueId, note: overrideNote }),
        },
      });

      return NextResponse.json({ success: true, message: 'Issue overridden' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[PUT /api/documents/[id]]', error);
    return NextResponse.json({ success: false, error: 'Failed to update document' }, { status: 500 });
  }
}

// ── DELETE /api/documents/[id] ─────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('[DELETE /api/documents/[id]]', error);
    return NextResponse.json({ success: false, error: 'Failed to delete document' }, { status: 500 });
  }
}
