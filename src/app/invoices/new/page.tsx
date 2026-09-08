import { InvoiceForm } from "@/components/forms/invoice-form";
import { PageHeader } from "@/components/page-header";
import { getSelectedOrganisationId } from "@/lib/context";
import { listBranches } from "@/services/branch-service";
import { listOrganisations } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";

export default async function NewInvoicePage() {
  const organisations = await listOrganisations();
  const selected = await getSelectedOrganisationId();
  const branches = await listBranches();
  const projects = await listProjects();
  return (
    <div>
      <PageHeader title="New invoice" />
      <InvoiceForm
        organisations={organisations}
        branches={branches}
        projects={projects}
        defaultOrganisationId={selected}
      />
    </div>
  );
}
