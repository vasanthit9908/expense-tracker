import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/page-header";
import { PeriodPicker } from "@/components/period-picker";
import { MoneyText } from "@/components/money-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId, periodFromSearchParams } from "@/lib/context";
import { formatPercent } from "@/lib/currency";
import { getOrganisation } from "@/services/organisation-service";
import { getProjectPnlReport } from "@/services/pnl-service";

export default async function ProjectReportPage({
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
  const { report, currency } = await getProjectPnlReport(orgId, Number(id), period);

  return (
    <div className="space-y-6">
      <PageHeader title={`${report.projectName} P&L`} />
      <PeriodPicker start={period.start} end={period.end} />
      <div className="flex flex-wrap gap-2">
        <Badge>{report.billable ? "Billable" : "Non-billable"}</Badge>
        <Badge variant="secondary">{report.branchName}</Badge>
        <Badge variant="secondary">
          {report.startDate} → {report.endDate ?? "open"}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Revenue" value={report.revenueMinor} currency={currency} />
        <Metric label="Employee cost" value={report.employeeCostMinor} currency={currency} />
        <Metric label="Project expenses" value={report.expenseCostMinor} currency={currency} />
        <Metric label="Total cost" value={report.totalCostMinor} currency={currency} />
        <Metric label="Profit" value={report.profitMinor} currency={currency} signed />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Margin</CardTitle>
          </CardHeader>
          <CardContent>{report.marginPercent == null ? "n/a" : formatPercent(report.marginPercent)}</CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold">Employee cost breakdown</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Annual CTC</TableHead>
            <TableHead>Allocation %</TableHead>
            <TableHead>Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.employeeLines.map((line) => (
            <TableRow key={`${line.employeeId}-${line.projectId}-${line.allocationPercentage.toString()}`}>
              <TableCell>{line.employeeName}</TableCell>
              <TableCell>
                <MoneyText minor={line.annualCtcMinor} currency={currency} />
              </TableCell>
              <TableCell>{line.allocationPercentage.toString()}%</TableCell>
              <TableCell>
                <MoneyText minor={line.costMinor} currency={currency} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="text-lg font-semibold">Expense breakdown</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Expense</TableHead>
            <TableHead>Total expense</TableHead>
            <TableHead>Project allocation %</TableHead>
            <TableHead>Allocated amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.expenseLines.map((line) => (
            <TableRow key={line.expenseId}>
              <TableCell>{line.expenseName}</TableCell>
              <TableCell>
                <MoneyText minor={line.expenseAmountMinor} currency={currency} />
              </TableCell>
              <TableCell>{line.allocationPercentage.toString()}%</TableCell>
              <TableCell>
                <MoneyText minor={line.allocatedAmountMinor} currency={currency} />
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
