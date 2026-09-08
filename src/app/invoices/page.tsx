import Link from "next/link";
import { InvoiceFilters } from "@/components/invoice-filters";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { MoneyText } from "@/components/money-text";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId } from "@/lib/context";
import { listBranches } from "@/services/branch-service";
import { listInvoices } from "@/services/invoice-service";
import { getOrganisation } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";
import { cn } from "@/lib/utils";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    branchId?: string;
    projectId?: string;
    status?: string;
    start?: string;
    end?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const orgId = await getSelectedOrganisationId();
  const organisation = orgId ? await getOrganisation(orgId) : undefined;
  const branches = await listBranches(orgId ?? undefined);
  const projects = await listProjects(orgId ?? undefined);
  const invoices = (
    await listInvoices({
      organisationId: orgId ?? undefined,
      branchId: params.branchId ? Number(params.branchId) : undefined,
      projectId: params.projectId ? Number(params.projectId) : undefined,
      status: params.status,
      startDate: params.start,
      endDate: params.end,
    })
  ).filter((invoice) =>
    params.q
      ? `${invoice.invoiceNumber} ${invoice.description}`.toLowerCase().includes(params.q.toLowerCase())
      : true,
  );
  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Revenue is recognised on invoice date. Cancelled invoices are excluded from P&L."
        actionHref="/invoices/new"
        actionLabel="New invoice"
      />
      <SearchBox placeholder="Search invoices" />
      <InvoiceFilters branches={branches} projects={projects} />
      {invoices.length === 0 ? (
        <EmptyState title="No invoices match the filters" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.invoiceDate}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "CANCELLED" ? "destructive" : "secondary"}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <MoneyText minor={invoice.amount} currency={organisation?.currency ?? "INR"} />
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/invoices/${invoice.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
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
