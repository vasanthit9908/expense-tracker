"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { deleteEmployeeAction } from "@/app/actions/employees";
import { ConfirmDelete } from "@/components/confirm-delete";
import { EmployeeForm } from "@/components/forms/employee-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export function EditEmployeeDialog({
  employee,
  organisations,
}: {
  employee: { id: number; organisationId: number; name: string; ctc: number };
  organisations: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Pencil className="size-4" />
        Edit
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit employee</DialogTitle>
          <DialogDescription>Update the employee&apos;s organisation, name or annual CTC.</DialogDescription>
        </DialogHeader>
        {/* key remounts the form so reopening discards unsaved edits */}
        <EmployeeForm
          key={String(open)}
          organisations={organisations}
          defaultOrganisationId={employee.organisationId}
          employee={employee}
          onSaved={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">Delete employee</p>
            <p className="text-muted-foreground">Remove all allocation rows first.</p>
          </div>
          <ConfirmDelete
            title="Delete employee?"
            description="This fails if allocation rows still exist."
            redirectTo="/employees"
            action={deleteEmployeeAction}
            id={employee.id}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
