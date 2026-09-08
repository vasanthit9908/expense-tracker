import Link from "next/link";
import { SearchBox } from "@/components/search-box";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listOrganisations } from "@/services/organisation-service";
import { cn } from "@/lib/utils";

export default async function OrganisationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const organisations = (await listOrganisations()).filter((org) =>
    q ? org.name.toLowerCase().includes(q.toLowerCase()) : true,
  );
  return (
    <div>
      <PageHeader
        title="Organisations"
        description="Each organisation has one reporting currency. V1 does not convert currencies."
        actionHref="/organisations/new"
        actionLabel="New organisation"
      />
      <SearchBox placeholder="Search organisations" />
      {organisations.length === 0 ? (
        <EmptyState title="No organisations yet" hint="Create one to start tracking P&L." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {organisations.map((org) => (
              <TableRow key={org.id}>
                <TableCell>{org.name}</TableCell>
                <TableCell>{org.currency}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/organisations/${org.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
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
