import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DocumentFilters, DocumentStatus } from '@/lib/types';
import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';

// ── GET /api/documents — list with filters ─────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: DocumentFilters = {
      status: searchParams.get('status') as DocumentStatus | undefined,
      shift: searchParams.get('shift') ?? undefined,
      machineNumber: searchParams.get('machineNumber') ?? undefined,
      workOrderNumber: searchParams.get('workOrderNumber') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: parseInt(searchParams.get('page') ?? '1'),
      pageSize: parseInt(searchParams.get('pageSize') ?? '20'),
    };

    const where: Record<string, unknown> = {};

    if (filters.status) where.status = filters.status;

    if (filters.search) {
      where.OR = [
        { originalName: { contains: filters.search } },
        { extractedRecord: { workOrderNumber: { contains: filters.search } } },
        { extractedRecord: { machineNumber: { contains: filters.search } } },
      ];
    }

    if (filters.machineNumber || filters.shift || filters.workOrderNumber) {
      where.extractedRecord = {
        ...(filters.machineNumber ? { machineNumber: filters.machineNumber } : {}),
        ...(filters.shift ? { shift: filters.shift } : {}),
        ...(filters.workOrderNumber ? { workOrderNumber: { contains: filters.workOrderNumber } } : {}),
      };
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          extractedRecord: true,
          validationIssues: { where: { isOverridden: false } },
          _count: { select: { auditLogs: true } },
        },
        orderBy: { uploadedAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: documents,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('[GET /api/documents]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// ── POST /api/documents — upload ───────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} not supported` },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? '10') * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size is ${process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 10}MB` },
        { status: 400 }
      );
    }

    // Save file to uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });

    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFilename = `${timestamp}_${safeFilename}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Create document record
    const document = await prisma.document.create({
      data: {
        filename: uniqueFilename,
        originalName: file.name,
        filePath: `/uploads/${uniqueFilename}`,
        fileSize: file.size,
        mimeType: file.type,
        status: 'uploaded',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        documentId: document.id,
        action: 'uploaded',
        actor: 'user',
        details: JSON.stringify({ filename: file.name, size: file.size }),
      },
    });

    return NextResponse.json({ success: true, data: document }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/documents]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
