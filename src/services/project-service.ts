import { eq } from "drizzle-orm";
import { getDb, insertIdFromResult, nowSqlTimestamp } from "@/db/client";
import { branches, projectEmployees, projects, type Project } from "@/db/schema";
import { toIsoDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { parseSchema, projectInputSchema } from "@/validations";
import { requireBranch } from "@/services/branch-service";

export type ProjectListItem = Project & {
  branchName: string;
  organisationId: number;
  activeEmployeeCount: number;
};

export async function listProjects(
  organisationId?: number,
): Promise<ProjectListItem[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: projects.id,
      branchId: projects.branchId,
      name: projects.name,
      billable: projects.billable,
      startDate: projects.startDate,
      endDate: projects.endDate,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      branchName: branches.name,
      organisationId: branches.organisationId,
    })
    .from(projects)
    .innerJoin(branches, eq(projects.branchId, branches.id))
    .orderBy(projects.name);
  const filtered = organisationId
    ? rows.filter((row) => row.organisationId === organisationId)
    : rows;

  const today = toIsoDate(new Date());
  const allocations = await db.select().from(projectEmployees);
  const activeByProject = new Map<number, Set<number>>();
  for (const row of allocations) {
    if (row.effectiveFrom > today) continue;
    if (row.effectiveTo && row.effectiveTo < today) continue;
    let employees = activeByProject.get(row.projectId);
    if (!employees) {
      employees = new Set();
      activeByProject.set(row.projectId, employees);
    }
    employees.add(row.employeeId);
  }

  return filtered.map((row) => ({
    ...row,
    activeEmployeeCount: activeByProject.get(row.id)?.size ?? 0,
  }));
}

export async function getProject(id: number): Promise<Project | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row;
}

export async function requireProject(id: number): Promise<Project> {
  const project = await getProject(id);
  if (!project) {
    throw new AppError("Project not found");
  }
  return project;
}

export async function getProjectOrganisationId(projectId: number): Promise<number> {
  const project = await requireProject(projectId);
  const branch = await requireBranch(project.branchId);
  return branch.organisationId;
}

export async function requireProjectInOrganisation(
  projectId: number,
  organisationId: number,
): Promise<Project> {
  const project = await requireProject(projectId);
  const orgId = await getProjectOrganisationId(projectId);
  if (orgId !== organisationId) {
    throw new AppError("Project does not belong to the selected organisation");
  }
  return project;
}

export async function requireProjectInBranch(
  projectId: number,
  branchId: number,
  organisationId: number,
): Promise<Project> {
  const project = await requireProjectInOrganisation(projectId, organisationId);
  if (project.branchId !== branchId) {
    throw new AppError("Project does not belong to the selected branch");
  }
  return project;
}

export async function createProject(input: unknown): Promise<Project> {
  const data = parseSchema(projectInputSchema, input);
  await requireBranch(data.branchId);
  const db = await getDb();
  const result = await db.insert(projects).values({
    branchId: data.branchId,
    name: data.name,
    billable: data.billable,
    startDate: data.startDate,
    endDate: data.endDate ?? null,
  });
  const id = await insertIdFromResult(result);
  return requireProject(id);
}

export async function updateProject(id: number, input: unknown): Promise<Project> {
  await requireProject(id);
  const data = parseSchema(projectInputSchema, input);
  await requireBranch(data.branchId);
  const db = await getDb();
  await db
    .update(projects)
    .set({
      branchId: data.branchId,
      name: data.name,
      billable: data.billable,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      updatedAt: nowSqlTimestamp(),
    })
    .where(eq(projects.id, id));
  return requireProject(id);
}

export async function deleteProject(id: number): Promise<void> {
  await requireProject(id);
  const db = await getDb();
  try {
    await db.delete(projects).where(eq(projects.id, id));
  } catch {
    throw new AppError("Cannot delete project while related records exist");
  }
}
