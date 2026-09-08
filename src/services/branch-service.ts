import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { branches, type Branch } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { branchInputSchema, parseSchema } from "@/validations";
import { requireOrganisation } from "@/services/organisation-service";

export async function listBranches(organisationId?: number): Promise<Branch[]> {
  const db = await getDb();
  if (organisationId) {
    return db.select().from(branches).where(eq(branches.organisationId, organisationId)).orderBy(branches.name);
  }
  return db.select().from(branches).orderBy(branches.name);
}

export async function getBranch(id: number): Promise<Branch | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return row;
}

export async function requireBranch(id: number): Promise<Branch> {
  const branch = await getBranch(id);
  if (!branch) {
    throw new AppError("Branch not found");
  }
  return branch;
}

export async function requireBranchInOrganisation(branchId: number, organisationId: number): Promise<Branch> {
  const branch = await requireBranch(branchId);
  if (branch.organisationId !== organisationId) {
    throw new AppError("Branch does not belong to the selected organisation");
  }
  return branch;
}

export async function createBranch(input: unknown): Promise<Branch> {
  const data = parseSchema(branchInputSchema, input);
  await requireOrganisation(data.organisationId);
  const db = await getDb();
  const [row] = await db
    .insert(branches)
    .values({
      organisationId: data.organisationId,
      name: data.name,
      location: data.location,
    })
    .returning();
  return row!;
}

export async function updateBranch(id: number, input: unknown): Promise<Branch> {
  await requireBranch(id);
  const data = parseSchema(branchInputSchema, input);
  await requireOrganisation(data.organisationId);
  const db = await getDb();
  const [row] = await db
    .update(branches)
    .set({
      organisationId: data.organisationId,
      name: data.name,
      location: data.location,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(branches.id, id))
    .returning();
  return row!;
}

export async function deleteBranch(id: number): Promise<void> {
  await requireBranch(id);
  const db = await getDb();
  try {
    await db.delete(branches).where(eq(branches.id, id));
  } catch {
    throw new AppError("Cannot delete branch while related records exist");
  }
}
