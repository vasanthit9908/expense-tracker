export const DROP_SQL = `
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS expense_allocations;
DROP TABLE IF EXISTS project_employees;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS organisations;
SET FOREIGN_KEY_CHECKS = 1;
`;

export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS organisations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS branches (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_branches_organisation
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT,
  INDEX idx_branches_organisation_id (organisation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS projects (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  billable TINYINT(1) NOT NULL,
  start_date VARCHAR(10) NOT NULL,
  end_date VARCHAR(10) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_projects_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  INDEX idx_projects_branch_id (branch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS employees (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  ctc INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_organisation
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT,
  INDEX idx_employees_organisation_id (organisation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS project_employees (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  employee_id INT NOT NULL,
  allocation_percentage INT NOT NULL,
  effective_from VARCHAR(10) NOT NULL,
  effective_to VARCHAR(10) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_employees_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  CONSTRAINT fk_project_employees_employee
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  INDEX idx_project_employees_project_id (project_id),
  INDEX idx_project_employees_employee_id (employee_id),
  INDEX idx_project_employees_effective_from (effective_from),
  INDEX idx_project_employees_effective_to (effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  organisation_id INT NOT NULL,
  branch_id INT NULL,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  original_amount INT NOT NULL,
  exchange_rate VARCHAR(64) NOT NULL,
  amount INT NOT NULL,
  expense_date VARCHAR(10) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expenses_organisation
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_expenses_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  INDEX idx_expenses_organisation_id (organisation_id),
  INDEX idx_expenses_branch_id (branch_id),
  INDEX idx_expenses_expense_date (expense_date),
  INDEX idx_expenses_currency (currency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expense_allocations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  project_id INT NOT NULL,
  allocation_percentage INT NOT NULL,
  allocated_amount INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_expense_allocations_expense
    FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  CONSTRAINT fk_expense_allocations_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  INDEX idx_expense_allocations_expense_id (expense_id),
  INDEX idx_expense_allocations_project_id (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(64) NOT NULL,
  organisation_id INT NOT NULL,
  branch_id INT NULL,
  project_id INT NULL,
  description TEXT NOT NULL,
  currency VARCHAR(3) NOT NULL,
  original_amount INT NOT NULL,
  exchange_rate VARCHAR(64) NOT NULL,
  amount INT NOT NULL,
  invoice_date VARCHAR(10) NOT NULL,
  due_date VARCHAR(10) NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_invoices_organisation
    FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_branch
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoices_project
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  UNIQUE INDEX idx_invoices_org_number (organisation_id, invoice_number),
  INDEX idx_invoices_organisation_id (organisation_id),
  INDEX idx_invoices_branch_id (branch_id),
  INDEX idx_invoices_project_id (project_id),
  INDEX idx_invoices_invoice_date (invoice_date),
  INDEX idx_invoices_status (status),
  INDEX idx_invoices_currency (currency)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
