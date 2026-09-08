export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "PARTIALLY_PAID",
  "OVERDUE",
  "CANCELLED",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type ExpenseScope = "organisation" | "branch" | "projects";

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type ReportingPeriod = {
  start: string;
  end: string;
};
