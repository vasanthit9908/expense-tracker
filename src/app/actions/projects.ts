"use server";

import { runAction } from "@/app/actions/helpers";
import { createProject, deleteProject, updateProject } from "@/services/project-service";

export async function createProjectAction(input: {
  branchId: number;
  name: string;
  billable: boolean;
  startDate: string;
  endDate?: string | null;
}) {
  return runAction(() => createProject(input), ["/projects", "/reports"]);
}

export async function updateProjectAction(
  id: number,
  input: {
    branchId: number;
    name: string;
    billable: boolean;
    startDate: string;
    endDate?: string | null;
  },
) {
  return runAction(() => updateProject(id, input), ["/projects", "/reports"]);
}

export async function deleteProjectAction(id: number) {
  return runAction(() => deleteProject(id), ["/projects", "/reports"]);
}
