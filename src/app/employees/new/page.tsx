import { EmployeeForm } from "@/components/forms/employee-form";
import { PageHeader } from "@/components/page-header";
import { getSelectedOrganisationId } from "@/lib/context";
import { listOrganisations } from "@/services/organisation-service";

export default async function NewEmployeePage() {
  const organisations = await listOrganisations();
  const selected = await getSelectedOrganisationId();
  return (
    <div>
      <PageHeader title="New employee" />
      <EmployeeForm organisations={organisations} defaultOrganisationId={selected} />
    </div>
  );
}
