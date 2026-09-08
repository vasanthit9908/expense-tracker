import Decimal from "decimal.js";
import {
  intersectRanges,
  iterateMonthSlices,
  openEnd,
  type DateRange,
} from "@/lib/dates";
import { roundToMinor, type MinorUnits } from "@/lib/money";

export type EmployeeCostInput = {
  id: number;
  name: string;
  annualCtcMinor: MinorUnits;
};

export type ProjectCostInput = {
  id: number;
  name: string;
  branchId: number;
  billable: boolean;
  startDate: string;
  endDate: string | null;
};

export type AllocationCostInput = {
  id: number;
  employeeId: number;
  projectId: number;
  allocationPercentage: Decimal;
  effectiveFrom: string;
  effectiveTo: string | null;
};

export type EmployeeProjectCostLine = {
  employeeId: number;
  employeeName: string;
  projectId: number;
  annualCtcMinor: MinorUnits;
  allocationPercentage: Decimal;
  costMinor: MinorUnits;
};

export type EmployeePeriodCost = {
  employeeId: number;
  employeeName: string;
  totalCostMinor: MinorUnits;
  allocatedCostMinor: MinorUnits;
  unallocatedCostMinor: MinorUnits;
  lines: EmployeeProjectCostLine[];
};

function monthlyCost(annualCtcMinor: MinorUnits): Decimal {
  return new Decimal(annualCtcMinor.toString()).div(12);
}

function dailyCost(annualCtcMinor: MinorUnits, daysInMonth: number): Decimal {
  return monthlyCost(annualCtcMinor).div(daysInMonth);
}

export function employeePeriodCost(
  employee: EmployeeCostInput,
  period: DateRange,
): MinorUnits {
  const slices = iterateMonthSlices(period.start, period.end);
  let total = 0n;
  for (const slice of slices) {
    const cost = dailyCost(employee.annualCtcMinor, slice.daysInMonth).mul(slice.activeDays);
    total += roundToMinor(cost);
  }
  return total;
}

export function allocationActiveRange(
  allocation: AllocationCostInput,
  project: ProjectCostInput,
  period: DateRange,
): DateRange | null {
  const allocationEnd = openEnd(allocation.effectiveTo, period.end);
  const projectEnd = openEnd(project.endDate, period.end);
  const withAllocation = intersectRanges(
    period.start,
    period.end,
    allocation.effectiveFrom,
    allocationEnd,
  );
  if (!withAllocation) {
    return null;
  }
  return intersectRanges(withAllocation.start, withAllocation.end, project.startDate, projectEnd);
}

export function allocationCostForPeriod(
  employee: EmployeeCostInput,
  allocation: AllocationCostInput,
  project: ProjectCostInput,
  period: DateRange,
): MinorUnits {
  const active = allocationActiveRange(allocation, project, period);
  if (!active) {
    return 0n;
  }
  const slices = iterateMonthSlices(active.start, active.end);
  let total = 0n;
  for (const slice of slices) {
    const cost = dailyCost(employee.annualCtcMinor, slice.daysInMonth)
      .mul(slice.activeDays)
      .mul(allocation.allocationPercentage)
      .div(100);
    total += roundToMinor(cost);
  }
  return total;
}

export function calculateEmployeeCosts(
  employees: EmployeeCostInput[],
  allocations: AllocationCostInput[],
  projects: ProjectCostInput[],
  period: DateRange,
): EmployeePeriodCost[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  return employees.map((employee) => {
    const employeeAllocations = allocations.filter((item) => item.employeeId === employee.id);
    const lines: EmployeeProjectCostLine[] = [];
    let allocated = 0n;
    for (const allocation of employeeAllocations) {
      const project = projectById.get(allocation.projectId);
      if (!project) {
        continue;
      }
      const costMinor = allocationCostForPeriod(employee, allocation, project, period);
      if (costMinor === 0n && !allocationActiveRange(allocation, project, period)) {
        continue;
      }
      allocated += costMinor;
      lines.push({
        employeeId: employee.id,
        employeeName: employee.name,
        projectId: project.id,
        annualCtcMinor: employee.annualCtcMinor,
        allocationPercentage: allocation.allocationPercentage,
        costMinor,
      });
    }
    const totalCostMinor = employeePeriodCost(employee, period);
    const unallocatedCostMinor = totalCostMinor - allocated;
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      totalCostMinor,
      allocatedCostMinor: allocated,
      unallocatedCostMinor,
      lines,
    };
  });
}

export function projectEmployeeCost(
  projectId: number,
  employeeCosts: EmployeePeriodCost[],
): MinorUnits {
  return employeeCosts.reduce((sum, employee) => {
    const projectLines = employee.lines.filter((line) => line.projectId === projectId);
    return sum + projectLines.reduce((lineSum, line) => lineSum + line.costMinor, 0n);
  }, 0n);
}
