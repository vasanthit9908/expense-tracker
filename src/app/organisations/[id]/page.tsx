import { notFound } from "next/navigation";
import { deleteOrganisationAction } from "@/app/actions/organisations";
import { ConfirmDelete } from "@/components/confirm-delete";
import { OrganisationForm } from "@/components/forms/organisation-form";
import { PageHeader } from "@/components/page-header";
import { getOrganisation } from "@/services/organisation-service";

export default async function EditOrganisationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const organisation = await getOrganisation(Number(id));
  if (!organisation) notFound();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${organisation.name}`} />
      <OrganisationForm organisation={organisation} />
      <ConfirmDelete
        title="Delete organisation?"
        description="This fails if branches, employees, expenses or invoices still exist."
        redirectTo="/organisations"
        action={deleteOrganisationAction}
        id={organisation.id}
      />
    </div>
  );
}
