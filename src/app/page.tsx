import Link from "next/link";
import { DashboardCharts } from "@/components/dashboard-charts";
import { MoneyText } from "@/components/money-text";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSelectedOrganisationId, periodFromSearchParams } from "@/lib/context";
import { formatPercent } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import { getOrganisation } from "@/services/organisation-service";
import { getOrganisationPnl } from "@/services/pnl-service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string; preset?: string }>;
}) {
  const params = await searchParams;
  const period = periodFromSearchParams(params);
  const orgId = await getSelectedOrganisationId();
  if (!orgId) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <EmptyState title="Create an organisation to get started" hint="Use Organisations to add one, then run npm run db:seed for sample data." />
      </div>
    );
  }
  const organisation = await getOrganisation(orgId);
  if (!organisation) {
    return <EmptyState title="Selected organisation was not found" />;
  }
  const pnl = await getOrganisationPnl(orgId, period);
  const cards: { label: string; value?: bigint; signed?: boolean; text?: string }[] = [
    { label: "Total Revenue", value: pnl.totalRevenueMinor },
    { label: "Total Costs", value: pnl.totalCostMinor },
    { label: "Total Profit", value: pnl.profitMinor, signed: true },
    { label: "Profit Margin", text: pnl.marginPercent == null ? "n/a" : formatPercent(pnl.marginPercent) },
    { label: "Billable Revenue", value: pnl.billableRevenueMinor },
    { label: "Non-billable Costs", value: pnl.nonBillableCostMinor },
    { label: "Employee Costs", value: pnl.totalEmployeeCostMinor },
    { label: "Unallocated Employee Cost", value: pnl.unallocatedEmployeeCostMinor },
    { label: "Project Expenses", value: pnl.projectExpenseCostMinor },
    { label: "Branch Expenses", value: pnl.branchExpenseCostMinor },
    { label: "Organisation Expenses", value: pnl.organisationExpenseCostMinor },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${organisation.name} · ${organisation.currency} · ${formatDisplayDate(period.start)} to ${formatDisplayDate(period.end)}`}
      />
      <PeriodPicker start={period.start} end={period.end} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {card.value === undefined ? (
                <span className="text-lg font-semibold tabular-nums">{card.text}</span>
              ) : (
                <MoneyText
                  minor={card.value}
                  currency={organisation.currency}
                  signed={card.signed}
                  className="text-lg font-semibold"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <DashboardCharts
        currency={organisation.currency}
        costBreakdown={[
          { name: "Allocated employees", value: Number(pnl.allocatedEmployeeCostMinor) },
          { name: "Unallocated employees", value: Number(pnl.unallocatedEmployeeCostMinor) },
          { name: "Project expenses", value: Number(pnl.projectExpenseCostMinor) },
          { name: "Branch expenses", value: Number(pnl.branchExpenseCostMinor) },
          { name: "Organisation expenses", value: Number(pnl.organisationExpenseCostMinor) },
        ].filter((item) => item.value !== 0)}
        projectProfit={pnl.projects.map((project) => ({
          name: project.projectName,
          profit: Number(project.profitMinor),
          revenue: Number(project.revenueMinor),
          cost: Number(project.totalCostMinor),
        }))}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <BreakdownTable
          title="Organisations"
          rows={[{ name: organisation.name, revenue: pnl.totalRevenueMinor, cost: pnl.totalCostMinor, profit: pnl.profitMinor }]}
          currency={organisation.currency}
        />
        <BreakdownTable
          title="Branches"
          rows={pnl.branches.map((branch) => ({
            name: branch.branchName,
            revenue: branch.revenueMinor,
            cost: branch.totalCostMinor,
            profit: branch.profitMinor,
            href: `/reports/branches/${branch.branchId}`,
          }))}
          currency={organisation.currency}
        />
        <BreakdownTable
          title="Projects"
          rows={pnl.projects.map((project) => ({
            name: project.projectName,
            revenue: project.revenueMinor,
            cost: project.totalCostMinor,
            profit: project.profitMinor,
            href: `/reports/projects/${project.projectId}`,
          }))}
          currency={organisation.currency}
        />
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  currency,
}: {
  title: string;
  currency: string;
  rows: { name: string; revenue: bigint; cost: bigint; profit: bigint; href?: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.name}>
                <TableCell>
                  {row.href ? (
                    <Link className="underline-offset-4 hover:underline" href={row.href}>
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <MoneyText minor={row.profit} currency={currency} signed />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
