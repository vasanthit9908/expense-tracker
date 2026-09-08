import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { MoneyText } from "@/components/money-text";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId } from "@/lib/context";
import { expenseScope, listExpenseAllocations, listExpenses } from "@/services/expense-service";
import { getOrganisation } from "@/services/organisation-service";
import { cn } from "@/lib/utils";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const orgId = await getSelectedOrganisationId();
  const organisation = orgId ? await getOrganisation(orgId) : undefined;
  const expenses = (await listExpenses(orgId ?? undefined)).filter((expense) =>
    q ? expense.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  const rows = await Promise.all(
    expenses.map(async (expense) => {
      const allocations = await listExpenseAllocations(expense.id);
      return { expense, scope: expenseScope(expense, allocations.length), allocations };
    }),
  );
  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Organisation, branch, or split across projects. Project splits must equal 100%."
        actionHref="/expenses/new"
        actionLabel="New expense"
      />
      <SearchBox placeholder="Search expenses" />
      {rows.length === 0 ? (
        <EmptyState title="No expenses" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ expense, scope }) => (
              <TableRow key={expense.id}>
                <TableCell>{expense.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{scope}</Badge>
                </TableCell>
                <TableCell>{expense.expenseDate}</TableCell>
                <TableCell>
                  <MoneyText minor={expense.amount} currency={organisation?.currency ?? "INR"} />
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/expenses/${expense.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
