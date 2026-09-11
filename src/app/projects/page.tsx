import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { getSelectedOrganisationId } from "@/lib/context";
import { listProjects } from "@/services/project-service";

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
        description="Open a project to view details and team allocations."
        actionHref="/projects/new"
        actionLabel="New project"
      />
      <SearchBox placeholder="Search projects" />
      {projects.length === 0 ? (
        <EmptyState title="No projects" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="min-w-0 truncate text-lg font-semibold tracking-tight">
                  {project.name}
                </h2>
                <Badge variant={project.billable ? "default" : "secondary"} className="shrink-0">
                  {project.billable ? "Billable" : "Non-billable"}
                </Badge>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Start date</dt>
                  <dd className="mt-0.5 font-medium">{project.startDate}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Active team</dt>
                  <dd className="mt-0.5 font-medium">
                    {project.activeEmployeeCount}{" "}
                    {project.activeEmployeeCount === 1 ? "member" : "members"}
                  </dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
