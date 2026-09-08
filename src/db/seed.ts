import { createAllocation, createEmployee } from "@/services/employee-service";
import { createBranch } from "@/services/branch-service";
import { createExpense } from "@/services/expense-service";
import { createInvoice } from "@/services/invoice-service";
import { createOrganisation, listOrganisations } from "@/services/organisation-service";
import { createProject } from "@/services/project-service";
import { getDb } from "@/db/client";

async function main() {
  await getDb();
  const existing = await listOrganisations();
  if (existing.some((org) => org.name === "ABC Technologies")) {
    console.log("Seed data already present. Skipping.");
    return;
  }

  const org = await createOrganisation({
    name: "ABC Technologies",
    currency: "INR",
  });

  const hyderabad = await createBranch({
    organisationId: org.id,
    name: "Hyderabad",
    location: "Hyderabad, Telangana",
  });
  const bangalore = await createBranch({
    organisationId: org.id,
    name: "Bangalore",
    location: "Bengaluru, Karnataka",
  });

  const alpha = await createProject({
    branchId: hyderabad.id,
    name: "Project Alpha",
    billable: true,
    startDate: "2026-01-01",
    endDate: null,
  });
  const beta = await createProject({
    branchId: bangalore.id,
    name: "Project Beta",
    billable: true,
    startDate: "2026-01-01",
    endDate: null,
  });
  const internal = await createProject({
    branchId: hyderabad.id,
    name: "Internal Operations",
    billable: false,
    startDate: "2026-01-01",
    endDate: null,
  });

  const ravi = await createEmployee({
    organisationId: org.id,
    name: "Ravi",
    ctcMajor: "1200000",
  });
  const priya = await createEmployee({
    organisationId: org.id,
    name: "Priya",
    ctcMajor: "1500000",
  });
  const john = await createEmployee({
    organisationId: org.id,
    name: "John",
    ctcMajor: "1800000",
  });

  await createAllocation({
    projectId: alpha.id,
    employeeId: ravi.id,
    allocationPercentage: 50,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  });
  await createAllocation({
    projectId: beta.id,
    employeeId: ravi.id,
    allocationPercentage: 30,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  });
  await createAllocation({
    projectId: alpha.id,
    employeeId: priya.id,
    allocationPercentage: 60,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  });
  await createAllocation({
    projectId: internal.id,
    employeeId: priya.id,
    allocationPercentage: 20,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  });
  await createAllocation({
    projectId: beta.id,
    employeeId: john.id,
    allocationPercentage: 70,
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
  });

  await createExpense({
    organisationId: org.id,
    scope: "organisation",
    name: "Company insurance",
    amountMajor: "100000",
    expenseDate: "2026-09-01",
    allocations: [],
  });
  await createExpense({
    organisationId: org.id,
    scope: "branch",
    branchId: hyderabad.id,
    name: "Hyderabad office rent",
    amountMajor: "200000",
    expenseDate: "2026-09-01",
    allocations: [],
  });
  await createExpense({
    organisationId: org.id,
    scope: "branch",
    branchId: bangalore.id,
    name: "Bangalore office rent",
    amountMajor: "180000",
    expenseDate: "2026-09-01",
    allocations: [],
  });
  await createExpense({
    organisationId: org.id,
    scope: "projects",
    name: "AWS infrastructure",
    amountMajor: "100000",
    expenseDate: "2026-09-10",
    allocations: [
      { projectId: alpha.id, allocationPercentage: 50 },
      { projectId: beta.id, allocationPercentage: 30 },
      { projectId: internal.id, allocationPercentage: 20 },
    ],
  });
  await createExpense({
    organisationId: org.id,
    scope: "projects",
    name: "Alpha software licences",
    amountMajor: "40000",
    expenseDate: "2026-09-05",
    allocations: [{ projectId: alpha.id, allocationPercentage: 100 }],
  });
  await createExpense({
    organisationId: org.id,
    scope: "projects",
    name: "Internal tooling",
    amountMajor: "50000",
    expenseDate: "2026-09-12",
    allocations: [{ projectId: internal.id, allocationPercentage: 100 }],
  });

  await createInvoice({
    invoiceNumber: "INV-001",
    organisationId: org.id,
    branchId: hyderabad.id,
    projectId: alpha.id,
    description: "Project Alpha September billing",
    amountMajor: "800000",
    invoiceDate: "2026-09-15",
    dueDate: "2026-09-30",
    status: "PAID",
  });
  await createInvoice({
    invoiceNumber: "INV-002",
    organisationId: org.id,
    branchId: bangalore.id,
    projectId: beta.id,
    description: "Project Beta September billing",
    amountMajor: "500000",
    invoiceDate: "2026-09-18",
    dueDate: "2026-10-02",
    status: "ISSUED",
  });
  await createInvoice({
    invoiceNumber: "INV-003",
    organisationId: org.id,
    branchId: hyderabad.id,
    projectId: null,
    description: "Hyderabad training services",
    amountMajor: "50000",
    invoiceDate: "2026-09-08",
    status: "PAID",
  });
  await createInvoice({
    invoiceNumber: "INV-004",
    organisationId: org.id,
    branchId: null,
    projectId: null,
    description: "Organisation consulting retainer",
    amountMajor: "100000",
    invoiceDate: "2026-09-20",
    status: "PAID",
  });
  await createInvoice({
    invoiceNumber: "INV-005",
    organisationId: org.id,
    branchId: hyderabad.id,
    projectId: alpha.id,
    description: "Cancelled Alpha change request",
    amountMajor: "200000",
    invoiceDate: "2026-09-22",
    status: "CANCELLED",
  });

  console.log("Seeded ABC Technologies (INR) with branches, projects, employees, expenses and invoices.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
