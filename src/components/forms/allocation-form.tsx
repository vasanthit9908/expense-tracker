"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createAllocationAction } from "@/app/actions/employees";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AllocationForm({
  employeeId,
  projects,
}: {
  employeeId: number;
  projects: { id: number; name: string }[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0);
  const [allocationPercentage, setAllocationPercentage] = useState("50");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await createAllocationAction({
      employeeId,
      projectId,
      allocationPercentage: Number(allocationPercentage),
      effectiveFrom,
      effectiveTo: effectiveTo || null,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Allocation added");
    setAllocationPercentage("50");
    setEffectiveTo("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border p-4">
      <h3 className="font-medium">Assign to project</h3>
      <p className="text-sm text-muted-foreground">
        New assignments create a new history row. They do not overwrite previous effective dates.
      </p>
      <FormGrid>
        <Field label="Project">
          <NativeSelect value={projectId} onChange={(event) => setProjectId(Number(event.target.value))} required>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Allocation %">
          <Input
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            value={allocationPercentage}
            onChange={(event) => setAllocationPercentage(event.target.value)}
            required
          />
        </Field>
        <Field label="Effective from">
          <Input type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} required />
        </Field>
        <Field label="Effective to (optional)">
          <Input type="date" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} />
        </Field>
      </FormGrid>
      <Button type="submit" disabled={pending || projects.length === 0}>
        {pending ? "Saving..." : "Add allocation"}
      </Button>
    </form>
  );
}
