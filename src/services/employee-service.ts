import { and, eq, ne } from "drizzle-orm";
import Decimal from "decimal.js";
import { getDb, insertIdFromResult, nowSqlTimestamp } from "@/db/client";
import { employees, projectEmployees, type Employee, type ProjectEmployee } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { toMinorUnits, toStoredPercent, fromStoredPercent, assertPositiveAmount } from "@/lib/money";
import {
  employeeAllocationExceeds100,
  employeeInputSchema,
  parseSchema,
  projectEmployeeInputSchema,
  type AllocationInterval,
} from "@/validations";
import { getProjectOrganisationId, requireProject } from "@/services/project-service";
import { requireOrganisation } from "@/services/organisation-service";

export async function listEmployees(organisationId?: number): Promise<Employee[]> {
  const db = await getDb();
  if (organisationId) {
    return db
      .select()
      .from(employees)
      .where(eq(employees.organisationId, organisationId))
      .orderBy(employees.name);
  }
  return db.select().from(employees).orderBy(employees.name);
}

export async function getEmployee(id: number): Promise<Employee | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return row;
}

export async function requireEmployee(id: number): Promise<Employee> {
  const employee = await getEmployee(id);
  if (!employee) {
    throw new AppError("Employee not found");
  }
  return employee;
}

export async function createEmployee(input: unknown): Promise<Employee> {
  const data = parseSchema(employeeInputSchema, input);
  await requireOrganisation(data.organisationId);
  const ctc = toMinorUnits(data.ctcMajor);
  assertPositiveAmount(ctc, "CTC");
  const db = await getDb();
  const result = await db.insert(employees).values({
    organisationId: data.organisationId,
    name: data.name,
    ctc: Number(ctc),
  });
  return requireEmployee(await insertIdFromResult(result));
}

export async function updateEmployee(id: number, input: unknown): Promise<Employee> {
  await requireEmployee(id);
  const data = parseSchema(employeeInputSchema, input);
  await requireOrganisation(data.organisationId);
  const ctc = toMinorUnits(data.ctcMajor);
  assertPositiveAmount(ctc, "CTC");
  const db = await getDb();
  await db
    .update(employees)
    .set({
      organisationId: data.organisationId,
      name: data.name,
      ctc: Number(ctc),
      updatedAt: nowSqlTimestamp(),
    })
    .where(eq(employees.id, id));
  return requireEmployee(id);
}

export async function deleteEmployee(id: number): Promise<void> {
  await requireEmployee(id);
  const db = await getDb();
  try {
    await db.delete(employees).where(eq(employees.id, id));
  } catch {
    throw new AppError("Cannot delete employee while allocations exist");
  }
}

export async function listAllocations(filters?: {
  employeeId?: number;
  projectId?: number;
}): Promise<ProjectEmployee[]> {
  const db = await getDb();
  if (filters?.employeeId) {
    return db
      .select()
      .from(projectEmployees)
      .where(eq(projectEmployees.employeeId, filters.employeeId))
      .orderBy(projectEmployees.effectiveFrom);
  }
  if (filters?.projectId) {
    return db
      .select()
      .from(projectEmployees)
      .where(eq(projectEmployees.projectId, filters.projectId))
      .orderBy(projectEmployees.effectiveFrom);
  }
  return db.select().from(projectEmployees).orderBy(projectEmployees.effectiveFrom);
}

function toInterval(row: ProjectEmployee): AllocationInterval {
  return {
    id: row.id,
    employeeId: row.employeeId,
    allocationPercentage: Number(fromStoredPercent(row.allocationPercentage)),
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
  };
}

async function assertEmployeeProjectSameOrg(employeeId: number, projectId: number): Promise<void> {
  const employee = await requireEmployee(employeeId);
  const projectOrgId = await getProjectOrganisationId(projectId);
  if (employee.organisationId !== projectOrgId) {
    throw new AppError("Employee and project must belong to the same organisation");
  }
}

async function assertNoOverlap(
  employeeId: number,
  incoming: AllocationInterval,
  excludeId?: number,
): Promise<void> {
  const db = await getDb();
  const rows = excludeId
    ? await db
        .select()
        .from(projectEmployees)
        .where(and(eq(projectEmployees.employeeId, employeeId), ne(projectEmployees.id, excludeId)))
    : await db.select().from(projectEmployees).where(eq(projectEmployees.employeeId, employeeId));
  if (employeeAllocationExceeds100(rows.map(toInterval), incoming)) {
    throw new AppError("Overlapping allocations cannot exceed 100% for the same employee");
  }
}

async function requireAllocation(id: number): Promise<ProjectEmployee> {
  const db = await getDb();
  const [row] = await db.select().from(projectEmployees).where(eq(projectEmployees.id, id)).limit(1);
  if (!row) {
    throw new AppError("Allocation not found");
  }
  return row;
}

export async function createAllocation(input: unknown): Promise<ProjectEmployee> {
  const data = parseSchema(projectEmployeeInputSchema, input);
  await requireProject(data.projectId);
  await assertEmployeeProjectSameOrg(data.employeeId, data.projectId);
  const incoming: AllocationInterval = {
    employeeId: data.employeeId,
    allocationPercentage: data.allocationPercentage,
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo ?? null,
  };
  await assertNoOverlap(data.employeeId, incoming);
  const db = await getDb();
  const result = await db.insert(projectEmployees).values({
    projectId: data.projectId,
    employeeId: data.employeeId,
    allocationPercentage: toStoredPercent(data.allocationPercentage),
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo ?? null,
  });
  return requireAllocation(await insertIdFromResult(result));
}

export async function updateAllocation(id: number, input: unknown): Promise<ProjectEmployee> {
  await requireAllocation(id);
  const data = parseSchema(projectEmployeeInputSchema, input);
  await requireProject(data.projectId);
  await assertEmployeeProjectSameOrg(data.employeeId, data.projectId);
  const incoming: AllocationInterval = {
    id,
    employeeId: data.employeeId,
    allocationPercentage: data.allocationPercentage,
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo ?? null,
  };
  await assertNoOverlap(data.employeeId, incoming, id);
  const db = await getDb();
  await db
    .update(projectEmployees)
    .set({
      projectId: data.projectId,
      employeeId: data.employeeId,
      allocationPercentage: toStoredPercent(data.allocationPercentage),
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo ?? null,
      updatedAt: nowSqlTimestamp(),
    })
    .where(eq(projectEmployees.id, id));
  return requireAllocation(id);
}

export async function deleteAllocation(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(projectEmployees).where(eq(projectEmployees.id, id));
}

export function currentAllocationSummary(
  allocations: ProjectEmployee[],
  asOf: string,
): { allocatedPercent: Decimal; unallocatedPercent: Decimal; current: ProjectEmployee[] } {
  const current = allocations.filter((item) => {
    if (item.effectiveFrom > asOf) {
      return false;
    }
    if (item.effectiveTo && item.effectiveTo < asOf) {
      return false;
    }
    return true;
  });
  const allocatedPercent = current.reduce(
    (sum, item) => sum.plus(fromStoredPercent(item.allocationPercentage)),
    new Decimal(0),
  );
  return {
    allocatedPercent,
    unallocatedPercent: new Decimal(100).minus(allocatedPercent),
    current,
  };
}
