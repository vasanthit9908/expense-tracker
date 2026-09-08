"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PERIOD_PRESETS, periodFromPreset, type PeriodPreset } from "@/lib/dates";
import { NativeSelect } from "@/components/native-select";
import { Input } from "@/components/ui/input";

export function PeriodPicker({ start, end }: { start: string; end: string }) {
  return (
    <Suspense fallback={<div className="h-10 rounded-lg bg-muted" />}>
      <PeriodPickerInner start={start} end={end} />
    </Suspense>
  );
}

function PeriodPickerInner({ start, end }: { start: string; end: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preset = (searchParams.get("preset") ?? "current_month") as PeriodPreset;

  function update(next: { start?: string; end?: string; preset?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextPreset = (next.preset ?? preset) as PeriodPreset;
    if (next.preset) {
      params.set("preset", next.preset);
      if (next.preset !== "custom") {
        const range = periodFromPreset(next.preset as PeriodPreset);
        params.set("start", range.start);
        params.set("end", range.end);
      }
    }
    if (next.start) params.set("start", next.start);
    if (next.end) params.set("end", next.end);
    if (next.start || next.end) {
      params.set("preset", nextPreset === "custom" || next.start || next.end ? params.get("preset") ?? "custom" : nextPreset);
      if (next.start || next.end) params.set("preset", "custom");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-sm font-medium">
        Period
        <NativeSelect value={preset} onChange={(event) => update({ preset: event.target.value })}>
          {PERIOD_PRESETS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-sm font-medium">
        Start
        <Input type="date" value={start} onChange={(event) => update({ start: event.target.value })} />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        End
        <Input type="date" value={end} onChange={(event) => update({ end: event.target.value })} />
      </label>
    </div>
  );
}
