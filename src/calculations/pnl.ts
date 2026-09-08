import Decimal from "decimal.js";
import type { DateRange } from "@/lib/dates";
import type { MinorUnits } from "@/lib/money";
import {
  calculateEmployeeCosts,
  projectEmployeeCost,
  type AllocationCostInput,
  type EmployeeCostInput,
  type EmployeePeriodCost,
  type EmployeeProjectCostLine,
  type ProjectCostInput,
} from "@/calculations/employee-cost";

export type InvoiceInput = {
  id: number;
  invoiceNumber: string;
  organisationId: number;
  branchId: number | null;
  projectId: number | null;
  amountMinor: MinorUnits;
  invoiceDate: string;
  status: string;
  description: string;
};

export type ExpenseInput = {
  id: number;
  organisationId: number;
  branchId: number | null;
  name: string;
  amountMinor: MinorUnits;
  expenseDate: string;
};

export type ExpenseAllocationInput = {
  id: number;
  expenseId: number;
  projectId: number;
  allocationPercentage: Decimal;
  allocatedAmountMinor: MinorUnits;
};

export type BranchInput = {
  id: number;
  organisationId: number;
  name: string;
  location: string;
};

export type OrganisationInput = {
  id: number;
  name: string;
  currency: string;
};

export type PnlSnapshot = {
  organisation: OrganisationInput;
  period: DateRange;
  branches: BranchInput[];
  projects: ProjectCostInput[];
  employees: EmployeeCostInput[];
  allocations: AllocationCostInput[];
  expenses: ExpenseInput[];
  expenseAllocations: ExpenseAllocationInput[];
  invoices: InvoiceInput[];
};

export type NamedAmount = {
  id: number;
  name: string;
  amountMinor: MinorUnits;
};

export type ProjectPnl = {
  projectId: number;
  projectName: string;
  branchId: number;
  branchName: string;
  billable: boolean;
  startDate: string;
  endDate: string | null;
  revenueMinor: MinorUnits;
  employeeCostMinor: MinorUnits;
  expenseCostMinor: MinorUnits;
  totalCostMinor: MinorUnits;
  profitMinor: MinorUnits;
  marginPercent: number | null;
  employeeLines: EmployeeProjectCostLine[];
  expenseLines: {
    expenseId: number;
    expenseName: string;
    expenseAmountMinor: MinorUnits;
    allocationPercentage: Decimal;
    allocatedAmountMinor: MinorUnits;
  }[];
};

export type BranchPnl = {
  branchId: number;
  branchName: string;
  location: string;
  revenueMinor: MinorUnits;
  projectInvoiceRevenueMinor: MinorUnits;
  branchInvoiceRevenueMinor: MinorUnits;
  projectEmployeeCostMinor: MinorUnits;
  projectExpenseCostMinor: MinorUnits;
  branchExpenseCostMinor: MinorUnits;
  totalCostMinor: MinorUnits;
  profitMinor: MinorUnits;
  marginPercent: number | null;
  projects: ProjectPnl[];
  branchExpenses: NamedAmount[];
};

export type OrganisationPnl = {
  organisationId: number;
  organisationName: string;
  currency: string;
  period: DateRange;
  totalRevenueMinor: MinorUnits;
  projectRevenueMinor: MinorUnits;
  branchRevenueMinor: MinorUnits;
  otherRevenueMinor: MinorUnits;
  allocatedEmployeeCostMinor: MinorUnits;
  unallocatedEmployeeCostMinor: MinorUnits;
  totalEmployeeCostMinor: MinorUnits;
  projectExpenseCostMinor: MinorUnits;
  branchExpenseCostMinor: MinorUnits;
  organisationExpenseCostMinor: MinorUnits;
  totalCostMinor: MinorUnits;
  profitMinor: MinorUnits;
  marginPercent: number | null;
  billableRevenueMinor: MinorUnits;
  billableProjectCostMinor: MinorUnits;
  billableProfitMinor: MinorUnits;
  nonBillableEmployeeCostMinor: MinorUnits;
  nonBillableExpenseCostMinor: MinorUnits;
  nonBillableCostMinor: MinorUnits;
  cancelledInvoiceAmountMinor: MinorUnits;
  projectRevenueLines: NamedAmount[];
  branchRevenueLines: NamedAmount[];
  organisationExpenses: NamedAmount[];
  branchExpenses: NamedAmount[];
  projectExpenses: NamedAmount[];
  employeeCosts: EmployeePeriodCost[];
  branches: BranchPnl[];
  projects: ProjectPnl[];
};

function inPeriod(date: string, period: DateRange): boolean {
  return date >= period.start && date <= period.end;
}

function isRevenueInvoice(invoice: InvoiceInput): boolean {
  return invoice.status !== "CANCELLED";
}

function margin(profit: MinorUnits, revenue: MinorUnits): number | null {
  if (revenue === 0n) {
    return null;
  }
  return Number(new Decimal(profit.toString()).div(revenue.toString()).mul(100).toDecimalPlaces(2));
}

export function calculateOrganisationPnl(snapshot: PnlSnapshot): OrganisationPnl {
  const { organisation, period, branches, projects, employees, allocations } = snapshot;
  const branchById = new Map(branches.map((branch) => [branch.id, branch]));
  const expenseById = new Map(snapshot.expenses.map((expense) => [expense.id, expense]));
  const projectById = new Map(projects.map((project) => [project.id, project]));

  const periodInvoices = snapshot.invoices.filter((invoice) => inPeriod(invoice.invoiceDate, period));
  const revenueInvoices = periodInvoices.filter(isRevenueInvoice);
  const cancelledInvoiceAmountMinor = periodInvoices
    .filter((invoice) => invoice.status === "CANCELLED")
    .reduce((sum, invoice) => sum + invoice.amountMinor, 0n);

  const periodExpenses = snapshot.expenses.filter((expense) => inPeriod(expense.expenseDate, period));
  const periodExpenseIds = new Set(periodExpenses.map((expense) => expense.id));
  const periodAllocations = snapshot.expenseAllocations.filter((item) =>
    periodExpenseIds.has(item.expenseId),
  );

  const employeeCosts = calculateEmployeeCosts(employees, allocations, projects, period);

  const projectsPnl: ProjectPnl[] = projects.map((project) => {
    const branch = branchById.get(project.branchId);
    const revenueMinor = revenueInvoices
      .filter((invoice) => invoice.projectId === project.id)
      .reduce((sum, invoice) => sum + invoice.amountMinor, 0n);
    const expenseLines = periodAllocations
      .filter((item) => item.projectId === project.id)
      .map((item) => {
        const expense = expenseById.get(item.expenseId);
        return {
          expenseId: item.expenseId,
          expenseName: expense?.name ?? "Expense",
          expenseAmountMinor: expense?.amountMinor ?? 0n,
          allocationPercentage: item.allocationPercentage,
          allocatedAmountMinor: item.allocatedAmountMinor,
        };
      });
    const employeeCostMinor = projectEmployeeCost(project.id, employeeCosts);
    const expenseCostMinor = expenseLines.reduce((sum, line) => sum + line.allocatedAmountMinor, 0n);
    const totalCostMinor = employeeCostMinor + expenseCostMinor;
    const employeeLines = employeeCosts.flatMap((employee) =>
      employee.lines.filter((line) => line.projectId === project.id),
    );
    const profitMinor = revenueMinor - totalCostMinor;
    return {
      projectId: project.id,
      projectName: project.name,
      branchId: project.branchId,
      branchName: branch?.name ?? "Unknown branch",
      billable: project.billable,
      startDate: project.startDate,
      endDate: project.endDate,
      revenueMinor,
      employeeCostMinor,
      expenseCostMinor,
      totalCostMinor,
      profitMinor,
      marginPercent: margin(profitMinor, revenueMinor),
      employeeLines,
      expenseLines,
    };
  });

  const branchesPnl: BranchPnl[] = branches.map((branch) => {
    const branchProjects = projectsPnl.filter((project) => project.branchId === branch.id);
    const projectInvoiceRevenueMinor = branchProjects.reduce(
      (sum, project) => sum + project.revenueMinor,
      0n,
    );
    const branchInvoiceRevenueMinor = revenueInvoices
      .filter((invoice) => invoice.branchId === branch.id && invoice.projectId == null)
      .reduce((sum, invoice) => sum + invoice.amountMinor, 0n);
    const branchExpenseRows = periodExpenses.filter(
      (expense) => expense.branchId === branch.id,
    );
    const branchExpenseCostMinor = branchExpenseRows.reduce(
      (sum, expense) => sum + expense.amountMinor,
      0n,
    );
    const projectEmployeeCostMinor = branchProjects.reduce(
      (sum, project) => sum + project.employeeCostMinor,
      0n,
    );
    const projectExpenseCostMinor = branchProjects.reduce(
      (sum, project) => sum + project.expenseCostMinor,
      0n,
    );
    const totalCostMinor =
      projectEmployeeCostMinor + projectExpenseCostMinor + branchExpenseCostMinor;
    const revenueMinor = projectInvoiceRevenueMinor + branchInvoiceRevenueMinor;
    const profitMinor = revenueMinor - totalCostMinor;
    return {
      branchId: branch.id,
      branchName: branch.name,
      location: branch.location,
      revenueMinor,
      projectInvoiceRevenueMinor,
      branchInvoiceRevenueMinor,
      projectEmployeeCostMinor,
      projectExpenseCostMinor,
      branchExpenseCostMinor,
      totalCostMinor,
      profitMinor,
      marginPercent: margin(profitMinor, revenueMinor),
      projects: branchProjects,
      branchExpenses: branchExpenseRows.map((expense) => ({
        id: expense.id,
        name: expense.name,
        amountMinor: expense.amountMinor,
      })),
    };
  });

  const projectRevenueMinor = projectsPnl.reduce((sum, project) => sum + project.revenueMinor, 0n);
  const branchRevenueMinor = branchesPnl.reduce(
    (sum, branch) => sum + branch.branchInvoiceRevenueMinor,
    0n,
  );
  const otherRevenueMinor = revenueInvoices
    .filter((invoice) => invoice.branchId == null && invoice.projectId == null)
    .reduce((sum, invoice) => sum + invoice.amountMinor, 0n);
  const totalRevenueMinor = projectRevenueMinor + branchRevenueMinor + otherRevenueMinor;

  const allocatedEmployeeCostMinor = employeeCosts.reduce(
    (sum, employee) => sum + employee.allocatedCostMinor,
    0n,
  );
  const unallocatedEmployeeCostMinor = employeeCosts.reduce(
    (sum, employee) => sum + employee.unallocatedCostMinor,
    0n,
  );
  const totalEmployeeCostMinor = employeeCosts.reduce(
    (sum, employee) => sum + employee.totalCostMinor,
    0n,
  );

  const projectExpenseCostMinor = periodAllocations.reduce(
    (sum, item) => sum + item.allocatedAmountMinor,
    0n,
  );
  const branchExpenseCostMinor = branchesPnl.reduce(
    (sum, branch) => sum + branch.branchExpenseCostMinor,
    0n,
  );
  const organisationExpenseRows = periodExpenses.filter(
    (expense) => expense.branchId == null && !periodAllocations.some((item) => item.expenseId === expense.id),
  );
  const organisationExpenseCostMinor = organisationExpenseRows.reduce(
    (sum, expense) => sum + expense.amountMinor,
    0n,
  );

  const totalCostMinor =
    totalEmployeeCostMinor +
    projectExpenseCostMinor +
    branchExpenseCostMinor +
    organisationExpenseCostMinor;
  const profitMinor = totalRevenueMinor - totalCostMinor;

  const billableProjects = projectsPnl.filter((project) => project.billable);
  const nonBillableProjects = projectsPnl.filter((project) => !project.billable);
  const billableRevenueMinor =
    billableProjects.reduce((sum, project) => sum + project.revenueMinor, 0n) +
    branchRevenueMinor +
    otherRevenueMinor;
  const billableProjectCostMinor = billableProjects.reduce(
    (sum, project) => sum + project.totalCostMinor,
    0n,
  );
  const nonBillableEmployeeCostMinor = nonBillableProjects.reduce(
    (sum, project) => sum + project.employeeCostMinor,
    0n,
  );
  const nonBillableExpenseCostMinor = nonBillableProjects.reduce(
    (sum, project) => sum + project.expenseCostMinor,
    0n,
  );
  const nonBillableCostMinor = nonBillableEmployeeCostMinor + nonBillableExpenseCostMinor;

  return {
    organisationId: organisation.id,
    organisationName: organisation.name,
    currency: organisation.currency,
    period,
    totalRevenueMinor,
    projectRevenueMinor,
    branchRevenueMinor,
    otherRevenueMinor,
    allocatedEmployeeCostMinor,
    unallocatedEmployeeCostMinor,
    totalEmployeeCostMinor,
    projectExpenseCostMinor,
    branchExpenseCostMinor,
    organisationExpenseCostMinor,
    totalCostMinor,
    profitMinor,
    marginPercent: margin(profitMinor, totalRevenueMinor),
    billableRevenueMinor,
    billableProjectCostMinor,
    billableProfitMinor: billableRevenueMinor - billableProjectCostMinor,
    nonBillableEmployeeCostMinor,
    nonBillableExpenseCostMinor,
    nonBillableCostMinor,
    cancelledInvoiceAmountMinor,
    projectRevenueLines: projectsPnl
      .filter((project) => project.revenueMinor !== 0n)
      .map((project) => ({
        id: project.projectId,
        name: project.projectName,
        amountMinor: project.revenueMinor,
      })),
    branchRevenueLines: branchesPnl
      .filter((branch) => branch.branchInvoiceRevenueMinor !== 0n)
      .map((branch) => ({
        id: branch.branchId,
        name: `${branch.branchName} branch invoices`,
        amountMinor: branch.branchInvoiceRevenueMinor,
      })),
    organisationExpenses: organisationExpenseRows.map((expense) => ({
      id: expense.id,
      name: expense.name,
      amountMinor: expense.amountMinor,
    })),
    branchExpenses: branchesPnl.flatMap((branch) =>
      branch.branchExpenses.map((expense) => ({
        ...expense,
        name: `${branch.branchName}: ${expense.name}`,
      })),
    ),
    projectExpenses: periodAllocations.map((item) => {
      const expense = expenseById.get(item.expenseId);
      const project = projectById.get(item.projectId);
      return {
        id: item.id,
        name: `${expense?.name ?? "Expense"} → ${project?.name ?? "Project"}`,
        amountMinor: item.allocatedAmountMinor,
      };
    }),
    employeeCosts,
    branches: branchesPnl,
    projects: projectsPnl,
  };
}

export function getProjectPnl(snapshot: PnlSnapshot, projectId: number): ProjectPnl | null {
  return calculateOrganisationPnl(snapshot).projects.find((project) => project.projectId === projectId) ?? null;
}

export function getBranchPnl(snapshot: PnlSnapshot, branchId: number): BranchPnl | null {
  return calculateOrganisationPnl(snapshot).branches.find((branch) => branch.branchId === branchId) ?? null;
}
