"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";

export function SearchBox({ placeholder }: { placeholder: string }) {
  return (
    <Suspense fallback={<div className="mb-4 h-8 max-w-sm rounded-lg bg-muted" />}>
      <SearchBoxInner placeholder={placeholder} />
    </Suspense>
  );
}

function SearchBoxInner({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Input
      defaultValue={searchParams.get("q") ?? ""}
      placeholder={placeholder}
      className="mb-4 max-w-sm"
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        const value = event.target.value;
        if (value) params.set("q", value);
        else params.delete("q");
        router.replace(`${pathname}?${params.toString()}`);
      }}
    />
  );
}
