import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

const SHIFTS = ['A', 'B', 'C', 'Night'];
const MACHINES = ['MC-101', 'MC-102', 'MC-103', 'MC-204', 'MC-305', 'WLD-01', 'ASM-07'];
const STATUSES = ['approved', 'approved', 'approved', 'needs_review', 'rejected'];
const OPERATION_CODES = ['OP-001', 'OP-002', 'OP-003', 'WLD-010', 'ASM-020', 'QC-030'];

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.auditLog.deleteMany();
  await prisma.validationIssue.deleteMany();
  await prisma.extractedRecord.deleteMany();
  await prisma.document.deleteMany();

  for (let i = 0; i < 25; i++) {
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
    const machine = MACHINES[Math.floor(Math.random() * MACHINES.length)];
    const shift = SHIFTS[Math.floor(Math.random() * SHIFTS.length)];
    const date = faker.date.recent({ days: 30 });
    const qty = Math.floor(Math.random() * 500) + 50;
    const time = +(Math.random() * 8 + 1).toFixed(2);

    const doc = await prisma.document.create({
      data: {
        filename: `doc_${i + 1}_${Date.now()}.jpg`,
        originalName: `work_order_${Math.floor(Math.random() * 9000) + 1000}.jpg`,
        filePath: `/uploads/seed/sample_${i + 1}.jpg`,
        fileSize: Math.floor(Math.random() * 2000000) + 100000,
        mimeType: 'image/jpeg',
        status,
        uploadedAt: date,
        processedAt: new Date(date.getTime() + 30000),
        reviewedAt: status !== 'uploaded' ? new Date(date.getTime() + 120000) : null,
        rawOcrText: `WORK ORDER FORM\nDate: ${date.toLocaleDateString()}\nShift: ${shift}\nMachine: ${machine}\nQty: ${qty}\nTime: ${time}h`,
        ocrConfidence: +(0.7 + Math.random() * 0.3).toFixed(2),
      },
    });

    const confidenceScores = {
      date: { value: date.toISOString().split('T')[0], confidence: +(0.7 + Math.random() * 0.3).toFixed(2), source: 'llm' },
      shift: { value: shift, confidence: +(0.6 + Math.random() * 0.4).toFixed(2), source: 'llm' },
      employeeNumber: { value: `EMP-${Math.floor(Math.random() * 900) + 100}`, confidence: +(0.5 + Math.random() * 0.5).toFixed(2), source: 'llm' },
      operationCode: { value: OPERATION_CODES[Math.floor(Math.random() * OPERATION_CODES.length)], confidence: +(0.65 + Math.random() * 0.35).toFixed(2), source: 'llm' },
      machineNumber: { value: machine, confidence: +(0.75 + Math.random() * 0.25).toFixed(2), source: 'llm' },
      workOrderNumber: { value: `WO-${Math.floor(Math.random() * 90000) + 10000}`, confidence: +(0.8 + Math.random() * 0.2).toFixed(2), source: 'llm' },
      quantityProduced: { value: qty, confidence: +(0.6 + Math.random() * 0.4).toFixed(2), source: 'llm' },
      timeTaken: { value: time, confidence: +(0.55 + Math.random() * 0.45).toFixed(2), source: 'llm' },
    };

    await prisma.extractedRecord.create({
      data: {
        documentId: doc.id,
        date: date.toISOString().split('T')[0],
        shift,
        employeeNumber: confidenceScores.employeeNumber.value,
        operationCode: confidenceScores.operationCode.value,
        machineNumber: machine,
        workOrderNumber: confidenceScores.workOrderNumber.value,
        quantityProduced: qty,
        timeTaken: time,
        confidenceScores: JSON.stringify(confidenceScores),
        extractionModel: 'gpt-4o-mini',
        overallConfidence: +(Object.values(confidenceScores).reduce((a, b) => a + b.confidence, 0) / 8).toFixed(2),
        isManuallyReviewed: status === 'approved',
      },
    });

    if (Math.random() > 0.5) {
      await prisma.validationIssue.create({
        data: {
          documentId: doc.id,
          field: Math.random() > 0.5 ? 'quantityProduced' : 'timeTaken',
          rule: Math.random() > 0.5 ? 'quantity_spike' : 'time_range',
          message: Math.random() > 0.5 ? 'Quantity significantly above average for this machine' : 'Time value seems unusually high',
          severity: Math.random() > 0.5 ? 'warning' : 'error',
          isOverridden: status === 'approved',
        },
      });
    }

    await prisma.auditLog.createMany({
      data: [
        { documentId: doc.id, action: 'uploaded', actor: 'user', createdAt: date },
        { documentId: doc.id, action: 'ocr_completed', actor: 'system', createdAt: new Date(date.getTime() + 15000) },
        { documentId: doc.id, action: 'extraction_completed', actor: 'system', createdAt: new Date(date.getTime() + 30000) },
        ...(status === 'approved' ? [{ documentId: doc.id, action: 'approved', actor: 'reviewer', createdAt: new Date(date.getTime() + 120000) }] : []),
      ],
    });
  }

  console.log('✅ Seeded 25 documents with extracted records, validation issues, and audit logs.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
