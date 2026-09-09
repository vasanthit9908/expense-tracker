import { and, eq, gte, lte } from "drizzle-orm";
import { getDb, insertIdFromResult, nowSqlTimestamp } from "@/db/client";
import { invoices, type Invoice } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { normalizeCurrencyBooking } from "@/lib/money";
import { invoiceInputSchema, parseSchema } from "@/validations";
import { requireBranchInOrganisation } from "@/services/branch-service";
import { requireOrganisation } from "@/services/organisation-service";
import { requireProjectInBranch } from "@/services/project-service";

export async function listInvoices(filters?: {
  organisationId?: number;
  branchId?: number;
  projectId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Invoice[]> {
  const db = await getDb();
  const rows = await db.select().from(invoices).orderBy(invoices.invoiceDate);
  return rows.filter((row) => {
    if (filters?.organisationId && row.organisationId !== filters.organisationId) return false;
    if (filters?.branchId && row.branchId !== filters.branchId) return false;
    if (filters?.projectId && row.projectId !== filters.projectId) return false;
    if (filters?.status && row.status !== filters.status) return false;
    if (filters?.startDate && row.invoiceDate < filters.startDate) return false;
    if (filters?.endDate && row.invoiceDate > filters.endDate) return false;
    return true;
  });
}

export async function getInvoice(id: number): Promise<Invoice | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return row;
}

export async function requireInvoice(id: number): Promise<Invoice> {
  const invoice = await getInvoice(id);
  if (!invoice) {
    throw new AppError("Invoice not found");
  }
  return invoice;
}

async function assertInvoiceHierarchy(data: {
  organisationId: number;
  branchId?: number | null;
  projectId?: number | null;
}): Promise<void> {
  await requireOrganisation(data.organisationId);
  if (data.branchId) {
    await requireBranchInOrganisation(data.branchId, data.organisationId);
  }
  if (data.projectId) {
    if (!data.branchId) {
      throw new AppError("Project invoices must include a branch");
    }
    await requireProjectInBranch(data.projectId, data.branchId, data.organisationId);
  }
}

async function resolveInvoiceWrite(input: unknown) {
  const data = parseSchema(invoiceInputSchema, input);
  await assertInvoiceHierarchy(data);
  const organisation = await requireOrganisation(data.organisationId);
  const booked = normalizeCurrencyBooking({
    transactionCurrency: data.currency,
    baseCurrency: organisation.currency,
    originalMajor: data.originalAmountMajor,
    exchangeRate: data.exchangeRate,
  });
  return { data, booked };
}

export async function createInvoice(input: unknown): Promise<Invoice> {
  const { data, booked } = await resolveInvoiceWrite(input);
  const db = await getDb();
  const existing = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.organisationId, data.organisationId), eq(invoices.invoiceNumber, data.invoiceNumber)),
    )
    .limit(1);
  if (existing.length > 0) {
    throw new AppError("Invoice number must be unique within the organisation");
  }
  const result = await db.insert(invoices).values({
    invoiceNumber: data.invoiceNumber,
    organisationId: data.organisationId,
    branchId: data.branchId ?? null,
    projectId: data.projectId ?? null,
    description: data.description,
    currency: booked.currency,
    originalAmount: Number(booked.originalAmountMinor),
    exchangeRate: booked.exchangeRate,
    amount: Number(booked.amountMinor),
    invoiceDate: data.invoiceDate,
    dueDate: data.dueDate ?? null,
    status: data.status,
  });
  return requireInvoice(await insertIdFromResult(result));
}

export async function updateInvoice(id: number, input: unknown): Promise<Invoice> {
  await requireInvoice(id);
  const { data, booked } = await resolveInvoiceWrite(input);
  const db = await getDb();
  const existing = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.organisationId, data.organisationId), eq(invoices.invoiceNumber, data.invoiceNumber)),
    );
  if (existing.some((row) => row.id !== id)) {
    throw new AppError("Invoice number must be unique within the organisation");
  }
  await db
    .update(invoices)
    .set({
      invoiceNumber: data.invoiceNumber,
      organisationId: data.organisationId,
      branchId: data.branchId ?? null,
      projectId: data.projectId ?? null,
      description: data.description,
      currency: booked.currency,
      originalAmount: Number(booked.originalAmountMinor),
      exchangeRate: booked.exchangeRate,
      amount: Number(booked.amountMinor),
      invoiceDate: data.invoiceDate,
      dueDate: data.dueDate ?? null,
      status: data.status,
      updatedAt: nowSqlTimestamp(),
    })
    .where(eq(invoices.id, id));
  return requireInvoice(id);
}

export async function deleteInvoice(id: number): Promise<void> {
  await requireInvoice(id);
  const db = await getDb();
  await db.delete(invoices).where(eq(invoices.id, id));
}

export { gte, lte };
