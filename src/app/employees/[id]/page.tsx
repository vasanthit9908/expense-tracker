import { notFound } from "next/navigation";
import { deleteAllocationAction, deleteEmployeeAction } from "@/app/actions/employees";
import { ConfirmDelete } from "@/components/confirm-delete";
import { AllocationForm } from "@/components/forms/allocation-form";
import { EmployeeForm } from "@/components/forms/employee-form";
import { MoneyText } from "@/components/money-text";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toIsoDate } from "@/lib/dates";
import { fromMinorUnits, fromStoredPercent } from "@/lib/money";
import { currentAllocationSummary, getEmployee, listAllocations } from "@/services/employee-service";
import { getOrganisation, listOrganisations } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployee(Number(id));
  if (!employee) notFound();
  const organisations = await listOrganisations();
  const organisation = await getOrganisation(employee.organisationId);
  const projects = await listProjects(employee.organisationId);
  const allocations = await listAllocations({ employeeId: employee.id });
  const today = toIsoDate(new Date());
  const summary = currentAllocationSummary(allocations, today);
  const monthly = fromMinorUnits(BigInt(employee.ctc)).div(12);
  const projectName = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <div className="space-y-8">
      <PageHeader
        title={employee.name}
        description={`${organisation?.name ?? ""} · ${organisation?.currency ?? ""}`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Annual CTC</p>
          <MoneyText minor={employee.ctc} currency={organisation?.currency ?? "INR"} />
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Current allocated</p>
          <p className="font-medium">{summary.allocatedPercent.toString()}%</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Unallocated</p>
          <p className="font-medium">{summary.unallocatedPercent.toString()}%</p>
        </div>
      </div>
      <EmployeeForm organisations={organisations} defaultOrganisationId={employee.organisationId} employee={employee} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Current project allocations</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>%</TableHead>
              <TableHead>Monthly allocated cost</TableHead>
              <TableHead>Effective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.current.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{projectName.get(item.projectId) ?? item.projectId}</TableCell>
                <TableCell>{fromStoredPercent(item.allocationPercentage).toString()}%</TableCell>
                <TableCell>
                  <MoneyText
                    minor={BigInt(
                      monthly.mul(fromStoredPercent(item.allocationPercentage)).div(100).mul(100).toFixed(0),
                    )}
                    currency={organisation?.currency ?? "INR"}
                  />
                </TableCell>
                <TableCell>
                  {item.effectiveFrom} → {item.effectiveTo ?? "open"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Allocation history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>%</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{projectName.get(item.projectId) ?? item.projectId}</TableCell>
                <TableCell>{fromStoredPercent(item.allocationPercentage).toString()}%</TableCell>
                <TableCell>{item.effectiveFrom}</TableCell>
                <TableCell>{item.effectiveTo ?? "Open"}</TableCell>
                <TableCell className="text-right">
                  <ConfirmDelete
                    title="Remove allocation?"
                    description="Historical P&L for dates covered by this row will change."
                    action={deleteAllocationAction}
                    id={item.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <AllocationForm employeeId={employee.id} projects={projects} />
      <ConfirmDelete
        title="Delete employee?"
        description="This fails if allocation rows still exist."
        redirectTo="/employees"
        action={deleteEmployeeAction}
        id={employee.id}
      />
    </div>
  );
}
