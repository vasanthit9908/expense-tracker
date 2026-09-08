import { cookies } from "next/headers";
import { periodFromPreset, type DateRange } from "@/lib/dates";
import { listOrganisations } from "@/services/organisation-service";

export const ORG_COOKIE = "org_id";

export async function getSelectedOrganisationId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(ORG_COOKIE)?.value;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const orgs = await listOrganisations();
  return orgs[0]?.id ?? null;
}

export async function setSelectedOrganisationId(id: number): Promise<void> {
  const store = await cookies();
  store.set(ORG_COOKIE, String(id), { path: "/", httpOnly: false });
}

export function periodFromSearchParams(params: {
  start?: string;
  end?: string;
  preset?: string;
}): DateRange {
  if (params.start && params.end) {
    return { start: params.start, end: params.end };
  }
  const preset = params.preset ?? "current_month";
  if (
    preset === "previous_month" ||
    preset === "current_quarter" ||
    preset === "previous_quarter" ||
    preset === "current_year" ||
    preset === "previous_year" ||
    preset === "custom" ||
    preset === "current_month"
  ) {
    return periodFromPreset(preset);
  }
  return periodFromPreset("current_month");
}
