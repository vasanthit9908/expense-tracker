"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createEmployeeAction, updateEmployeeAction } from "@/app/actions/employees";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fromMinorUnits } from "@/lib/money";

export function EmployeeForm({
  organisations,
  defaultOrganisationId,
  employee,
}: {
  organisations: { id: number; name: string }[];
  defaultOrganisationId: number | null;
  employee?: { id: number; organisationId: number; name: string; ctc: number };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [organisationId, setOrganisationId] = useState(
    employee?.organisationId ?? defaultOrganisationId ?? organisations[0]?.id ?? 0,
  );
  const [name, setName] = useState(employee?.name ?? "");
  const [ctcMajor, setCtcMajor] = useState(
    employee ? fromMinorUnits(BigInt(employee.ctc)).toString() : "",
  );

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const payload = { organisationId, name, ctcMajor };
    const result = employee
      ? await updateEmployeeAction(employee.id, payload)
      : await createEmployeeAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(employee ? "Employee updated" : "Employee created");
    router.push(employee ? `/employees/${employee.id}` : "/employees");
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
        <Field label="Annual CTC" className="sm:col-span-2">
          <Input
            value={ctcMajor}
            onChange={(event) => setCtcMajor(event.target.value)}
            inputMode="decimal"
            required
          />
        </Field>
      </FormGrid>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
