/**
 * Validation Engine — modular, rule-based business validation
 * for manufacturing work order records.
 */

import { ManufacturingRecord, ValidationIssueData, ValidationResult, ValidationSeverity } from '../types';

// ── Rule interface ─────────────────────────────────────────────
interface ValidationRule {
  id: string;
  field: string;
  severity: ValidationSeverity;
  check: (record: ManufacturingRecord, context?: ValidationContext) => string | null;
}

interface ValidationContext {
  existingWorkOrders?: string[];
  machineAverageQty?: Record<string, number>;
}

// ── Shift values ───────────────────────────────────────────────
const VALID_SHIFTS = ['A', 'B', 'C', 'Night', 'night', 'NIGHT'];
const MACHINE_PATTERN = /^[A-Z]{2,5}-\d{2,4}$/;
const WORK_ORDER_PATTERN = /^[A-Z]{1,3}-\d{4,6}$/;
const EMPLOYEE_PATTERN = /^[A-Z]{2,4}-\d{2,4}$/;
const OPERATION_PATTERN = /^[A-Z]{2,4}-\d{3}$/;

// ── All validation rules ───────────────────────────────────────
const RULES: ValidationRule[] = [
  // ── Mandatory fields ────────────────────────────────────────
  {
    id: 'required_date',
    field: 'date',
    severity: 'error',
    check: (r) => (!r.date ? 'Date is required.' : null),
  },
  {
    id: 'required_shift',
    field: 'shift',
    severity: 'error',
    check: (r) => (!r.shift ? 'Shift is required.' : null),
  },
  {
    id: 'required_machine',
    field: 'machineNumber',
    severity: 'error',
    check: (r) => (!r.machineNumber ? 'Machine number is required.' : null),
  },
  {
    id: 'required_work_order',
    field: 'workOrderNumber',
    severity: 'error',
    check: (r) => (!r.workOrderNumber ? 'Work order number is required.' : null),
  },
  {
    id: 'required_quantity',
    field: 'quantityProduced',
    severity: 'error',
    check: (r) => (r.quantityProduced === null || r.quantityProduced === undefined ? 'Quantity produced is required.' : null),
  },
  {
    id: 'required_time',
    field: 'timeTaken',
    severity: 'error',
    check: (r) => (r.timeTaken === null || r.timeTaken === undefined ? 'Time taken is required.' : null),
  },

  // ── Format rules ─────────────────────────────────────────────
  {
    id: 'invalid_shift',
    field: 'shift',
    severity: 'error',
    check: (r) =>
      r.shift && !VALID_SHIFTS.includes(r.shift)
        ? `Invalid shift value "${r.shift}". Expected A, B, C, or Night.`
        : null,
  },
  {
    id: 'invalid_machine_format',
    field: 'machineNumber',
    severity: 'warning',
    check: (r) =>
      r.machineNumber && !MACHINE_PATTERN.test(r.machineNumber)
        ? `Machine number "${r.machineNumber}" does not match expected format (e.g. MC-101).`
        : null,
  },
  {
    id: 'invalid_work_order_format',
    field: 'workOrderNumber',
    severity: 'warning',
    check: (r) =>
      r.workOrderNumber && !WORK_ORDER_PATTERN.test(r.workOrderNumber)
        ? `Work order "${r.workOrderNumber}" does not match expected format (e.g. WO-12345).`
        : null,
  },
  {
    id: 'invalid_employee_format',
    field: 'employeeNumber',
    severity: 'info',
    check: (r) =>
      r.employeeNumber && !EMPLOYEE_PATTERN.test(r.employeeNumber)
        ? `Employee number "${r.employeeNumber}" may be malformed.`
        : null,
  },
  {
    id: 'invalid_operation_format',
    field: 'operationCode',
    severity: 'info',
    check: (r) =>
      r.operationCode && !OPERATION_PATTERN.test(r.operationCode)
        ? `Operation code "${r.operationCode}" may be malformed.`
        : null,
  },

  // ── Value range rules ─────────────────────────────────────────
  {
    id: 'negative_quantity',
    field: 'quantityProduced',
    severity: 'error',
    check: (r) =>
      r.quantityProduced !== null && r.quantityProduced! <= 0
        ? 'Quantity produced must be a positive number.'
        : null,
  },
  {
    id: 'zero_time',
    field: 'timeTaken',
    severity: 'error',
    check: (r) =>
      r.timeTaken !== null && r.timeTaken! <= 0
        ? 'Time taken must be greater than zero.'
        : null,
  },
  {
    id: 'excessive_time',
    field: 'timeTaken',
    severity: 'warning',
    check: (r) =>
      r.timeTaken !== null && r.timeTaken! > 24
        ? `Time taken of ${r.timeTaken}h exceeds 24 hours — please verify.`
        : null,
  },
  {
    id: 'quantity_spike',
    field: 'quantityProduced',
    severity: 'warning',
    check: (r, ctx) => {
      if (!r.quantityProduced || !r.machineNumber || !ctx?.machineAverageQty) return null;
      const avg = ctx.machineAverageQty[r.machineNumber];
      if (!avg) return null;
      if (r.quantityProduced > avg * 3) {
        return `Quantity ${r.quantityProduced} is ${Math.round(r.quantityProduced / avg)}× above average (${Math.round(avg)}) for machine ${r.machineNumber}.`;
      }
      return null;
    },
  },
  {
    id: 'low_quantity',
    field: 'quantityProduced',
    severity: 'info',
    check: (r) =>
      r.quantityProduced !== null && r.quantityProduced! > 0 && r.quantityProduced! < 5
        ? `Very low quantity (${r.quantityProduced}) — confirm this is correct.`
        : null,
  },

  // ── Date rules ────────────────────────────────────────────────
  {
    id: 'invalid_date',
    field: 'date',
    severity: 'error',
    check: (r) => {
      if (!r.date) return null;
      const d = new Date(r.date);
      if (isNaN(d.getTime())) return `Invalid date format: "${r.date}".`;
      return null;
    },
  },
  {
    id: 'future_date',
    field: 'date',
    severity: 'warning',
    check: (r) => {
      if (!r.date) return null;
      const d = new Date(r.date);
      if (d > new Date()) return `Date ${r.date} is in the future.`;
      return null;
    },
  },
  {
    id: 'old_date',
    field: 'date',
    severity: 'info',
    check: (r) => {
      if (!r.date) return null;
      const d = new Date(r.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);
      if (d < thirtyDaysAgo) return `Date ${r.date} is older than 90 days.`;
      return null;
    },
  },

  // ── Duplicate detection ───────────────────────────────────────
  {
    id: 'duplicate_work_order',
    field: 'workOrderNumber',
    severity: 'error',
    check: (r, ctx) => {
      if (!r.workOrderNumber || !ctx?.existingWorkOrders) return null;
      if (ctx.existingWorkOrders.includes(r.workOrderNumber)) {
        return `Work order "${r.workOrderNumber}" already exists in the system.`;
      }
      return null;
    },
  },
];

// ── Main validate function ────────────────────────────────────
export function validateRecord(
  record: ManufacturingRecord,
  context?: ValidationContext
): ValidationResult {
  const issues: ValidationIssueData[] = [];

  for (const rule of RULES) {
    const message = rule.check(record, context);
    if (message) {
      issues.push({
        field: rule.field,
        rule: rule.id,
        message,
        severity: rule.severity,
      });
    }
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return {
    isValid: errorCount === 0,
    issues,
    errorCount,
    warningCount,
  };
}

export function getFieldIssues(
  issues: ValidationIssueData[],
  field: string
): ValidationIssueData[] {
  return issues.filter((i) => i.field === field);
}

export function hasErrors(issues: ValidationIssueData[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

export function hasWarnings(issues: ValidationIssueData[]): boolean {
  return issues.some((i) => i.severity === 'warning');
}
