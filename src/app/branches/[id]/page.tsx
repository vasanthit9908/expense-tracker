import { notFound } from "next/navigation";
import { deleteBranchAction } from "@/app/actions/branches";
import { ConfirmDelete } from "@/components/confirm-delete";
import { BranchForm } from "@/components/forms/branch-form";
import { PageHeader } from "@/components/page-header";
import { getBranch } from "@/services/branch-service";
import { listOrganisations } from "@/services/organisation-service";

export default async function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const branch = await getBranch(Number(id));
  if (!branch) notFound();
  const organisations = await listOrganisations();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${branch.name}`} />
      <BranchForm organisations={organisations} defaultOrganisationId={branch.organisationId} branch={branch} />
      <ConfirmDelete
        title="Delete branch?"
        description="This fails if the branch still has projects or invoices."
        redirectTo="/branches"
        action={deleteBranchAction}
        id={branch.id}
      />
    </div>
  );
}
