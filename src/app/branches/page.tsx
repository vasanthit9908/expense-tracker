import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/page-header";
import { SearchBox } from "@/components/search-box";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectedOrganisationId } from "@/lib/context";
import { listBranches } from "@/services/branch-service";
import { listOrganisations } from "@/services/organisation-service";
import { cn } from "@/lib/utils";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const orgId = await getSelectedOrganisationId();
  const organisations = await listOrganisations();
  const orgMap = new Map(organisations.map((org) => [org.id, org.name]));
  const branches = (await listBranches(orgId ?? undefined)).filter((branch) =>
    q ? `${branch.name} ${branch.location}`.toLowerCase().includes(q.toLowerCase()) : true,
  );
  return (
    <div>
      <PageHeader
        title="Branches"
        description="A branch always belongs to an organisation."
        actionHref="/branches/new"
        actionLabel="New branch"
      />
      <SearchBox placeholder="Search branches" />
      {branches.length === 0 ? (
        <EmptyState title="No branches" hint="Create a branch under the selected organisation." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Organisation</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell>{branch.name}</TableCell>
                <TableCell>{branch.location}</TableCell>
                <TableCell>{orgMap.get(branch.organisationId)}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/branches/${branch.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
                    Edit
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
