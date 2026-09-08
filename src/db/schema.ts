import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

export const organisations = sqliteTable("organisations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  currency: text("currency").notNull(),
  ...timestamps,
});

export const branches = sqliteTable(
  "branches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    location: text("location").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_branches_organisation_id").on(table.organisationId),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    billable: integer("billable", { mode: "boolean" }).notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    ...timestamps,
  },
  (table) => [index("idx_projects_branch_id").on(table.branchId)],
);

export const employees = sqliteTable(
  "employees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    ctc: integer("ctc").notNull(),
    ...timestamps,
  },
  (table) => [index("idx_employees_organisation_id").on(table.organisationId)],
);

export const projectEmployees = sqliteTable(
  "project_employees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    allocationPercentage: integer("allocation_percentage").notNull(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    ...timestamps,
  },
  (table) => [
    index("idx_project_employees_project_id").on(table.projectId),
    index("idx_project_employees_employee_id").on(table.employeeId),
    index("idx_project_employees_effective_from").on(table.effectiveFrom),
    index("idx_project_employees_effective_to").on(table.effectiveTo),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    currency: text("currency").notNull(),
    originalAmount: integer("original_amount").notNull(),
    exchangeRate: text("exchange_rate").notNull(),
    amount: integer("amount").notNull(),
    expenseDate: text("expense_date").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_expenses_organisation_id").on(table.organisationId),
    index("idx_expenses_branch_id").on(table.branchId),
    index("idx_expenses_expense_date").on(table.expenseDate),
    index("idx_expenses_currency").on(table.currency),
  ],
);

export const expenseAllocations = sqliteTable(
  "expense_allocations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    allocationPercentage: integer("allocation_percentage").notNull(),
    allocatedAmount: integer("allocated_amount").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_expense_allocations_expense_id").on(table.expenseId),
    index("idx_expense_allocations_project_id").on(table.projectId),
  ],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    invoiceNumber: text("invoice_number").notNull(),
    organisationId: integer("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    branchId: integer("branch_id").references(() => branches.id, {
      onDelete: "restrict",
    }),
    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    invoiceDate: text("invoice_date").notNull(),
    dueDate: text("due_date"),
    status: text("status").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_invoices_org_number").on(
      table.organisationId,
      table.invoiceNumber,
    ),
    index("idx_invoices_organisation_id").on(table.organisationId),
    index("idx_invoices_branch_id").on(table.branchId),
    index("idx_invoices_project_id").on(table.projectId),
    index("idx_invoices_invoice_date").on(table.invoiceDate),
    index("idx_invoices_status").on(table.status),
  ],
);

export type Organisation = typeof organisations.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type ProjectEmployee = typeof projectEmployees.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type ExpenseAllocation = typeof expenseAllocations.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
