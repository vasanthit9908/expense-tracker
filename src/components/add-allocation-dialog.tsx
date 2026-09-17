"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createAllocationAction } from "@/app/actions/employees";
import { NativeSelect } from "@/components/native-select";
import { Field, FormGrid } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Option = { id: number; name: string };

type Props =
  | { projectId: number; employees: Option[] }
  | { employeeId: number; projects: Option[] };

export function AddAllocationDialog(props: Props) {
  const forProject = "projectId" in props;
  const options = forProject ? props.employees : props.projects;
  const optionLabel = forProject ? "Employee" : "Project";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? 0);
  const [allocationPercentage, setAllocationPercentage] = useState("50");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  function reset() {
    setSelectedId(options[0]?.id ?? 0);
    setAllocationPercentage("50");
    setEffectiveFrom("");
    setEffectiveTo("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await createAllocationAction({
      employeeId: forProject ? selectedId : props.employeeId,
      projectId: forProject ? props.projectId : selectedId,
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
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add allocation
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add allocation</DialogTitle>
            <DialogDescription>
              {forProject ? "Assign an employee to this project." : "Assign this employee to a project."} New
              assignments create a new history row.
            </DialogDescription>
          </DialogHeader>
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {forProject ? "employees" : "projects"} in this organisation yet. Add one first.
            </p>
          ) : (
            <FormGrid>
              <Field label={optionLabel} className="sm:col-span-2">
                <NativeSelect
                  value={selectedId}
                  onChange={(event) => setSelectedId(Number(event.target.value))}
                  required
                >
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Allocation %" className="sm:col-span-2">
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
                <Input
                  type="date"
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                  required
                />
              </Field>
              <Field label="Effective to (optional)">
                <Input
                  type="date"
                  value={effectiveTo}
                  min={effectiveFrom || undefined}
                  onChange={(event) => setEffectiveTo(event.target.value)}
                />
              </Field>
            </FormGrid>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending || options.length === 0}>
              {pending ? "Saving..." : "Add allocation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
