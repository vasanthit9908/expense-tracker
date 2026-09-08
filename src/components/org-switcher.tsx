"use client";

import { useRouter } from "next/navigation";
import { selectOrganisationAction } from "@/app/actions/organisations";
import { NativeSelect } from "@/components/native-select";

export function OrgSwitcher({
  organisations,
  selectedId,
}: {
  organisations: { id: number; name: string; currency: string }[];
  selectedId: number | null;
}) {
  const router = useRouter();
  if (organisations.length === 0) {
    return <p className="px-3 text-xs text-muted-foreground">No organisations yet</p>;
  }
  return (
    <NativeSelect
      value={selectedId ?? ""}
      onChange={async (event) => {
        const id = Number(event.target.value);
        await selectOrganisationAction(id);
        router.refresh();
      }}
      className="bg-background"
    >
      {organisations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name} ({org.currency})
        </option>
      ))}
    </NativeSelect>
  );
}
