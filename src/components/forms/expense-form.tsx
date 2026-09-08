"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import { createExpenseAction, updateExpenseAction } from "@/app/actions/expenses";
import { Field, FormGrid } from "@/components/page-header";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/currency";
import { allocateByPercentages, toMinorUnits } from "@/lib/money";

type AllocationRow = { projectId: number; allocationPercentage: string };

export function ExpenseForm({
  organisations,
  branches,
  projects,
  defaultOrganisationId,
  currency,
  expense,
}: {
  organisations: { id: number; name: string; currency: string }[];
  branches: { id: number; name: string; organisationId: number }[];
  projects: { id: number; name: string; organisationId: number }[];
  defaultOrganisationId: number | null;
  currency: string;
  expense?: {
    id: number;
    organisationId: number;
    branchId: number | null;
    name: string;
    amountMajor: string;
    expenseDate: string;
    scope: "organisation" | "branch" | "projects";
    allocations: { projectId: number; allocationPercentage: number }[];
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [organisationId, setOrganisationId] = useState(
    expense?.organisationId ?? defaultOrganisationId ?? organisations[0]?.id ?? 0,
  );
  const [scope, setScope] = useState<"organisation" | "branch" | "projects">(
    expense?.scope ?? "organisation",
  );
  const [branchId, setBranchId] = useState(expense?.branchId ?? branches[0]?.id ?? 0);
  const [name, setName] = useState(expense?.name ?? "");
  const [amountMajor, setAmountMajor] = useState(expense?.amountMajor ?? "");
  const [expenseDate, setExpenseDate] = useState(expense?.expenseDate ?? "");
  const [allocations, setAllocations] = useState<AllocationRow[]>(
    expense?.allocations.map((item) => ({
      projectId: item.projectId,
      allocationPercentage: String(item.allocationPercentage),
    })) ?? [{ projectId: projects[0]?.id ?? 0, allocationPercentage: "100" }],
  );

  const orgBranches = branches.filter((branch) => branch.organisationId === organisationId);
  const orgProjects = projects.filter((project) => project.organisationId === organisationId);
  const selectedCurrency = organisations.find((org) => org.id === organisationId)?.currency ?? currency;

  const percentSum = allocations.reduce(
    (sum, row) => sum.plus(row.allocationPercentage || 0),
    new Decimal(0),
  );
  const remaining = new Decimal(100).minus(percentSum);
  const previewAmounts = useMemo(() => {
    try {
      const amount = toMinorUnits(amountMajor || "0");
      const percents = allocations.map((row) => new Decimal(row.allocationPercentage || 0));
      return allocateByPercentages(amount, percents);
    } catch {
      return allocations.map(() => 0n);
    }
  }, [amountMajor, allocations]);

  function addRow() {
    setAllocations((rows) => [
      ...rows,
      { projectId: orgProjects[0]?.id ?? 0, allocationPercentage: remaining.gt(0) ? remaining.toString() : "0" },
    ]);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (scope === "projects" && !percentSum.eq(100)) {
      toast.error("Project allocations must equal 100%");
      return;
    }
    setPending(true);
    const payload = {
      organisationId,
      branchId: scope === "branch" ? branchId : null,
      name,
      amountMajor,
      expenseDate,
      scope,
      allocations:
        scope === "projects"
          ? allocations.map((row) => ({
              projectId: row.projectId,
              allocationPercentage: Number(row.allocationPercentage),
            }))
          : [],
    };
    const result = expense
      ? await updateExpenseAction(expense.id, payload)
      : await createExpenseAction(payload);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(expense ? "Expense updated" : "Expense created");
    router.push("/expenses");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-4">
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
        <Field label="Scope">
          <NativeSelect
            value={scope}
            onChange={(event) => setScope(event.target.value as typeof scope)}
          >
            <option value="organisation">Organisation</option>
            <option value="branch">Branch</option>
            <option value="projects">Projects</option>
          </NativeSelect>
        </Field>
        {scope === "branch" ? (
          <Field label="Branch">
            <NativeSelect value={branchId} onChange={(event) => setBranchId(Number(event.target.value))} required>
              {orgBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        ) : null}
        <Field label="Expense name" className={scope === "branch" ? "" : "sm:col-span-2"}>
          <Input value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Amount">
          <Input value={amountMajor} onChange={(event) => setAmountMajor(event.target.value)} required />
        </Field>
        <Field label="Date">
          <Input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required />
        </Field>
      </FormGrid>

      {scope === "projects" ? (
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Project allocations</h3>
            <Button type="button" variant="outline" onClick={addRow}>
              Add project
            </Button>
          </div>
          {allocations.map((row, index) => (
            <div key={`${row.projectId}-${index}`} className="grid gap-2 sm:grid-cols-3">
              <NativeSelect
                value={row.projectId}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setAllocations((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, projectId: value } : item,
                    ),
                  );
                }}
              >
                {orgProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </NativeSelect>
              <Input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={row.allocationPercentage}
                onChange={(event) => {
                  const value = event.target.value;
                  setAllocations((rows) =>
                    rows.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, allocationPercentage: value } : item,
                    ),
                  );
                }}
              />
              <div className="flex items-center justify-between gap-2 text-sm">
                <span>{formatMoney(previewAmounts[index] ?? 0n, selectedCurrency)}</span>
                {allocations.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAllocations((rows) => rows.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Allocated = {percentSum.toString()}%</span>
            <span>Remaining = {remaining.toString()}%</span>
            <span className={percentSum.eq(100) ? "text-emerald-700" : "text-destructive"}>
              {percentSum.eq(100) ? "Ready to save" : "Must equal 100%"}
            </span>
          </div>
        </div>
      ) : null}

      <Button type="submit" disabled={pending || (scope === "projects" && !percentSum.eq(100))}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
