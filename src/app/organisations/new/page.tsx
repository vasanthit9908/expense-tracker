import { PageHeader } from "@/components/page-header";
import { OrganisationForm } from "@/components/forms/organisation-form";

export default function NewOrganisationPage() {
  return (
    <div>
      <PageHeader title="New organisation" description="Currency is mandatory and defaults to INR." />
      <OrganisationForm />
    </div>
  );
}
