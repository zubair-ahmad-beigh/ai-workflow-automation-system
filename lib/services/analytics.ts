/**
 * Analytics Service — queries for dashboard stats and charts
 */

import { prisma } from '../prisma';
import {
  AnalyticsSummary,
  DashboardStats,
  DailyCount,
  ShiftProduction,
  MachineProduction,
} from '../types';
import { safeParseJson } from '../utils';

export async function getDashboardStats(): Promise<DashboardStats> {
  const [total, processed, approved, needsReview, rejected, today] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: { in: ['extracted', 'needs_review', 'approved', 'rejected'] } } }),
    prisma.document.count({ where: { status: 'approved' } }),
    prisma.document.count({ where: { status: 'needs_review' } }),
    prisma.document.count({ where: { status: 'rejected' } }),
    prisma.document.count({
      where: {
        uploadedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  // Average confidence from extracted records
  const records = await prisma.extractedRecord.findMany({
    select: { overallConfidence: true },
    where: { overallConfidence: { not: null } },
  });
  const avgConfidence =
    records.length > 0
      ? records.reduce((acc, r) => acc + (r.overallConfidence ?? 0), 0) / records.length
      : 0;

  // Weekly trend (last 7 days)
  const weeklyTrend: DailyCount[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = await prisma.document.count({
      where: { uploadedAt: { gte: day, lt: nextDay } },
    });
    weeklyTrend.push({
      date: day.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
      count,
    });
  }

  return {
    totalDocuments: total,
    processed,
    approved,
    needsReview,
    rejected,
    averageConfidence: +avgConfidence.toFixed(3),
    todayUploads: today,
    weeklyTrend,
  };
}

export async function getShiftProduction(): Promise<ShiftProduction[]> {
  const records = await prisma.extractedRecord.findMany({
    select: { shift: true, quantityProduced: true },
    where: { shift: { not: null } },
  });

  const shiftMap: Record<string, { quantity: number; documents: number }> = {};
  for (const r of records) {
    const shift = r.shift ?? 'Unknown';
    if (!shiftMap[shift]) shiftMap[shift] = { quantity: 0, documents: 0 };
    shiftMap[shift].quantity += r.quantityProduced ?? 0;
    shiftMap[shift].documents += 1;
  }

  return Object.entries(shiftMap)
    .map(([shift, data]) => ({ shift, ...data }))
    .sort((a, b) => b.quantity - a.quantity);
}

export async function getMachineProduction(): Promise<MachineProduction[]> {
  const records = await prisma.extractedRecord.findMany({
    select: { machineNumber: true, quantityProduced: true, overallConfidence: true },
    where: { machineNumber: { not: null } },
  });

  const machineMap: Record<
    string,
    { quantity: number; documents: number; totalConfidence: number }
  > = {};
  for (const r of records) {
    const m = r.machineNumber ?? 'Unknown';
    if (!machineMap[m]) machineMap[m] = { quantity: 0, documents: 0, totalConfidence: 0 };
    machineMap[m].quantity += r.quantityProduced ?? 0;
    machineMap[m].documents += 1;
    machineMap[m].totalConfidence += r.overallConfidence ?? 0;
  }

  return Object.entries(machineMap)
    .map(([machineNumber, data]) => ({
      machineNumber,
      quantity: data.quantity,
      documents: data.documents,
      avgConfidence: data.documents > 0 ? +(data.totalConfidence / data.documents).toFixed(3) : 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [stats, shiftProduction, machineProduction, recentActivityRaw] = await Promise.all([
    getDashboardStats(),
    getShiftProduction(),
    getMachineProduction(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { document: { select: { originalName: true } } },
    }),
  ]);

  const [errors, warnings, overridden] = await Promise.all([
    prisma.validationIssue.count({ where: { severity: 'error' } }),
    prisma.validationIssue.count({ where: { severity: 'warning' } }),
    prisma.validationIssue.count({ where: { isOverridden: true } }),
  ]);

  const recentActivity = recentActivityRaw.map((log) => ({
    id: log.id,
    documentId: log.documentId,
    action: log.action,
    actor: log.actor,
    details: log.details,
    createdAt: log.createdAt,
  }));

  return {
    stats,
    shiftProduction,
    machineProduction,
    recentActivity,
    validationSummary: { errors, warnings, overridden },
  };
}

export async function getMachineAverageQty(): Promise<Record<string, number>> {
  const records = await prisma.extractedRecord.findMany({
    select: { machineNumber: true, quantityProduced: true },
    where: { machineNumber: { not: null }, quantityProduced: { not: null } },
  });

  const machineMap: Record<string, { total: number; count: number }> = {};
  for (const r of records) {
    const m = r.machineNumber!;
    if (!machineMap[m]) machineMap[m] = { total: 0, count: 0 };
    machineMap[m].total += r.quantityProduced!;
    machineMap[m].count += 1;
  }

  const result: Record<string, number> = {};
  for (const [m, { total, count }] of Object.entries(machineMap)) {
    result[m] = count > 0 ? total / count : 0;
  }
  return result;
}
