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
    currency: "USD",
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
    ctcMajor: "14400",
  });
  const priya = await createEmployee({
    organisationId: org.id,
    name: "Priya",
    ctcMajor: "18000",
  });
  const john = await createEmployee({
    organisationId: org.id,
    name: "John",
    ctcMajor: "21600",
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

  // USD org-currency expense
  await createExpense({
    organisationId: org.id,
    scope: "organisation",
    name: "Company insurance",
    currency: "USD",
    originalAmountMajor: "1200",
    exchangeRate: "1",
    expenseDate: "2026-09-01",
    allocations: [],
  });

  // INR electricity bills booked into USD (₹83,000 @ 0.012 = $996)
  await createExpense({
    organisationId: org.id,
    scope: "branch",
    branchId: hyderabad.id,
    name: "Hyderabad electricity bill",
    currency: "INR",
    originalAmountMajor: "83000",
    exchangeRate: "0.012",
    expenseDate: "2026-09-01",
    allocations: [],
  });
  await createExpense({
    organisationId: org.id,
    scope: "branch",
    branchId: bangalore.id,
    name: "Bangalore office rent",
    currency: "INR",
    originalAmountMajor: "150000",
    exchangeRate: "0.012",
    expenseDate: "2026-09-01",
    allocations: [],
  });

  // Cursor subscription paid in USD (same as org currency)
  await createExpense({
    organisationId: org.id,
    scope: "projects",
    name: "Cursor Pro subscription",
    currency: "USD",
    originalAmountMajor: "20",
    exchangeRate: "1",
    expenseDate: "2026-09-05",
    allocations: [
      { projectId: alpha.id, allocationPercentage: 50 },
      { projectId: beta.id, allocationPercentage: 30 },
      { projectId: internal.id, allocationPercentage: 20 },
    ],
  });

  // AWS in USD split across projects
  await createExpense({
    organisationId: org.id,
    scope: "projects",
    name: "AWS infrastructure",
    currency: "USD",
    originalAmountMajor: "1200",
    exchangeRate: "1",
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
    currency: "USD",
    originalAmountMajor: "480",
    exchangeRate: "1",
    expenseDate: "2026-09-05",
    allocations: [{ projectId: alpha.id, allocationPercentage: 100 }],
  });

  await createExpense({
    organisationId: org.id,
    scope: "projects",
    name: "Internal tooling",
    currency: "USD",
    originalAmountMajor: "600",
    exchangeRate: "1",
    expenseDate: "2026-09-12",
    allocations: [{ projectId: internal.id, allocationPercentage: 100 }],
  });

  await createInvoice({
    invoiceNumber: "INV-001",
    organisationId: org.id,
    branchId: hyderabad.id,
    projectId: alpha.id,
    description: "Project Alpha September billing",
    amountMajor: "9600",
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
    amountMajor: "6000",
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
    amountMajor: "600",
    invoiceDate: "2026-09-08",
    status: "PAID",
  });
  await createInvoice({
    invoiceNumber: "INV-004",
    organisationId: org.id,
    branchId: null,
    projectId: null,
    description: "Organisation consulting retainer",
    amountMajor: "1200",
    invoiceDate: "2026-09-20",
    status: "PAID",
  });
  await createInvoice({
    invoiceNumber: "INV-005",
    organisationId: org.id,
    branchId: hyderabad.id,
    projectId: alpha.id,
    description: "Cancelled Alpha change request",
    amountMajor: "2400",
    invoiceDate: "2026-09-22",
    status: "CANCELLED",
  });

  console.log(
    "Seeded ABC Technologies (USD) with INR electricity bills and a USD Cursor subscription.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
