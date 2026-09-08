"use server";

import { runAction } from "@/app/actions/helpers";
import { createBranch, deleteBranch, updateBranch } from "@/services/branch-service";

export async function createBranchAction(input: {
  organisationId: number;
  name: string;
  location: string;
}) {
  return runAction(() => createBranch(input), ["/branches", "/reports"]);
}

export async function updateBranchAction(
  id: number,
  input: { organisationId: number; name: string; location: string },
) {
  return runAction(() => updateBranch(id, input), ["/branches", "/reports"]);
}

export async function deleteBranchAction(id: number) {
  return runAction(() => deleteBranch(id), ["/branches", "/reports"]);
}
