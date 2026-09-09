import Decimal from "decimal.js";
import { z } from "zod";
import { isValidCurrencyCode } from "@/lib/currency";
import { assertDateOrder, isIsoDate, maxDate, minDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { fromStoredPercent } from "@/lib/money";
import { INVOICE_STATUSES } from "@/types";

export const isoDateSchema = z.string().refine(isIsoDate, "Must be a valid YYYY-MM-DD date");

export const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(isValidCurrencyCode, "Currency must be an ISO 4217 three-letter code");

export const organisationInputSchema = z.object({
  name: z.string().trim().min(1, "Organisation name is required"),
  currency: currencySchema.default("INR"),
});

export const branchInputSchema = z.object({
  organisationId: z.number().int().positive(),
  name: z.string().trim().min(1, "Branch name is required"),
  location: z.string().trim().min(1, "Location is required"),
});

export const projectInputSchema = z
  .object({
    branchId: z.number().int().positive(),
    name: z.string().trim().min(1, "Project name is required"),
    billable: z.boolean(),
    startDate: isoDateSchema,
    endDate: isoDateSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate) {
      try {
        assertDateOrder(value.startDate, value.endDate, "End date cannot be before start date");
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : "Invalid dates",
          path: ["endDate"],
        });
      }
    }
  });

export const employeeInputSchema = z.object({
  organisationId: z.number().int().positive(),
  name: z.string().trim().min(1, "Employee name is required"),
  ctcMajor: z.string().trim().min(1, "Annual CTC is required"),
});

export const allocationPercentSchema = z
  .number()
  .gt(0, "Allocation percentage must be greater than 0")
  .lte(100, "Allocation percentage cannot exceed 100");

export const projectEmployeeInputSchema = z
  .object({
    projectId: z.number().int().positive(),
    employeeId: z.number().int().positive(),
    allocationPercentage: allocationPercentSchema,
    effectiveFrom: isoDateSchema,
    effectiveTo: isoDateSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.effectiveTo) {
      try {
        assertDateOrder(
          value.effectiveFrom,
          value.effectiveTo,
          "Effective to cannot be before effective from",
        );
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : "Invalid dates",
          path: ["effectiveTo"],
        });
      }
    }
  });

export const expenseAllocationInputSchema = z.object({
  projectId: z.number().int().positive(),
  allocationPercentage: allocationPercentSchema,
});

export const expenseInputSchema = z
  .object({
    organisationId: z.number().int().positive(),
    branchId: z.number().int().positive().nullable().optional(),
    name: z.string().trim().min(1, "Expense name is required"),
    currency: currencySchema,
    originalAmountMajor: z.string().trim().min(1, "Amount is required"),
    exchangeRate: z.string().trim().optional().nullable(),
    expenseDate: isoDateSchema,
    scope: z.enum(["organisation", "branch", "projects"]),
    allocations: z.array(expenseAllocationInputSchema).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.scope === "branch" && !value.branchId) {
      ctx.addIssue({ code: "custom", message: "Branch is required", path: ["branchId"] });
    }
    if (value.scope === "organisation" && value.branchId) {
      ctx.addIssue({
        code: "custom",
        message: "Organisation expenses cannot have a branch",
        path: ["branchId"],
      });
    }
    if (value.scope === "projects") {
      if (value.branchId) {
        ctx.addIssue({
          code: "custom",
          message: "Project-allocated expenses should not set a branch",
          path: ["branchId"],
        });
      }
      if (value.allocations.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Add at least one project allocation",
          path: ["allocations"],
        });
      }
      const sum = value.allocations.reduce((acc, item) => acc.plus(item.allocationPercentage), new Decimal(0));
      if (!sum.eq(100)) {
        ctx.addIssue({
          code: "custom",
          message: `Project allocations must equal 100% (currently ${sum.toString()}%)`,
          path: ["allocations"],
        });
      }
    } else if (value.allocations.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "Only project-scoped expenses can have allocations",
        path: ["allocations"],
      });
    }
  });

export const invoiceInputSchema = z
  .object({
    invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
    organisationId: z.number().int().positive(),
    branchId: z.number().int().positive().nullable().optional(),
    projectId: z.number().int().positive().nullable().optional(),
    description: z.string().trim().min(1, "Description is required"),
    currency: currencySchema,
    originalAmountMajor: z.string().trim().min(1, "Amount is required"),
    exchangeRate: z.string().trim().optional().nullable(),
    invoiceDate: isoDateSchema,
    dueDate: isoDateSchema.nullable().optional(),
    status: z.enum(INVOICE_STATUSES),
  })
  .superRefine((value, ctx) => {
    if (value.projectId && !value.branchId) {
      ctx.addIssue({
        code: "custom",
        message: "Project invoices must include a branch",
        path: ["branchId"],
      });
    }
    if (value.dueDate) {
      try {
        assertDateOrder(value.invoiceDate, value.dueDate, "Due date cannot be before invoice date");
      } catch (error) {
        ctx.addIssue({
          code: "custom",
          message: error instanceof Error ? error.message : "Invalid dates",
          path: ["dueDate"],
        });
      }
    }
  });

export type AllocationInterval = {
  id?: number;
  employeeId: number;
  allocationPercentage: number;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export function employeeAllocationExceeds100(
  existing: AllocationInterval[],
  incoming: AllocationInterval,
): boolean {
  const all = [...existing, incoming];
  const points = new Set<string>();
  for (const interval of all) {
    points.add(interval.effectiveFrom);
    points.add(interval.effectiveTo ? nextExclusive(interval.effectiveTo) : "9999-12-32");
  }
  const sorted = [...points].sort();
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index]!;
    const endExclusive = sorted[index + 1]!;
    if (start >= endExclusive) {
      continue;
    }
    const lastInclusive = previousInclusive(endExclusive);
    let sum = new Decimal(0);
    for (const interval of all) {
      if (rangesOverlapInclusive(interval.effectiveFrom, interval.effectiveTo, start, lastInclusive)) {
        sum = sum.plus(interval.allocationPercentage);
      }
    }
    if (sum.greaterThan(100)) {
      return true;
    }
  }
  return false;
}

function nextExclusive(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year!, month! - 1, day! + 1));
  return next.toISOString().slice(0, 10);
}

function previousInclusive(exclusive: string): string {
  if (exclusive === "9999-12-32") {
    return "9999-12-31";
  }
  const [year, month, day] = exclusive.split("-").map(Number);
  const prev = new Date(Date.UTC(year!, month! - 1, day! - 1));
  return prev.toISOString().slice(0, 10);
}

function rangesOverlapInclusive(
  aFrom: string,
  aTo: string | null,
  bFrom: string,
  bTo: string | null,
): boolean {
  const aEnd = aTo ?? "9999-12-31";
  const bEnd = bTo ?? "9999-12-31";
  return maxDate(aFrom, bFrom) <= minDate(aEnd, bEnd);
}

export function parseSchema<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new AppError(first?.message ?? "Validation failed");
  }
  return result.data;
}

export { fromStoredPercent };
