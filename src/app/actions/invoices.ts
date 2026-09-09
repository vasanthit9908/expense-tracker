"use server";

import { runAction } from "@/app/actions/helpers";
import { createInvoice, deleteInvoice, updateInvoice } from "@/services/invoice-service";
import type { InvoiceStatus } from "@/types";

type InvoicePayload = {
  invoiceNumber: string;
  organisationId: number;
  branchId?: number | null;
  projectId?: number | null;
  description: string;
  currency: string;
  originalAmountMajor: string;
  exchangeRate?: string | null;
  invoiceDate: string;
  dueDate?: string | null;
  status: InvoiceStatus;
};

export async function createInvoiceAction(input: InvoicePayload) {
  return runAction(() => createInvoice(input), ["/invoices", "/reports"]);
}

export async function updateInvoiceAction(id: number, input: InvoicePayload) {
  return runAction(() => updateInvoice(id, input), ["/invoices", "/reports"]);
}

export async function deleteInvoiceAction(id: number) {
  return runAction(() => deleteInvoice(id), ["/invoices", "/reports"]);
}
