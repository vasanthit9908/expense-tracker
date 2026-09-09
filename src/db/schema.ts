import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
  datetime,
} from "drizzle-orm/mysql-core";

const timestamps = {
  createdAt: datetime("created_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at", { mode: "string" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

export const organisations = mysqlTable("organisations", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  ...timestamps,
});

export const branches = mysqlTable(
  "branches",
  {
    id: int("id").primaryKey().autoincrement(),
    organisationId: int("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => [index("idx_branches_organisation_id").on(table.organisationId)],
);

export const projects = mysqlTable(
  "projects",
  {
    id: int("id").primaryKey().autoincrement(),
    branchId: int("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    billable: boolean("billable").notNull(),
    startDate: varchar("start_date", { length: 10 }).notNull(),
    endDate: varchar("end_date", { length: 10 }),
    ...timestamps,
  },
  (table) => [index("idx_projects_branch_id").on(table.branchId)],
);

export const employees = mysqlTable(
  "employees",
  {
    id: int("id").primaryKey().autoincrement(),
    organisationId: int("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    ctc: int("ctc").notNull(),
    ...timestamps,
  },
  (table) => [index("idx_employees_organisation_id").on(table.organisationId)],
);

export const projectEmployees = mysqlTable(
  "project_employees",
  {
    id: int("id").primaryKey().autoincrement(),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    employeeId: int("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    allocationPercentage: int("allocation_percentage").notNull(),
    effectiveFrom: varchar("effective_from", { length: 10 }).notNull(),
    effectiveTo: varchar("effective_to", { length: 10 }),
    ...timestamps,
  },
  (table) => [
    index("idx_project_employees_project_id").on(table.projectId),
    index("idx_project_employees_employee_id").on(table.employeeId),
    index("idx_project_employees_effective_from").on(table.effectiveFrom),
    index("idx_project_employees_effective_to").on(table.effectiveTo),
  ],
);

export const expenses = mysqlTable(
  "expenses",
  {
    id: int("id").primaryKey().autoincrement(),
    organisationId: int("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    branchId: int("branch_id").references(() => branches.id, {
      onDelete: "restrict",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    originalAmount: int("original_amount").notNull(),
    exchangeRate: varchar("exchange_rate", { length: 64 }).notNull(),
    amount: int("amount").notNull(),
    expenseDate: varchar("expense_date", { length: 10 }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_expenses_organisation_id").on(table.organisationId),
    index("idx_expenses_branch_id").on(table.branchId),
    index("idx_expenses_expense_date").on(table.expenseDate),
    index("idx_expenses_currency").on(table.currency),
  ],
);

export const expenseAllocations = mysqlTable(
  "expense_allocations",
  {
    id: int("id").primaryKey().autoincrement(),
    expenseId: int("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    projectId: int("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "restrict" }),
    allocationPercentage: int("allocation_percentage").notNull(),
    allocatedAmount: int("allocated_amount").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_expense_allocations_expense_id").on(table.expenseId),
    index("idx_expense_allocations_project_id").on(table.projectId),
  ],
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").primaryKey().autoincrement(),
    invoiceNumber: varchar("invoice_number", { length: 64 }).notNull(),
    organisationId: int("organisation_id")
      .notNull()
      .references(() => organisations.id, { onDelete: "restrict" }),
    branchId: int("branch_id").references(() => branches.id, {
      onDelete: "restrict",
    }),
    projectId: int("project_id").references(() => projects.id, {
      onDelete: "restrict",
    }),
    description: text("description").notNull(),
    amount: int("amount").notNull(),
    invoiceDate: varchar("invoice_date", { length: 10 }).notNull(),
    dueDate: varchar("due_date", { length: 10 }),
    status: varchar("status", { length: 32 }).notNull(),
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
