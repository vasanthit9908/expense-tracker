import { eq } from "drizzle-orm";
import Decimal from "decimal.js";
import { getDb } from "@/db/client";
import { expenseAllocations, expenses, type Expense, type ExpenseAllocation } from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  allocateByPercentages,
  assertPercentSum100,
  fromStoredPercent,
  normalizeExpenseFx,
  toStoredPercent,
} from "@/lib/money";
import { expenseInputSchema, parseSchema } from "@/validations";
import { requireBranchInOrganisation } from "@/services/branch-service";
import { requireOrganisation } from "@/services/organisation-service";
import { requireProjectInOrganisation } from "@/services/project-service";

export async function listExpenses(organisationId?: number): Promise<Expense[]> {
  const db = await getDb();
  if (organisationId) {
    return db
      .select()
      .from(expenses)
      .where(eq(expenses.organisationId, organisationId))
      .orderBy(expenses.expenseDate);
  }
  return db.select().from(expenses).orderBy(expenses.expenseDate);
}

export async function getExpense(id: number): Promise<Expense | undefined> {
  const db = await getDb();
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return row;
}

export async function requireExpense(id: number): Promise<Expense> {
  const expense = await getExpense(id);
  if (!expense) {
    throw new AppError("Expense not found");
  }
  return expense;
}

export async function listExpenseAllocations(expenseId: number): Promise<ExpenseAllocation[]> {
  const db = await getDb();
  return db.select().from(expenseAllocations).where(eq(expenseAllocations.expenseId, expenseId));
}

async function resolveExpenseWrite(input: unknown) {
  const data = parseSchema(expenseInputSchema, input);
  const organisation = await requireOrganisation(data.organisationId);
  const booked = normalizeExpenseFx({
    transactionCurrency: data.currency,
    baseCurrency: organisation.currency,
    originalMajor: data.originalAmountMajor,
    exchangeRate: data.exchangeRate,
  });
  if (data.scope === "branch" && data.branchId) {
    await requireBranchInOrganisation(data.branchId, data.organisationId);
  }
  const percentages = data.allocations.map((item) => new Decimal(item.allocationPercentage));
  if (data.scope === "projects") {
    assertPercentSum100(percentages);
    for (const allocation of data.allocations) {
      await requireProjectInOrganisation(allocation.projectId, data.organisationId);
    }
  }
  const amounts = allocateByPercentages(booked.amountMinor, percentages);
  return { data, booked, amounts };
}

export async function createExpense(input: unknown): Promise<Expense> {
  const { data, booked, amounts } = await resolveExpenseWrite(input);
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [expense] = await tx
      .insert(expenses)
      .values({
        organisationId: data.organisationId,
        branchId: data.scope === "branch" ? data.branchId! : null,
        name: data.name,
        currency: booked.currency,
        originalAmount: Number(booked.originalAmountMinor),
        exchangeRate: booked.exchangeRate,
        amount: Number(booked.amountMinor),
        expenseDate: data.expenseDate,
      })
      .returning();
    if (data.scope === "projects") {
      for (let index = 0; index < data.allocations.length; index += 1) {
        const allocation = data.allocations[index]!;
        await tx.insert(expenseAllocations).values({
          expenseId: expense!.id,
          projectId: allocation.projectId,
          allocationPercentage: toStoredPercent(allocation.allocationPercentage),
          allocatedAmount: Number(amounts[index]!),
        });
      }
    }
    return expense!;
  });
}

export async function updateExpense(id: number, input: unknown): Promise<Expense> {
  await requireExpense(id);
  const { data, booked, amounts } = await resolveExpenseWrite(input);
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [expense] = await tx
      .update(expenses)
      .set({
        organisationId: data.organisationId,
        branchId: data.scope === "branch" ? data.branchId! : null,
        name: data.name,
        currency: booked.currency,
        originalAmount: Number(booked.originalAmountMinor),
        exchangeRate: booked.exchangeRate,
        amount: Number(booked.amountMinor),
        expenseDate: data.expenseDate,
        updatedAt: new Date().toISOString().slice(0, 19).replace("T", " "),
      })
      .where(eq(expenses.id, id))
      .returning();
    await tx.delete(expenseAllocations).where(eq(expenseAllocations.expenseId, id));
    if (data.scope === "projects") {
      for (let index = 0; index < data.allocations.length; index += 1) {
        const allocation = data.allocations[index]!;
        await tx.insert(expenseAllocations).values({
          expenseId: id,
          projectId: allocation.projectId,
          allocationPercentage: toStoredPercent(allocation.allocationPercentage),
          allocatedAmount: Number(amounts[index]!),
        });
      }
    }
    return expense!;
  });
}

export async function deleteExpense(id: number): Promise<void> {
  await requireExpense(id);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(expenseAllocations).where(eq(expenseAllocations.expenseId, id));
    await tx.delete(expenses).where(eq(expenses.id, id));
  });
}

export function expenseScope(expense: Expense, allocationCount: number): "organisation" | "branch" | "projects" {
  if (allocationCount > 0) {
    return "projects";
  }
  if (expense.branchId) {
    return "branch";
  }
  return "organisation";
}

export { fromStoredPercent };
