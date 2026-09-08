"use server";

import { revalidatePath } from "next/cache";
import { errorMessage } from "@/lib/errors";
import type { ActionResult } from "@/types";

export async function runAction<T>(
  fn: () => Promise<T>,
  paths: string[] = ["/"],
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    for (const path of paths) {
      revalidatePath(path);
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
