"use server";

import { runAction } from "@/app/actions/helpers";
import {
  createAllocation,
  createEmployee,
  deleteAllocation,
  deleteEmployee,
  updateAllocation,
  updateEmployee,
} from "@/services/employee-service";

export async function createEmployeeAction(input: {
  organisationId: number;
  name: string;
  ctcMajor: string;
}) {
  return runAction(() => createEmployee(input), ["/employees", "/reports"]);
}

export async function updateEmployeeAction(
  id: number,
  input: { organisationId: number; name: string; ctcMajor: string },
) {
  return runAction(() => updateEmployee(id, input), ["/employees", "/reports"]);
}

export async function deleteEmployeeAction(id: number) {
  return runAction(() => deleteEmployee(id), ["/employees", "/reports"]);
}

export async function createAllocationAction(input: {
  projectId: number;
  employeeId: number;
  allocationPercentage: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
}) {
  return runAction(() => createAllocation(input), ["/employees", "/projects", "/reports"]);
}

export async function updateAllocationAction(
  id: number,
  input: {
    projectId: number;
    employeeId: number;
    allocationPercentage: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
  },
) {
  return runAction(() => updateAllocation(id, input), ["/employees", "/projects", "/reports"]);
}

export async function deleteAllocationAction(id: number) {
  return runAction(() => deleteAllocation(id), ["/employees", "/projects", "/reports"]);
}
