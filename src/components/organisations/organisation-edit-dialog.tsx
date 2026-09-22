"use client";

import { useState } from "react";
import { OrganisationForm } from "@/components/forms/organisation-form";
import { Button } from "@/components/ui/button";

type Organisation = {
  id: number;
  name: string;
  currency: string;
};

export function OrganisationEditDialog({ organisation }: { organisation: Organisation }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Edit
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-background p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit organisation</h2>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                ×
              </Button>
            </div>

            <OrganisationForm organisation={organisation} />
          </div>
        </div>
      )}
    </>
  );
}