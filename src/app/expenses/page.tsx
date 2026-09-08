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
  const baseCurrency = organisation?.currency ?? "USD";
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
        description="Enter the paid currency and amount. Foreign-currency expenses are booked into the organisation currency using the exchange rate you provide. P&L always uses the booked amount."
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
              <TableHead>Paid</TableHead>
              <TableHead>Booked ({baseCurrency})</TableHead>
              <TableHead>Date</TableHead>
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
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <MoneyText minor={expense.originalAmount} currency={expense.currency} />
                    {expense.currency !== baseCurrency ? (
                      <span className="text-xs text-muted-foreground">
                        @ {expense.exchangeRate} → {baseCurrency}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <MoneyText minor={expense.amount} currency={baseCurrency} />
                </TableCell>
                <TableCell>{expense.expenseDate}</TableCell>
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
