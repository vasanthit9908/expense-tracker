import { ProjectForm } from "@/components/forms/project-form";
import { PageHeader } from "@/components/page-header";
import { getSelectedOrganisationId } from "@/lib/context";
import { listBranches } from "@/services/branch-service";

export default async function NewProjectPage() {
  const orgId = await getSelectedOrganisationId();
  const branches = await listBranches(orgId ?? undefined);
  return (
    <div>
      <PageHeader title="New project" />
      <ProjectForm branches={branches} />
    </div>
  );
}
