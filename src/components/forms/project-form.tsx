"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProjectAction, updateProjectAction } from "@/app/actions/projects";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectForm({
  branches,
  project,
  redirectTo = "/projects",
  onCancel,
}: {
  branches: { id: number; name: string; organisationId: number }[];
  project?: {
    id: number;
    branchId: number;
    name: string;
    billable: boolean;
    startDate: string;
    endDate: string | null;
  };
  redirectTo?: string;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [branchId, setBranchId] = useState(project?.branchId ?? branches[0]?.id ?? 0);
  const [name, setName] = useState(project?.name ?? "");
  const [billable, setBillable] = useState(project?.billable ?? true);
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [endDate, setEndDate] = useState(project?.endDate ?? "");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const payload = {
      branchId,
      name,
      billable,
      startDate,
      endDate: endDate || null,
    };
    const result = project ? await updateProjectAction(project.id, payload) : await createProjectAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(project ? "Project updated" : "Project created");
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <FormGrid>
        <Field label="Branch">
          <NativeSelect value={branchId} onChange={(event) => setBranchId(Number(event.target.value))} required>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Name">
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Billable">
          <NativeSelect
            value={billable ? "true" : "false"}
            onChange={(event) => setBillable(event.target.value === "true")}
          >
            <option value="true">Billable</option>
            <option value="false">Non-billable</option>
          </NativeSelect>
        </Field>
        <Field label="Start date">
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
        </Field>
        <Field label="End date (optional)">
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
      </FormGrid>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
