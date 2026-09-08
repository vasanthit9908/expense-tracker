"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBranchAction, updateBranchAction } from "@/app/actions/branches";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function BranchForm({
  organisations,
  defaultOrganisationId,
  branch,
}: {
  organisations: { id: number; name: string }[];
  defaultOrganisationId: number | null;
  branch?: { id: number; organisationId: number; name: string; location: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [organisationId, setOrganisationId] = useState(branch?.organisationId ?? defaultOrganisationId ?? organisations[0]?.id ?? 0);
  const [name, setName] = useState(branch?.name ?? "");
  const [location, setLocation] = useState(branch?.location ?? "");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const payload = { organisationId, name, location };
    const result = branch ? await updateBranchAction(branch.id, payload) : await createBranchAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(branch ? "Branch updated" : "Branch created");
    router.push("/branches");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <FormGrid>
        <Field label="Organisation">
          <NativeSelect
            value={organisationId}
            onChange={(event) => setOrganisationId(Number(event.target.value))}
            required
          >
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Location" className="sm:col-span-2">
          <Input value={location} onChange={(event) => setLocation(event.target.value)} required />
        </Field>
      </FormGrid>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
