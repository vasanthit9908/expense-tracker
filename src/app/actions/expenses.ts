"use server";

import { runAction } from "@/app/actions/helpers";
import { createExpense, deleteExpense, updateExpense } from "@/services/expense-service";

type ExpensePayload = {
  organisationId: number;
  branchId?: number | null;
  name: string;
  amountMajor: string;
  expenseDate: string;
  scope: "organisation" | "branch" | "projects";
  allocations: { projectId: number; allocationPercentage: number }[];
};

export async function createExpenseAction(input: ExpensePayload) {
  return runAction(() => createExpense(input), ["/expenses", "/reports"]);
}

export async function updateExpenseAction(id: number, input: ExpensePayload) {
  return runAction(() => updateExpense(id, input), ["/expenses", "/reports"]);
}

export async function deleteExpenseAction(id: number) {
  return runAction(() => deleteExpense(id), ["/expenses", "/reports"]);
}
