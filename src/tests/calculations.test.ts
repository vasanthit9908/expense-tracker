import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import {
  allocateByPercentages,
  fromMinorUnits,
  percentOf,
  toMinorUnits,
  toStoredPercent,
  fromStoredPercent,
} from "@/lib/money";
import { currencySymbol, formatMoney, isValidCurrencyCode } from "@/lib/currency";
import { getDaysInMonth, parseISO } from "date-fns";
import {
  allocationCostForPeriod,
  calculateEmployeeCosts,
  employeePeriodCost,
  type AllocationCostInput,
  type EmployeeCostInput,
  type ProjectCostInput,
} from "@/calculations/employee-cost";
import { calculateOrganisationPnl, type PnlSnapshot } from "@/calculations/pnl";
import { employeeAllocationExceeds100, parseSchema, projectEmployeeInputSchema } from "@/validations";
import { computeExpenseAllocations } from "@/services/expense-allocation-service";
import { AppError } from "@/lib/errors";

const rupees = (major: number | string) => toMinorUnits(major);
const pct = (value: number) => new Decimal(value);

function employee(id: number, name: string, annual: number | string): EmployeeCostInput {
  return { id, name, annualCtcMinor: rupees(annual) };
}

function project(
  id: number,
  name: string,
  opts?: Partial<ProjectCostInput>,
): ProjectCostInput {
  return {
    id,
    name,
    branchId: 1,
    billable: true,
    startDate: "2026-01-01",
    endDate: null,
    ...opts,
  };
}

function allocation(
  id: number,
  employeeId: number,
  projectId: number,
  percentage: number,
  from: string,
  to: string | null = null,
): AllocationCostInput {
  return {
    id,
    employeeId,
    projectId,
    allocationPercentage: pct(percentage),
    effectiveFrom: from,
    effectiveTo: to,
  };
}

describe("money and currency", () => {
  it("26. stores ISO codes and formats currency symbols", () => {
    expect(isValidCurrencyCode("INR")).toBe(true);
    expect(isValidCurrencyCode("usd")).toBe(false);
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("EUR")).toBe("€");
    expect(currencySymbol("GBP")).toBe("£");
    expect(formatMoney(rupees(100000), "INR")).toContain("1,00,000.00");
    expect(formatMoney(rupees(100000), "INR")).toContain("₹");
  });

  it("27. money rounding uses half-up to minor units and remainder on last split", () => {
    const amount = rupees(100);
    const parts = allocateByPercentages(amount, [pct(33.33), pct(33.33), pct(33.34)]);
    expect(parts.reduce((sum, part) => sum + part, 0n)).toBe(amount);
    expect(percentOf(rupees("10.005"), pct(100))).toBe(rupees("10.01"));
    expect(toStoredPercent(50.5)).toBe(5050);
    expect(Number(fromStoredPercent(5050))).toBe(50.5);
  });
});

describe("employee cost engine", () => {
  const ravi = employee(1, "Ravi", 1_200_000);
  const january = { start: "2026-01-01", end: "2026-01-31" };

  it("1. full-month employee allocation is CTC/12 × percentage", () => {
    const cost = allocationCostForPeriod(
      ravi,
      allocation(1, 1, 1, 40, "2026-01-01"),
      project(1, "A"),
      january,
    );
    expect(cost).toBe(rupees(40_000));
  });

  it("2. partial-month employee allocation prorates by calendar days", () => {
    const cost = allocationCostForPeriod(
      ravi,
      allocation(1, 1, 1, 40, "2026-01-01", "2026-01-15"),
      project(1, "A"),
      january,
    );
    const expected = new Decimal(rupees(1_200_000).toString()).div(12).div(31).mul(15).mul(40).div(100);
    expect(cost).toBe(BigInt(expected.toFixed(0)));
  });

  it("3. multiple employees on one project are summed", () => {
    const result = calculateEmployeeCosts(
      [ravi, employee(2, "Priya", 1_500_000)],
      [
        allocation(1, 1, 1, 50, "2026-01-01"),
        allocation(2, 2, 1, 60, "2026-01-01"),
      ],
      [project(1, "Alpha")],
      january,
    );
    const projectCost = result.reduce(
      (sum, row) => sum + row.lines.filter((line) => line.projectId === 1).reduce((acc, line) => acc + line.costMinor, 0n),
      0n,
    );
    expect(projectCost).toBe(rupees(50_000) + rupees(75_000));
  });

  it("4. one employee across multiple projects splits cost by percentage", () => {
    const result = calculateEmployeeCosts(
      [ravi],
      [allocation(1, 1, 1, 50, "2026-01-01"), allocation(2, 1, 2, 30, "2026-01-01")],
      [project(1, "A"), project(2, "B")],
      january,
    )[0]!;
    expect(result.lines.find((line) => line.projectId === 1)?.costMinor).toBe(rupees(50_000));
    expect(result.lines.find((line) => line.projectId === 2)?.costMinor).toBe(rupees(30_000));
  });

  it("5. allocation changes during a month are applied by effective dates", () => {
    const result = calculateEmployeeCosts(
      [ravi],
      [
        allocation(1, 1, 1, 100, "2026-01-01", "2026-01-15"),
        allocation(2, 1, 1, 50, "2026-01-16", "2026-01-31"),
      ],
      [project(1, "A")],
      january,
    )[0]!;
    const first = new Decimal(rupees(1_200_000).toString()).div(12).div(31).mul(15).mul(100).div(100);
    const second = new Decimal(rupees(1_200_000).toString()).div(12).div(31).mul(16).mul(50).div(100);
    expect(result.allocatedCostMinor).toBe(BigInt(first.toFixed(0)) + BigInt(second.toFixed(0)));
  });

  it("6. project start date in middle of month reduces active days", () => {
    const cost = allocationCostForPeriod(
      ravi,
      allocation(1, 1, 1, 100, "2026-01-01"),
      project(1, "A", { startDate: "2026-01-16" }),
      january,
    );
    const expected = new Decimal(rupees(1_200_000).toString()).div(12).div(31).mul(16);
    expect(cost).toBe(BigInt(expected.toFixed(0)));
  });

  it("7. project end date in middle of month reduces active days", () => {
    const cost = allocationCostForPeriod(
      ravi,
      allocation(1, 1, 1, 100, "2026-01-01"),
      project(1, "A", { endDate: "2026-01-10" }),
      january,
    );
    const expected = new Decimal(rupees(1_200_000).toString()).div(12).div(31).mul(10);
    expect(cost).toBe(BigInt(expected.toFixed(0)));
  });

  it("8. allocation effective dates clip the reporting window", () => {
    const cost = allocationCostForPeriod(
      ravi,
      allocation(1, 1, 1, 100, "2026-02-01", "2026-02-10"),
      project(1, "A"),
      january,
    );
    expect(cost).toBe(0n);
  });

  it("9. unallocated percentage remains an organisation employee cost", () => {
    const result = calculateEmployeeCosts(
      [ravi],
      [allocation(1, 1, 1, 40, "2026-01-01"), allocation(2, 1, 2, 30, "2026-01-01")],
      [project(1, "A"), project(2, "B")],
      january,
    )[0]!;
    expect(result.allocatedCostMinor).toBe(rupees(70_000));
    expect(result.unallocatedCostMinor).toBe(rupees(30_000));
    expect(result.totalCostMinor).toBe(rupees(100_000));
    expect(result.allocatedCostMinor + result.unallocatedCostMinor).toBe(result.totalCostMinor);
  });

  it("28. month boundaries use each month's own day count", () => {
    const jan = employeePeriodCost(ravi, { start: "2026-01-31", end: "2026-01-31" });
    const feb = employeePeriodCost(ravi, { start: "2026-02-01", end: "2026-02-01" });
    expect(jan).not.toBe(feb);
    expect(getDaysInMonth(parseISO("2026-01-01"))).toBe(31);
    expect(getDaysInMonth(parseISO("2026-02-01"))).toBe(28);
  });

  it("29. leap year February uses 29 days", () => {
    const leap = employeePeriodCost(ravi, { start: "2024-02-01", end: "2024-02-29" });
    const nonLeap = employeePeriodCost(ravi, { start: "2025-02-01", end: "2025-02-28" });
    expect(leap).toBe(rupees(100_000));
    expect(nonLeap).toBe(rupees(100_000));
    const oneLeapDay = employeePeriodCost(ravi, { start: "2024-02-29", end: "2024-02-29" });
    const oneNonLeapDay = employeePeriodCost(ravi, { start: "2025-02-28", end: "2025-02-28" });
    expect(oneLeapDay < oneNonLeapDay).toBe(true);
  });
});

describe("expense allocations", () => {
  it("18. allocated amounts are computed and sum to the original expense", () => {
    const parts = computeExpenseAllocations(rupees(100_000), [60, 25, 15]);
    expect(parts).toEqual([rupees(60_000), rupees(25_000), rupees(15_000)]);
    expect(parts.reduce((sum, part) => sum + part, 0n)).toBe(rupees(100_000));
  });

  it("17. expense allocation percentages must equal 100%", () => {
    expect(() => computeExpenseAllocations(rupees(100_000), [60, 25])).toThrow(/100%/);
  });
});

describe("employee allocation validation", () => {
  it("22. allocation greater than 100% is rejected", () => {
    expect(() =>
      parseSchema(projectEmployeeInputSchema, {
        projectId: 1,
        employeeId: 1,
        allocationPercentage: 120,
        effectiveFrom: "2026-01-01",
      }),
    ).toThrow();
  });

  it("23. overlapping allocations exceeding 100% are rejected; sequential 100% then 50/50 is valid", () => {
    const existing = [
      {
        employeeId: 1,
        allocationPercentage: 60,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-06-30",
      },
    ];
    expect(
      employeeAllocationExceeds100(existing, {
        employeeId: 1,
        allocationPercentage: 50,
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-06-30",
      }),
    ).toBe(true);
    expect(
      employeeAllocationExceeds100(
        [
          {
            employeeId: 1,
            allocationPercentage: 100,
            effectiveFrom: "2026-01-01",
            effectiveTo: "2026-06-30",
          },
        ],
        {
          employeeId: 1,
          allocationPercentage: 50,
          effectiveFrom: "2026-07-01",
          effectiveTo: "2026-12-31",
        },
      ),
    ).toBe(false);
  });
});

function snapshot(overrides: Partial<PnlSnapshot> = {}): PnlSnapshot {
  const period = { start: "2026-01-01", end: "2026-01-31" };
  const employees = [employee(1, "Ravi", 1_200_000)];
  const projects = [project(1, "Alpha"), project(2, "Internal", { billable: false, id: 2, name: "Internal" })];
  return {
    organisation: { id: 1, name: "ABC", currency: "INR" },
    period,
    branches: [
      { id: 1, organisationId: 1, name: "Hyderabad", location: "HYD" },
      { id: 2, organisationId: 1, name: "Bangalore", location: "BLR" },
    ],
    projects,
    employees,
    allocations: [allocation(1, 1, 1, 40, "2026-01-01"), allocation(2, 1, 2, 30, "2026-01-01")],
    expenses: [],
    expenseAllocations: [],
    invoices: [],
    ...overrides,
  };
}

describe("P&L engine", () => {
  it("10. zero-revenue project still shows costs and null margin", () => {
    const pnl = calculateOrganisationPnl(snapshot());
    const internal = pnl.projects.find((item) => item.projectId === 2)!;
    expect(internal.revenueMinor).toBe(0n);
    expect(internal.employeeCostMinor).toBe(rupees(30_000));
    expect(internal.marginPercent).toBeNull();
    expect(internal.profitMinor).toBe(-rupees(30_000));
  });

  it("11. billable project profit uses invoices minus allocated costs", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        invoices: [
          {
            id: 1,
            invoiceNumber: "INV-1",
            organisationId: 1,
            branchId: 1,
            projectId: 1,
            amountMinor: rupees(100_000),
            invoiceDate: "2026-01-10",
            status: "PAID",
            description: "Alpha",
          },
        ],
      }),
    );
    const alpha = pnl.projects.find((item) => item.projectId === 1)!;
    expect(alpha.billable).toBe(true);
    expect(alpha.revenueMinor).toBe(rupees(100_000));
    expect(alpha.profitMinor).toBe(rupees(100_000) - rupees(40_000));
  });

  it("12. non-billable project costs remain visible", () => {
    const pnl = calculateOrganisationPnl(snapshot());
    expect(pnl.nonBillableEmployeeCostMinor).toBe(rupees(30_000));
    expect(pnl.nonBillableCostMinor).toBe(rupees(30_000));
  });

  it("13. organisation expense is not pushed to branches or projects", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        expenses: [
          {
            id: 1,
            organisationId: 1,
            branchId: null,
            name: "Insurance",
            amountMinor: rupees(1_000_000),
            expenseDate: "2026-01-05",
          },
        ],
      }),
    );
    expect(pnl.organisationExpenseCostMinor).toBe(rupees(1_000_000));
    expect(pnl.branches.every((branch) => branch.branchExpenseCostMinor === 0n)).toBe(true);
    expect(pnl.projects.every((projectRow) => projectRow.expenseCostMinor === 0n)).toBe(true);
  });

  it("14. branch expense sits only on that branch and organisation totals", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        expenses: [
          {
            id: 2,
            organisationId: 1,
            branchId: 1,
            name: "Rent",
            amountMinor: rupees(200_000),
            expenseDate: "2026-01-01",
          },
        ],
      }),
    );
    expect(pnl.branchExpenseCostMinor).toBe(rupees(200_000));
    expect(pnl.branches.find((branch) => branch.branchId === 1)?.branchExpenseCostMinor).toBe(rupees(200_000));
    expect(pnl.branches.find((branch) => branch.branchId === 2)?.branchExpenseCostMinor).toBe(0n);
    expect(pnl.organisationExpenseCostMinor).toBe(0n);
  });

  it("15. single-project expense allocation is the full amount", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        expenses: [
          {
            id: 3,
            organisationId: 1,
            branchId: null,
            name: "Licences",
            amountMinor: rupees(40_000),
            expenseDate: "2026-01-01",
          },
        ],
        expenseAllocations: [
          {
            id: 1,
            expenseId: 3,
            projectId: 1,
            allocationPercentage: pct(100),
            allocatedAmountMinor: rupees(40_000),
          },
        ],
      }),
    );
    expect(pnl.projects.find((item) => item.projectId === 1)?.expenseCostMinor).toBe(rupees(40_000));
    expect(pnl.projectExpenseCostMinor).toBe(rupees(40_000));
    expect(pnl.organisationExpenseCostMinor).toBe(0n);
  });

  it("16. multi-project expense is one source split across projects", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        expenses: [
          {
            id: 4,
            organisationId: 1,
            branchId: null,
            name: "AWS",
            amountMinor: rupees(100_000),
            expenseDate: "2026-01-01",
          },
        ],
        expenseAllocations: [
          { id: 1, expenseId: 4, projectId: 1, allocationPercentage: pct(60), allocatedAmountMinor: rupees(60_000) },
          { id: 2, expenseId: 4, projectId: 2, allocationPercentage: pct(40), allocatedAmountMinor: rupees(40_000) },
        ],
      }),
    );
    expect(pnl.projects.find((item) => item.projectId === 1)?.expenseCostMinor).toBe(rupees(60_000));
    expect(pnl.projects.find((item) => item.projectId === 2)?.expenseCostMinor).toBe(rupees(40_000));
    expect(pnl.projectExpenseCostMinor).toBe(rupees(100_000));
    expect(pnl.organisationExpenseCostMinor).toBe(0n);
  });

  it("19. cancelled invoices are excluded from revenue", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        invoices: [
          {
            id: 1,
            invoiceNumber: "INV-C",
            organisationId: 1,
            branchId: 1,
            projectId: 1,
            amountMinor: rupees(200_000),
            invoiceDate: "2026-01-10",
            status: "CANCELLED",
            description: "cancelled",
          },
        ],
      }),
    );
    expect(pnl.totalRevenueMinor).toBe(0n);
    expect(pnl.cancelledInvoiceAmountMinor).toBe(rupees(200_000));
  });

  it("20. multiple invoices sum when they are not cancelled", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        invoices: [
          {
            id: 1,
            invoiceNumber: "A",
            organisationId: 1,
            branchId: 1,
            projectId: 1,
            amountMinor: rupees(80_000),
            invoiceDate: "2026-01-05",
            status: "PAID",
            description: "a",
          },
          {
            id: 2,
            invoiceNumber: "B",
            organisationId: 1,
            branchId: 1,
            projectId: 1,
            amountMinor: rupees(20_000),
            invoiceDate: "2026-01-20",
            status: "ISSUED",
            description: "b",
          },
        ],
      }),
    );
    expect(pnl.totalRevenueMinor).toBe(rupees(100_000));
  });

  it("21. zero-revenue margin is null rather than throwing", () => {
    const pnl = calculateOrganisationPnl(snapshot());
    expect(pnl.marginPercent).toBeNull();
    expect(pnl.totalRevenueMinor).toBe(0n);
  });

  it("30. organisation P&L does not double-count employees or expenses", () => {
    const pnl = calculateOrganisationPnl(
      snapshot({
        expenses: [
          {
            id: 1,
            organisationId: 1,
            branchId: null,
            name: "AWS",
            amountMinor: rupees(100_000),
            expenseDate: "2026-01-01",
          },
          {
            id: 2,
            organisationId: 1,
            branchId: 1,
            name: "Rent",
            amountMinor: rupees(50_000),
            expenseDate: "2026-01-01",
          },
          {
            id: 3,
            organisationId: 1,
            branchId: null,
            name: "Insurance",
            amountMinor: rupees(25_000),
            expenseDate: "2026-01-01",
          },
        ],
        expenseAllocations: [
          { id: 1, expenseId: 1, projectId: 1, allocationPercentage: pct(60), allocatedAmountMinor: rupees(60_000) },
          { id: 2, expenseId: 1, projectId: 2, allocationPercentage: pct(40), allocatedAmountMinor: rupees(40_000) },
        ],
        invoices: [
          {
            id: 1,
            invoiceNumber: "INV-1",
            organisationId: 1,
            branchId: 1,
            projectId: 1,
            amountMinor: rupees(300_000),
            invoiceDate: "2026-01-15",
            status: "PAID",
            description: "rev",
          },
        ],
      }),
    );
    expect(pnl.allocatedEmployeeCostMinor + pnl.unallocatedEmployeeCostMinor).toBe(pnl.totalEmployeeCostMinor);
    expect(pnl.totalEmployeeCostMinor).toBe(rupees(100_000));
    expect(pnl.projectExpenseCostMinor).toBe(rupees(100_000));
    expect(pnl.branchExpenseCostMinor).toBe(rupees(50_000));
    expect(pnl.organisationExpenseCostMinor).toBe(rupees(25_000));
    expect(pnl.totalCostMinor).toBe(rupees(100_000 + 100_000 + 50_000 + 25_000));
    expect(fromMinorUnits(pnl.profitMinor).toNumber()).toBe(fromMinorUnits(pnl.totalRevenueMinor - pnl.totalCostMinor).toNumber());
  });
});

describe("error type", () => {
  it("AppError is distinguishable", () => {
    expect(new AppError("nope").name).toBe("AppError");
  });
});
