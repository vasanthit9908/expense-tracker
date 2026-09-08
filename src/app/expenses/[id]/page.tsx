import { notFound } from "next/navigation";
import { deleteExpenseAction } from "@/app/actions/expenses";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/page-header";
import { fromMinorUnits, fromStoredPercent } from "@/lib/money";
import { listBranches } from "@/services/branch-service";
import { expenseScope, getExpense, listExpenseAllocations } from "@/services/expense-service";
import { listOrganisations } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const expense = await getExpense(Number(id));
  if (!expense) notFound();
  const allocations = await listExpenseAllocations(expense.id);
  const organisations = await listOrganisations();
  const branches = await listBranches();
  const projects = await listProjects();
  const currency = organisations.find((org) => org.id === expense.organisationId)?.currency ?? "USD";
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${expense.name}`} />
      <ExpenseForm
        organisations={organisations}
        branches={branches}
        projects={projects}
        defaultOrganisationId={expense.organisationId}
        currency={currency}
        expense={{
          id: expense.id,
          organisationId: expense.organisationId,
          branchId: expense.branchId,
          name: expense.name,
          currency: expense.currency,
          originalAmountMajor: fromMinorUnits(BigInt(expense.originalAmount)).toString(),
          exchangeRate: expense.exchangeRate,
          expenseDate: expense.expenseDate,
          scope: expenseScope(expense, allocations.length),
          allocations: allocations.map((item) => ({
            projectId: item.projectId,
            allocationPercentage: Number(fromStoredPercent(item.allocationPercentage)),
          })),
        }}
      />
      <ConfirmDelete
        title="Delete expense?"
        description="Allocations for this expense will also be removed."
        redirectTo="/expenses"
        action={deleteExpenseAction}
        id={expense.id}
      />
    </div>
  );
}
