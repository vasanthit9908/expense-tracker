import { describe, expect, it } from "vitest";
import { withTestDatabase } from "@/db/client";
import { createBranch } from "@/services/branch-service";
import { createEmployee, createAllocation } from "@/services/employee-service";
import { createExpense } from "@/services/expense-service";
import { createOrganisation } from "@/services/organisation-service";
import { createProject } from "@/services/project-service";

describe("hierarchy and relationship validation", () => {
  it("24. rejects allocating an expense to a project in another organisation", async () => {
    await withTestDatabase(async () => {
      const orgA = await createOrganisation({ name: "A", currency: "INR" });
      const orgB = await createOrganisation({ name: "B", currency: "USD" });
      const branchB = await createBranch({
        organisationId: orgB.id,
        name: "NY",
        location: "New York",
      });
      const projectB = await createProject({
        branchId: branchB.id,
        name: "B Project",
        billable: true,
        startDate: "2026-01-01",
      });
      await expect(
        createExpense({
          organisationId: orgA.id,
          scope: "projects",
          name: "Cross charge",
          amountMajor: "1000",
          expenseDate: "2026-01-01",
          allocations: [{ projectId: projectB.id, allocationPercentage: 100 }],
        }),
      ).rejects.toThrow(/does not belong to the selected organisation/);
    });
  });

  it("25. rejects a project invoice whose branch/project chain is invalid", async () => {
    await withTestDatabase(async () => {
      const org = await createOrganisation({ name: "A", currency: "INR" });
      const hyd = await createBranch({ organisationId: org.id, name: "Hyd", location: "Hyd" });
      const blr = await createBranch({ organisationId: org.id, name: "Blr", location: "Blr" });
      const project = await createProject({
        branchId: hyd.id,
        name: "Alpha",
        billable: true,
        startDate: "2026-01-01",
      });
      const { createInvoice } = await import("@/services/invoice-service");
      await expect(
        createInvoice({
          invoiceNumber: "INV-X",
          organisationId: org.id,
          branchId: blr.id,
          projectId: project.id,
          description: "bad hierarchy",
          amountMajor: "1000",
          invoiceDate: "2026-01-01",
          status: "ISSUED",
        }),
      ).rejects.toThrow(/does not belong to the selected branch/);
    });
  });

  it("rejects employee allocation across organisations", async () => {
    await withTestDatabase(async () => {
      const orgA = await createOrganisation({ name: "A", currency: "INR" });
      const orgB = await createOrganisation({ name: "B", currency: "INR" });
      const branchB = await createBranch({ organisationId: orgB.id, name: "B", location: "B" });
      const projectB = await createProject({
        branchId: branchB.id,
        name: "BP",
        billable: true,
        startDate: "2026-01-01",
      });
      const employeeA = await createEmployee({
        organisationId: orgA.id,
        name: "Ravi",
        ctcMajor: "1200000",
      });
      await expect(
        createAllocation({
          projectId: projectB.id,
          employeeId: employeeA.id,
          allocationPercentage: 50,
          effectiveFrom: "2026-01-01",
        }),
      ).rejects.toThrow(/same organisation/);
    });
  });
});
