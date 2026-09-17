import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAllocationAction } from "@/app/actions/employees";
import { AddAllocationDialog } from "@/components/add-allocation-dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { EditEmployeeDialog } from "@/components/edit-employee-dialog";
import { MoneyText } from "@/components/money-text";
import { EmptyState, PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDisplayDate, toIsoDate } from "@/lib/dates";
import { fromStoredPercent, roundToMinor } from "@/lib/money";
import { currentAllocationSummary, getEmployee, listAllocations } from "@/services/employee-service";
import { getOrganisation, listOrganisations } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployee(Number(id));
  if (!employee) notFound();
  const organisations = await listOrganisations();
  const organisation = await getOrganisation(employee.organisationId);
  const currency = organisation?.currency ?? "INR";
  const projects = await listProjects(employee.organisationId);
  const allocations = await listAllocations({ employeeId: employee.id });
  const today = toIsoDate(new Date());
  const summary = currentAllocationSummary(allocations, today);
  const monthlyMinor = new Decimal(employee.ctc).div(12);
  const projectName = new Map(projects.map((project) => [project.id, project.name]));
  const activeIds = new Set(summary.current.map((item) => item.id));
  const allocatedPercent = Math.min(Math.max(summary.allocatedPercent.toNumber(), 0), 100);

  const rows = allocations
    .map((item) => ({ item, isActive: activeIds.has(item.id) }))
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) || b.item.effectiveFrom.localeCompare(a.item.effectiveFrom),
    );

  return (
    <div className="space-y-8">
      <PageHeader
        title={employee.name}
        description={organisation ? `${organisation.name} · ${organisation.currency}` : undefined}
        action={
          <EditEmployeeDialog
            employee={employee}
            organisations={organisations.map((org) => ({ id: org.id, name: org.name }))}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Annual CTC</p>
          <MoneyText minor={employee.ctc} currency={currency} className="mt-1 block text-lg font-semibold" />
          <p className="mt-1 text-xs text-muted-foreground">
            <MoneyText
              minor={roundToMinor(monthlyMinor)}
              currency={currency}
              className="font-normal"
            />{" "}
            per month
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Currently allocated</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{summary.allocatedPercent.toString()}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${allocatedPercent}%` }} />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Unallocated</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{summary.unallocatedPercent.toString()}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.current.length} active {summary.current.length === 1 ? "project" : "projects"}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Project allocations</h2>
          <AddAllocationDialog
            employeeId={employee.id}
            projects={projects.map((project) => ({ id: project.id, name: project.name }))}
          />
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Not allocated to any project yet" hint="Use Add allocation to assign this employee." />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Project</TableHead>
                  <TableHead>Allocation %</TableHead>
                  <TableHead>Monthly cost</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ item, isActive }) => {
                  const percent = fromStoredPercent(item.allocationPercentage);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="pl-4 font-medium">
                        <Link className="underline-offset-4 hover:underline" href={`/projects/${item.projectId}`}>
                          {projectName.get(item.projectId) ?? `Project #${item.projectId}`}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{percent.toString()}%</TableCell>
                      <TableCell>
                        <MoneyText
                          minor={roundToMinor(monthlyMinor.mul(percent).div(100))}
                          currency={currency}
                        />
                      </TableCell>
                      <TableCell>{formatDisplayDate(item.effectiveFrom)}</TableCell>
                      <TableCell>{item.effectiveTo ? formatDisplayDate(item.effectiveTo) : "Open"}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <ConfirmDelete
                          iconTrigger
                          title="Remove allocation?"
                          description="Historical P&L for dates covered by this row will change."
                          action={deleteAllocationAction}
                          id={item.id}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
