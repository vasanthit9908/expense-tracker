"use server";

import { runAction } from "@/app/actions/helpers";
import { setSelectedOrganisationId } from "@/lib/context";
import {
  createOrganisation,
  deleteOrganisation,
  updateOrganisation,
} from "@/services/organisation-service";

export async function selectOrganisationAction(id: number) {
  return runAction(async () => {
    await setSelectedOrganisationId(id);
    return id;
  }, ["/", "/organisations", "/branches", "/projects", "/employees", "/expenses", "/invoices", "/reports"]);
}

export async function createOrganisationAction(input: { name: string; currency: string }) {
  return runAction(() => createOrganisation(input), ["/", "/organisations"]);
}

export async function updateOrganisationAction(
  id: number,
  input: { name: string; currency: string },
) {
  return runAction(() => updateOrganisation(id, input), ["/", "/organisations"]);
}

export async function deleteOrganisationAction(id: number) {
  return runAction(() => deleteOrganisation(id), ["/", "/organisations"]);
}
