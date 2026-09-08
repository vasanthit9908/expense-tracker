import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId } from "@/lib/context";
import { listProjects } from "@/services/project-service";
import { cn } from "@/lib/utils";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const orgId = await getSelectedOrganisationId();
  const projects = (await listProjects(orgId ?? undefined)).filter((project) =>
    q ? project.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Billable and non-billable projects both contribute costs to P&L."
        actionHref="/projects/new"
        actionLabel="New project"
      />
      <SearchBox placeholder="Search projects" />
      {projects.length === 0 ? (
        <EmptyState title="No projects" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>End</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell>{project.name}</TableCell>
                <TableCell>{project.branchName}</TableCell>
                <TableCell>
                  <Badge variant={project.billable ? "default" : "secondary"}>
                    {project.billable ? "Billable" : "Non-billable"}
                  </Badge>
                </TableCell>
                <TableCell>{project.startDate}</TableCell>
                <TableCell>{project.endDate ?? "Open"}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/projects/${project.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
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
