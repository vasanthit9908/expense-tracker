"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createOrganisationAction, updateOrganisationAction } from "@/app/actions/organisations";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";

export function OrganisationForm({
  organisation,
}: {
  organisation?: { id: number; name: string; currency: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(organisation?.name ?? "");
  const [currency, setCurrency] = useState(organisation?.currency ?? "INR");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = organisation
      ? await updateOrganisationAction(organisation.id, { name, currency })
      : await createOrganisationAction({ name, currency });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(organisation ? "Organisation updated" : "Organisation created");
    router.push("/organisations");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <FormGrid>
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Currency">
          <NativeSelect value={currency} onChange={(event) => setCurrency(event.target.value)} required>
            {SUPPORTED_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </FormGrid>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
