export const INIT_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organisations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  billable INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  ctc INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  allocation_percentage INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expense_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  allocation_percentage INTEGER NOT NULL,
  allocated_amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL,
  organisation_id INTEGER NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE RESTRICT,
  project_id INTEGER REFERENCES projects(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_branches_organisation_id ON branches(organisation_id);
CREATE INDEX IF NOT EXISTS idx_projects_branch_id ON projects(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_organisation_id ON employees(organisation_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_project_id ON project_employees(project_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_employee_id ON project_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_project_employees_effective_from ON project_employees(effective_from);
CREATE INDEX IF NOT EXISTS idx_project_employees_effective_to ON project_employees(effective_to);
CREATE INDEX IF NOT EXISTS idx_expenses_organisation_id ON expenses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_expense_id ON expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_allocations_project_id ON expense_allocations(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_org_number ON invoices(organisation_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_organisation_id ON invoices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
`;
