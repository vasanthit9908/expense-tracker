import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { MoneyText } from "@/components/money-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId, periodFromSearchParams } from "@/lib/context";
import { formatPercent } from "@/lib/currency";
import { getOrganisation } from "@/services/organisation-service";
import { getOrganisationPnl } from "@/services/pnl-service";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; preset?: string }>;
}) {
  const params = await searchParams;
  const period = periodFromSearchParams(params);
  const orgId = await getSelectedOrganisationId();
  if (!orgId) {
    return <EmptyState title="Select an organisation first" />;
  }
  const organisation = await getOrganisation(orgId);
  if (!organisation) return <EmptyState title="Organisation not found" />;
  const pnl = await getOrganisationPnl(orgId, period);
  const currency = organisation.currency;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Organisation P&L"
        description={`${pnl.organisationName} · ${currency} · ${period.start} to ${period.end}`}
      />
      <PeriodPicker start={period.start} end={period.end} />
      <p className="text-sm text-muted-foreground">
        Branch profits do not include organisation-wide expenses or unallocated employee cost. Those appear only here.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <LineRows
            currency={currency}
            rows={[
              ...pnl.projectRevenueLines.map((line) => ({ name: `${line.name} revenue`, amount: line.amountMinor })),
              ...pnl.branchRevenueLines.map((line) => ({ name: line.name, amount: line.amountMinor })),
              ...(pnl.otherRevenueMinor ? [{ name: "Other revenue", amount: pnl.otherRevenueMinor }] : []),
              { name: "Total revenue", amount: pnl.totalRevenueMinor, total: true },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <LineRows
            currency={currency}
            rows={[
              { name: "Allocated employee cost", amount: pnl.allocatedEmployeeCostMinor },
              { name: "Unallocated employee cost", amount: pnl.unallocatedEmployeeCostMinor },
              { name: "Project expenses", amount: pnl.projectExpenseCostMinor },
              { name: "Branch expenses", amount: pnl.branchExpenseCostMinor },
              { name: "Organisation expenses", amount: pnl.organisationExpenseCostMinor },
              { name: "Total costs", amount: pnl.totalCostMinor, total: true },
            ]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Profit</span>
            <MoneyText minor={pnl.profitMinor} currency={currency} signed />
          </div>
          <div className="flex justify-between">
            <span>Margin</span>
            <span>{pnl.marginPercent == null ? "n/a (zero revenue)" : formatPercent(pnl.marginPercent)}</span>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Billable vs non-billable</h2>
        <LineRows
          currency={currency}
          rows={[
            { name: "Billable revenue", amount: pnl.billableRevenueMinor },
            { name: "Billable project cost", amount: pnl.billableProjectCostMinor },
            { name: "Billable profit", amount: pnl.billableProfitMinor },
            { name: "Non-billable employee cost", amount: pnl.nonBillableEmployeeCostMinor },
            { name: "Non-billable expenses", amount: pnl.nonBillableExpenseCostMinor },
          ]}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Branch breakdown</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pnl.branches.map((branch) => (
              <TableRow key={branch.branchId}>
                <TableCell>
                  <Link className="hover:underline" href={`/reports/branches/${branch.branchId}`}>
                    {branch.branchName}
                  </Link>
                </TableCell>
                <TableCell>
                  <MoneyText minor={branch.revenueMinor} currency={currency} />
                </TableCell>
                <TableCell>
                  <MoneyText minor={branch.totalCostMinor} currency={currency} />
                </TableCell>
                <TableCell>
                  <MoneyText minor={branch.profitMinor} currency={currency} signed />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Project breakdown</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pnl.projects.map((project) => (
              <TableRow key={project.projectId}>
                <TableCell>
                  <Link className="hover:underline" href={`/reports/projects/${project.projectId}`}>
                    {project.projectName}
                  </Link>
                </TableCell>
                <TableCell>{project.billable ? "Billable" : "Non-billable"}</TableCell>
                <TableCell>
                  <MoneyText minor={project.revenueMinor} currency={currency} />
                </TableCell>
                <TableCell>
                  <MoneyText minor={project.totalCostMinor} currency={currency} />
                </TableCell>
                <TableCell>
                  <MoneyText minor={project.profitMinor} currency={currency} signed />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Expense breakdown</h2>
        <LineRows
          currency={currency}
          rows={[
            ...pnl.organisationExpenses.map((item) => ({ name: `Org: ${item.name}`, amount: item.amountMinor })),
            ...pnl.branchExpenses.map((item) => ({ name: item.name, amount: item.amountMinor })),
            ...pnl.projectExpenses.map((item) => ({ name: item.name, amount: item.amountMinor })),
          ]}
        />
      </section>
    </div>
  );
}

function LineRows({
  rows,
  currency,
}: {
  currency: string;
  rows: { name: string; amount: bigint; total?: boolean }[];
}) {
  return (
    <div className="divide-y rounded-lg border">
      {rows.map((row) => (
        <div key={row.name} className={`flex justify-between px-3 py-2 text-sm ${row.total ? "font-semibold" : ""}`}>
          <span>{row.name}</span>
          <MoneyText minor={row.amount} currency={currency} signed={row.total} />
        </div>
      ))}
    </div>
  );
}
