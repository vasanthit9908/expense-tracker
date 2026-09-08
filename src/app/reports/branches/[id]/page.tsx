import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { MoneyText } from "@/components/money-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId, periodFromSearchParams } from "@/lib/context";
import { formatPercent } from "@/lib/currency";
import { getOrganisation } from "@/services/organisation-service";
import { getBranchPnlReport } from "@/services/pnl-service";

export default async function BranchReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string; end?: string; preset?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const period = periodFromSearchParams(query);
  const orgId = await getSelectedOrganisationId();
  if (!orgId) return <EmptyState title="Select an organisation first" />;
  const organisation = await getOrganisation(orgId);
  if (!organisation) notFound();
  const { report, currency } = await getBranchPnlReport(orgId, Number(id), period);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${report.branchName} P&L`}
        description={`${report.location} · Organisation expenses are not included.`}
      />
      <PeriodPicker start={period.start} end={period.end} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Revenue" value={report.revenueMinor} currency={currency} />
        <Metric label="Employee costs" value={report.projectEmployeeCostMinor} currency={currency} />
        <Metric label="Project expenses" value={report.projectExpenseCostMinor} currency={currency} />
        <Metric label="Branch expenses" value={report.branchExpenseCostMinor} currency={currency} />
        <Metric label="Profit" value={report.profitMinor} currency={currency} signed />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Margin</CardTitle>
          </CardHeader>
          <CardContent>{report.marginPercent == null ? "n/a" : formatPercent(report.marginPercent)}</CardContent>
        </Card>
      </div>
      <h2 className="text-lg font-semibold">Project-wise breakdown</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead>Employee cost</TableHead>
            <TableHead>Expenses</TableHead>
            <TableHead>Profit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.projects.map((project) => (
            <TableRow key={project.projectId}>
              <TableCell>
                <Link className="hover:underline" href={`/reports/projects/${project.projectId}`}>
                  {project.projectName}
                </Link>
              </TableCell>
              <TableCell>
                <MoneyText minor={project.revenueMinor} currency={currency} />
              </TableCell>
              <TableCell>
                <MoneyText minor={project.employeeCostMinor} currency={currency} />
              </TableCell>
              <TableCell>
                <MoneyText minor={project.expenseCostMinor} currency={currency} />
              </TableCell>
              <TableCell>
                <MoneyText minor={project.profitMinor} currency={currency} signed />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Metric({
  label,
  value,
  currency,
  signed,
}: {
  label: string;
  value: bigint;
  currency: string;
  signed?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <MoneyText minor={value} currency={currency} signed={signed} />
      </CardContent>
    </Card>
  );
}
