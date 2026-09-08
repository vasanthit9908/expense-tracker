"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { NativeSelect } from "@/components/native-select";
import { Input } from "@/components/ui/input";
import { INVOICE_STATUSES } from "@/types";

export function InvoiceFilters(props: {
  branches: { id: number; name: string }[];
  projects: { id: number; name: string }[];
}) {
  return (
    <Suspense fallback={<div className="mb-4 h-8 rounded-lg bg-muted" />}>
      <InvoiceFiltersInner {...props} />
    </Suspense>
  );
}

function InvoiceFiltersInner({
  branches,
  projects,
}: {
  branches: { id: number; name: string }[];
  projects: { id: number; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <NativeSelect value={searchParams.get("branchId") ?? ""} onChange={(event) => setParam("branchId", event.target.value)}>
        <option value="">All branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect value={searchParams.get("projectId") ?? ""} onChange={(event) => setParam("projectId", event.target.value)}>
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect value={searchParams.get("status") ?? ""} onChange={(event) => setParam("status", event.target.value)}>
        <option value="">All statuses</option>
        {INVOICE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </NativeSelect>
      <Input
        type="date"
        value={searchParams.get("start") ?? ""}
        onChange={(event) => setParam("start", event.target.value)}
      />
      <Input
        type="date"
        value={searchParams.get("end") ?? ""}
        onChange={(event) => setParam("end", event.target.value)}
      />
    </div>
  );
}
