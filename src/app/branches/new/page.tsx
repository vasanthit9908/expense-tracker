import { BranchForm } from "@/components/forms/branch-form";
import { PageHeader } from "@/components/page-header";
import { getSelectedOrganisationId } from "@/lib/context";
import { listOrganisations } from "@/services/organisation-service";

export default async function NewBranchPage() {
  const organisations = await listOrganisations();
  const selected = await getSelectedOrganisationId();
  return (
    <div>
      <PageHeader title="New branch" />
      <BranchForm organisations={organisations} defaultOrganisationId={selected} />
    </div>
  );
}
