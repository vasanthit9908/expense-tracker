import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { MoneyText } from "@/components/money-text";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId } from "@/lib/context";
import { toIsoDate } from "@/lib/dates";
import { currentAllocationSummary, listAllocations, listEmployees } from "@/services/employee-service";
import { getOrganisation } from "@/services/organisation-service";
import { cn } from "@/lib/utils";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const orgId = await getSelectedOrganisationId();
  const employees = (await listEmployees(orgId ?? undefined)).filter((employee) =>
    q ? employee.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  const organisation = orgId ? await getOrganisation(orgId) : undefined;
  const today = toIsoDate(new Date());
  const rows = await Promise.all(
    employees.map(async (employee) => {
      const allocations = await listAllocations({ employeeId: employee.id });
      const summary = currentAllocationSummary(allocations, today);
      return { employee, summary };
    }),
  );
  return (
    <div>
      <PageHeader
        title="Employees"
        description="Annual CTC is prorated by calendar day and allocation percentage."
        actionHref="/employees/new"
        actionLabel="New employee"
      />
      <SearchBox placeholder="Search employees" />
      {rows.length === 0 ? (
        <EmptyState title="No employees" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Annual CTC</TableHead>
              <TableHead>Allocated</TableHead>
              <TableHead>Unallocated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ employee, summary }) => (
              <TableRow key={employee.id}>
                <TableCell>{employee.name}</TableCell>
                <TableCell>
                  <MoneyText minor={employee.ctc} currency={organisation?.currency ?? "INR"} />
                </TableCell>
                <TableCell>{summary.allocatedPercent.toString()}%</TableCell>
                <TableCell>{summary.unallocatedPercent.toString()}%</TableCell>
                <TableCell className="text-right">
                  <Link href={`/employees/${employee.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                    Open
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
