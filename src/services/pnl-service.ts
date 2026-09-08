import Decimal from "decimal.js";
import { eq } from "drizzle-orm";
import {
  calculateOrganisationPnl,
  getBranchPnl,
  getProjectPnl,
  type OrganisationPnl,
  type PnlSnapshot,
} from "@/calculations/pnl";
import { getDb } from "@/db/client";
import {
  branches,
  employees,
  expenseAllocations,
  expenses,
  invoices,
  organisations,
  projectEmployees,
  projects,
} from "@/db/schema";
import type { DateRange } from "@/lib/dates";
import { fromStoredPercent } from "@/lib/money";
import { AppError } from "@/lib/errors";

export async function loadPnlSnapshot(organisationId: number, period: DateRange): Promise<PnlSnapshot> {
  const db = await getDb();
  const [organisation] = await db
    .select()
    .from(organisations)
    .where(eq(organisations.id, organisationId))
    .limit(1);
  if (!organisation) {
    throw new AppError("Organisation not found");
  }

  const orgBranches = await db.select().from(branches).where(eq(branches.organisationId, organisationId));
  const branchIds = orgBranches.map((branch) => branch.id);
  const allProjects = await db.select().from(projects);
  const orgProjects = allProjects.filter((project) => branchIds.includes(project.branchId));
  const orgEmployees = await db.select().from(employees).where(eq(employees.organisationId, organisationId));
  const allAllocations = await db.select().from(projectEmployees);
  const employeeIds = new Set(orgEmployees.map((employee) => employee.id));
  const orgAllocations = allAllocations.filter((item) => employeeIds.has(item.employeeId));
  const orgExpenses = await db.select().from(expenses).where(eq(expenses.organisationId, organisationId));
  const allExpenseAllocations = await db.select().from(expenseAllocations);
  const expenseIds = new Set(orgExpenses.map((expense) => expense.id));
  const orgExpenseAllocations = allExpenseAllocations.filter((item) => expenseIds.has(item.expenseId));
  const orgInvoices = await db.select().from(invoices).where(eq(invoices.organisationId, organisationId));

  return {
    organisation: {
      id: organisation.id,
      name: organisation.name,
      currency: organisation.currency,
    },
    period,
    branches: orgBranches.map((branch) => ({
      id: branch.id,
      organisationId: branch.organisationId,
      name: branch.name,
      location: branch.location,
    })),
    projects: orgProjects.map((project) => ({
      id: project.id,
      name: project.name,
      branchId: project.branchId,
      billable: project.billable,
      startDate: project.startDate,
      endDate: project.endDate,
    })),
    employees: orgEmployees.map((employee) => ({
      id: employee.id,
      name: employee.name,
      annualCtcMinor: BigInt(employee.ctc),
    })),
    allocations: orgAllocations.map((item) => ({
      id: item.id,
      employeeId: item.employeeId,
      projectId: item.projectId,
      allocationPercentage: fromStoredPercent(item.allocationPercentage),
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo,
    })),
    expenses: orgExpenses.map((expense) => ({
      id: expense.id,
      organisationId: expense.organisationId,
      branchId: expense.branchId,
      name: expense.name,
      amountMinor: BigInt(expense.amount),
      expenseDate: expense.expenseDate,
    })),
    expenseAllocations: orgExpenseAllocations.map((item) => ({
      id: item.id,
      expenseId: item.expenseId,
      projectId: item.projectId,
      allocationPercentage: fromStoredPercent(item.allocationPercentage),
      allocatedAmountMinor: BigInt(item.allocatedAmount),
    })),
    invoices: orgInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      organisationId: invoice.organisationId,
      branchId: invoice.branchId,
      projectId: invoice.projectId,
      amountMinor: BigInt(invoice.amount),
      invoiceDate: invoice.invoiceDate,
      status: invoice.status,
      description: invoice.description,
    })),
  };
}

export async function getOrganisationPnl(organisationId: number, period: DateRange): Promise<OrganisationPnl> {
  const snapshot = await loadPnlSnapshot(organisationId, period);
  return calculateOrganisationPnl(snapshot);
}

export async function getBranchPnlReport(organisationId: number, branchId: number, period: DateRange) {
  const snapshot = await loadPnlSnapshot(organisationId, period);
  const report = getBranchPnl(snapshot, branchId);
  if (!report) {
    throw new AppError("Branch not found in organisation");
  }
  return { currency: snapshot.organisation.currency, period, report };
}

export async function getProjectPnlReport(organisationId: number, projectId: number, period: DateRange) {
  const snapshot = await loadPnlSnapshot(organisationId, period);
  const report = getProjectPnl(snapshot, projectId);
  if (!report) {
    throw new AppError("Project not found in organisation");
  }
  return { currency: snapshot.organisation.currency, period, report };
}

export { Decimal };
