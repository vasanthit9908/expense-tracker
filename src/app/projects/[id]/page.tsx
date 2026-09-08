import { notFound } from "next/navigation";
import { deleteProjectAction } from "@/app/actions/projects";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader } from "@/components/page-header";
import { listBranches } from "@/services/branch-service";
import { getProject } from "@/services/project-service";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();
  const branches = await listBranches();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${project.name}`} />
      <ProjectForm branches={branches} project={project} />
      <ConfirmDelete
        title="Delete project?"
        description="This fails if allocations, expenses or invoices still reference the project."
        redirectTo="/projects"
        action={deleteProjectAction}
        id={project.id}
      />
    </div>
  );
}
