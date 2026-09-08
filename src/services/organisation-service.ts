import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organisations, type Organisation } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { organisationInputSchema, parseSchema } from "@/validations";

export async function listOrganisations(): Promise<Organisation[]> {
  const db = await getDb();
  return db.select().from(organisations).orderBy(organisations.name);
}

export async function getOrganisation(id: number): Promise<Organisation | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(organisations).where(eq(organisations.id, id)).limit(1);
  return row;
}

export async function requireOrganisation(id: number): Promise<Organisation> {
  const organisation = await getOrganisation(id);
  if (!organisation) {
    throw new AppError("Organisation not found");
  }
  return organisation;
}

export async function createOrganisation(input: unknown): Promise<Organisation> {
  const data = parseSchema(organisationInputSchema, input);
  const db = await getDb();
  const [row] = await db
    .insert(organisations)
    .values({
      name: data.name,
      currency: data.currency,
    })
    .returning();
  return row!;
}

export async function updateOrganisation(id: number, input: unknown): Promise<Organisation> {
  await requireOrganisation(id);
  const data = parseSchema(organisationInputSchema, input);
  const db = await getDb();
  const [row] = await db
    .update(organisations)
    .set({
      name: data.name,
      currency: data.currency,
      updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
    })
    .where(eq(organisations.id, id))
    .returning();
  return row!;
}

export async function deleteOrganisation(id: number): Promise<void> {
  await requireOrganisation(id);
  const db = await getDb();
  try {
    await db.delete(organisations).where(eq(organisations.id, id));
  } catch {
    throw new AppError("Cannot delete organisation while related records exist");
  }
}
