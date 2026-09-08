import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { getSelectedOrganisationId } from "@/lib/context";
import { listOrganisations } from "@/services/organisation-service";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const organisations = await listOrganisations();
  const selectedOrgId = await getSelectedOrganisationId();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar organisations={organisations} selectedOrgId={selectedOrgId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
