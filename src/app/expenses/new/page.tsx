import { ExpenseForm } from "@/components/forms/expense-form";
import { PageHeader } from "@/components/page-header";
import { getSelectedOrganisationId } from "@/lib/context";
import { listBranches } from "@/services/branch-service";
import { listOrganisations } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";

export default async function NewExpensePage() {
  const organisations = await listOrganisations();
  const selected = await getSelectedOrganisationId();
  const branches = await listBranches();
  const projects = await listProjects();
  const currency = organisations.find((org) => org.id === selected)?.currency ?? "USD";
  return (
    <div>
      <PageHeader title="New expense" />
      <ExpenseForm
        organisations={organisations}
        branches={branches}
        projects={projects}
        defaultOrganisationId={selected}
        currency={currency}
      />
    </div>
  );
}
