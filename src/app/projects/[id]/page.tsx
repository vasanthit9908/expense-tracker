import Link from "next/link";
import { notFound } from "next/navigation";
import { MoneyText } from "@/components/money-text";
import { EmptyState, PageHeader } from "@/components/page-header";
import { ProjectDetailsCard } from "@/components/project-details-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toIsoDate } from "@/lib/dates";
import { fromStoredPercent } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getBranch, listBranches } from "@/services/branch-service";
import { getEmployee, listAllocations } from "@/services/employee-service";
import { getOrganisation } from "@/services/organisation-service";
import { getProject } from "@/services/project-service";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const branch = await getBranch(project.branchId);
  if (!branch) notFound();
  const organisation = await getOrganisation(branch.organisationId);
  const currency = organisation?.currency ?? "USD";
  const branches = await listBranches();
  const today = toIsoDate(new Date());

  const allocations = await listAllocations({ projectId: project.id });
  const teamRows = (
    await Promise.all(
      allocations.map(async (allocation) => {
        const employee = await getEmployee(allocation.employeeId);
        if (!employee) return null;
        const isActive =
          allocation.effectiveFrom <= today &&
          (!allocation.effectiveTo || allocation.effectiveTo >= today);
        return { allocation, employee, isActive };
      }),
    )
  )
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.employee.name.localeCompare(b.employee.name));

  const activeCount = teamRows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={project.name}
        description={`${branch.name}${organisation ? ` · ${organisation.name}` : ""}`}
      />

      <ProjectDetailsCard
        project={project}
        branchName={branch.name}
        activeCount={activeCount}
        branches={branches}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Team members</h2>
          <Link href="/employees" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Manage allocations
          </Link>
        </div>
        {teamRows.length === 0 ? (
          <EmptyState title="No team members allocated to this project" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>CTC</TableHead>
                <TableHead>Allocation %</TableHead>
                <TableHead>From date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamRows.map(({ allocation, employee, isActive }) => (
                <TableRow key={allocation.id}>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>
                    <MoneyText minor={employee.ctc} currency={currency} />
                  </TableCell>
                  <TableCell>{fromStoredPercent(allocation.allocationPercentage).toString()}%</TableCell>
                  <TableCell>{allocation.effectiveFrom}</TableCell>
                  <TableCell>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/employees/${employee.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
