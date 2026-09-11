"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { deleteProjectAction } from "@/app/actions/projects";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ProjectForm } from "@/components/forms/project-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BranchOption = { id: number; name: string; organisationId: number };

type ProjectData = {
  id: number;
  branchId: number;
  name: string;
  billable: boolean;
  startDate: string;
  endDate: string | null;
};

export function ProjectDetailsCard({
  project,
  branchName,
  activeCount,
  branches,
}: {
  project: ProjectData;
  branchName: string;
  activeCount: number;
  branches: BranchOption[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Project details</h2>
          <p className="text-sm text-muted-foreground">Branch: {branchName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={project.billable ? "default" : "secondary"}>
            {project.billable ? "Billable" : "Non-billable"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={editing ? "Close edit" : "Edit project"}
            onClick={() => setEditing((value) => !value)}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-5 space-y-4">
          <ProjectForm
            branches={branches}
            project={project}
            redirectTo={`/projects/${project.id}`}
            onCancel={() => setEditing(false)}
          />
          <ConfirmDelete
            title="Delete project?"
            description="This fails if allocations, expenses or invoices still reference the project."
            redirectTo="/projects"
            action={deleteProjectAction}
            id={project.id}
          />
        </div>
      ) : (
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Start date</dt>
            <dd className="mt-0.5 font-medium">{project.startDate}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">End date</dt>
            <dd className="mt-0.5 font-medium">{project.endDate ?? "Open"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Active team</dt>
            <dd className="mt-0.5 font-medium">
              {activeCount} {activeCount === 1 ? "member" : "members"}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
