import { notFound } from "next/navigation";
import { deleteInvoiceAction } from "@/app/actions/invoices";
import { ConfirmDelete } from "@/components/confirm-delete";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { PageHeader } from "@/components/page-header";
import { listBranches } from "@/services/branch-service";
import { getInvoice } from "@/services/invoice-service";
import { listOrganisations } from "@/services/organisation-service";
import { listProjects } from "@/services/project-service";
import type { InvoiceStatus } from "@/types";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(Number(id));
  if (!invoice) notFound();
  const organisations = await listOrganisations();
  const branches = await listBranches();
  const projects = await listProjects();
  return (
    <div className="space-y-6">
      <PageHeader title={`Edit ${invoice.invoiceNumber}`} />
      <InvoiceForm
        organisations={organisations}
        branches={branches}
        projects={projects}
        defaultOrganisationId={invoice.organisationId}
        invoice={{ ...invoice, status: invoice.status as InvoiceStatus }}
      />
      <ConfirmDelete
        title="Delete invoice?"
        description="This removes the invoice from future P&L reports."
        redirectTo="/invoices"
        action={deleteInvoiceAction}
        id={invoice.id}
      />
    </div>
  );
}
